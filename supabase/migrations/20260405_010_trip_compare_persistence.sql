begin;

create table if not exists public.trip_compare_destinations (
  trip_session_id uuid not null references public.trip_sessions (id) on delete cascade,
  destination_id text not null references public.destinations (id) on delete restrict,
  added_by uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (trip_session_id, destination_id)
);

create index if not exists idx_trip_compare_destinations_trip
  on public.trip_compare_destinations (trip_session_id, updated_at desc);

drop trigger if exists set_trip_compare_destinations_updated_at on public.trip_compare_destinations;
create trigger set_trip_compare_destinations_updated_at
before update on public.trip_compare_destinations
for each row execute function public.set_updated_at();

alter table public.trip_compare_destinations enable row level security;

drop policy if exists trip_compare_destinations_select_trip_members on public.trip_compare_destinations;
create policy trip_compare_destinations_select_trip_members
on public.trip_compare_destinations
for select
to authenticated
using (public.is_trip_member(trip_session_id));

drop policy if exists trip_compare_destinations_insert_trip_members on public.trip_compare_destinations;
create policy trip_compare_destinations_insert_trip_members
on public.trip_compare_destinations
for insert
to authenticated
with check (public.is_trip_member(trip_session_id) and added_by = auth.uid());

drop policy if exists trip_compare_destinations_update_trip_members on public.trip_compare_destinations;
create policy trip_compare_destinations_update_trip_members
on public.trip_compare_destinations
for update
to authenticated
using (public.is_trip_member(trip_session_id))
with check (public.is_trip_member(trip_session_id));

drop policy if exists trip_compare_destinations_delete_trip_members on public.trip_compare_destinations;
create policy trip_compare_destinations_delete_trip_members
on public.trip_compare_destinations
for delete
to authenticated
using (public.is_trip_member(trip_session_id));

create or replace function public.upsert_trip_compare_destination(
  p_trip_session_id uuid,
  p_destination_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_trip_session_id is null then
    raise exception 'trip_session_id is required';
  end if;

  if p_destination_id is null or char_length(trim(p_destination_id)) = 0 then
    raise exception 'destination_id is required';
  end if;

  if not public.is_trip_member(p_trip_session_id) then
    raise exception 'Not authorized to update compare destinations for this trip session';
  end if;

  insert into public.trip_compare_destinations (
    trip_session_id,
    destination_id,
    added_by,
    added_at
  )
  values (
    p_trip_session_id,
    trim(p_destination_id),
    auth.uid(),
    timezone('utc', now())
  )
  on conflict (trip_session_id, destination_id)
  do update set
    added_by = excluded.added_by,
    added_at = excluded.added_at,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.remove_trip_compare_destination(
  p_trip_session_id uuid,
  p_destination_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_trip_session_id is null then
    raise exception 'trip_session_id is required';
  end if;

  if p_destination_id is null or char_length(trim(p_destination_id)) = 0 then
    raise exception 'destination_id is required';
  end if;

  if not public.is_trip_member(p_trip_session_id) then
    raise exception 'Not authorized to update compare destinations for this trip session';
  end if;

  delete from public.trip_compare_destinations
  where trip_session_id = p_trip_session_id
    and destination_id = trim(p_destination_id);
end;
$$;

create or replace function public.list_trip_compare_destinations(
  p_trip_session_id uuid
)
returns table (
  destination_id text,
  added_by uuid,
  added_at timestamptz,
  destination jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_trip_session_id is null then
    raise exception 'trip_session_id is required';
  end if;

  if not public.is_trip_member(p_trip_session_id) then
    raise exception 'Not authorized to read compare destinations for this trip session';
  end if;

  return query
  select
    tcd.destination_id,
    tcd.added_by,
    tcd.added_at,
    jsonb_build_object(
      'id', d.id,
      'city', d.city,
      'state', d.state,
      'shortDescription', d.short_description
    ) as destination
  from public.trip_compare_destinations tcd
  join public.destinations d on d.id = tcd.destination_id
  where tcd.trip_session_id = p_trip_session_id
  order by tcd.updated_at desc;
end;
$$;

grant execute on function public.upsert_trip_compare_destination(uuid, text) to authenticated;
grant execute on function public.remove_trip_compare_destination(uuid, text) to authenticated;
grant execute on function public.list_trip_compare_destinations(uuid) to authenticated;

commit;
