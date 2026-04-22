begin;

create table if not exists public.trip_custom_compare_markers (
  trip_session_id uuid not null references public.trip_sessions (id) on delete cascade,
  marker_id text not null check (char_length(marker_id) between 1 and 120),
  added_by uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (trip_session_id, marker_id),
  constraint trip_custom_compare_markers_marker_fk
    foreign key (trip_session_id, marker_id)
    references public.trip_map_markers (trip_session_id, marker_id)
    on delete cascade
);

create index if not exists idx_trip_custom_compare_markers_trip_updated
  on public.trip_custom_compare_markers (trip_session_id, updated_at desc);

drop trigger if exists set_trip_custom_compare_markers_updated_at on public.trip_custom_compare_markers;
create trigger set_trip_custom_compare_markers_updated_at
before update on public.trip_custom_compare_markers
for each row execute function public.set_updated_at();

alter table public.trip_custom_compare_markers enable row level security;

drop policy if exists trip_custom_compare_markers_select_trip_members on public.trip_custom_compare_markers;
create policy trip_custom_compare_markers_select_trip_members
on public.trip_custom_compare_markers
for select
to authenticated
using (public.is_trip_member(trip_session_id));

drop policy if exists trip_custom_compare_markers_insert_trip_members on public.trip_custom_compare_markers;
create policy trip_custom_compare_markers_insert_trip_members
on public.trip_custom_compare_markers
for insert
to authenticated
with check (public.is_trip_member(trip_session_id) and added_by = auth.uid());

drop policy if exists trip_custom_compare_markers_update_trip_members on public.trip_custom_compare_markers;
create policy trip_custom_compare_markers_update_trip_members
on public.trip_custom_compare_markers
for update
to authenticated
using (public.is_trip_member(trip_session_id))
with check (public.is_trip_member(trip_session_id));

drop policy if exists trip_custom_compare_markers_delete_trip_members on public.trip_custom_compare_markers;
create policy trip_custom_compare_markers_delete_trip_members
on public.trip_custom_compare_markers
for delete
to authenticated
using (public.is_trip_member(trip_session_id));

create or replace function public.upsert_trip_custom_compare_marker(
  p_trip_session_id uuid,
  p_marker_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marker_id text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_trip_session_id is null then
    raise exception 'trip_session_id is required';
  end if;

  if not public.is_trip_member(p_trip_session_id) then
    raise exception 'Not authorized to update custom compare markers for this trip session';
  end if;

  v_marker_id := trim(coalesce(p_marker_id, ''));
  if char_length(v_marker_id) = 0 then
    raise exception 'marker_id is required';
  end if;

  if not exists (
    select 1
    from public.trip_map_markers tmm
    where tmm.trip_session_id = p_trip_session_id
      and tmm.marker_id = v_marker_id
      and tmm.source_destination_id is null
  ) then
    raise exception 'Custom marker not found for this trip session';
  end if;

  insert into public.trip_custom_compare_markers (
    trip_session_id,
    marker_id,
    added_by,
    added_at
  )
  values (
    p_trip_session_id,
    v_marker_id,
    auth.uid(),
    timezone('utc', now())
  )
  on conflict (trip_session_id, marker_id)
  do update set
    added_by = excluded.added_by,
    added_at = excluded.added_at,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.remove_trip_custom_compare_marker(
  p_trip_session_id uuid,
  p_marker_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marker_id text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_trip_session_id is null then
    raise exception 'trip_session_id is required';
  end if;

  if not public.is_trip_member(p_trip_session_id) then
    raise exception 'Not authorized to update custom compare markers for this trip session';
  end if;

  v_marker_id := trim(coalesce(p_marker_id, ''));
  if char_length(v_marker_id) = 0 then
    raise exception 'marker_id is required';
  end if;

  delete from public.trip_custom_compare_markers
  where trip_session_id = p_trip_session_id
    and marker_id = v_marker_id;
end;
$$;

create or replace function public.list_trip_custom_compare_markers(
  p_trip_session_id uuid
)
returns table (
  marker_id text,
  added_by uuid,
  added_at timestamptz,
  marker jsonb
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
    raise exception 'Not authorized to read custom compare markers for this trip session';
  end if;

  return query
  select
    tccm.marker_id,
    tccm.added_by,
    tccm.added_at,
    jsonb_build_object(
      'id', tmm.marker_id,
      'city', tmm.city,
      'state', tmm.state,
      'latitude', tmm.latitude,
      'longitude', tmm.longitude
    ) as marker
  from public.trip_custom_compare_markers tccm
  join public.trip_map_markers tmm
    on tmm.trip_session_id = tccm.trip_session_id
   and tmm.marker_id = tccm.marker_id
  where tccm.trip_session_id = p_trip_session_id
  order by tccm.updated_at desc;
end;
$$;

grant execute on function public.upsert_trip_custom_compare_marker(uuid, text) to authenticated;
grant execute on function public.remove_trip_custom_compare_marker(uuid, text) to authenticated;
grant execute on function public.list_trip_custom_compare_markers(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'trip_custom_compare_markers'
    ) then
      execute 'alter publication supabase_realtime add table public.trip_custom_compare_markers';
    end if;
  end if;
end;
$$;

commit;
