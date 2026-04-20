begin;

create table if not exists public.trip_map_markers (
  trip_session_id uuid not null references public.trip_sessions (id) on delete cascade,
  marker_id text not null check (char_length(marker_id) between 1 and 120),
  source_destination_id text references public.destinations (id) on delete set null,
  city text not null check (char_length(city) between 1 and 120),
  state text not null default '' check (char_length(state) <= 120),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  added_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (trip_session_id, marker_id)
);

create index if not exists idx_trip_map_markers_trip_updated
  on public.trip_map_markers (trip_session_id, updated_at desc);

drop trigger if exists set_trip_map_markers_updated_at on public.trip_map_markers;
create trigger set_trip_map_markers_updated_at
before update on public.trip_map_markers
for each row execute function public.set_updated_at();

alter table public.trip_map_markers enable row level security;

drop policy if exists trip_map_markers_select_trip_members on public.trip_map_markers;
create policy trip_map_markers_select_trip_members
on public.trip_map_markers
for select
to authenticated
using (public.is_trip_member(trip_session_id));

drop policy if exists trip_map_markers_insert_trip_members on public.trip_map_markers;
create policy trip_map_markers_insert_trip_members
on public.trip_map_markers
for insert
to authenticated
with check (public.is_trip_member(trip_session_id) and added_by = auth.uid());

drop policy if exists trip_map_markers_update_trip_members on public.trip_map_markers;
create policy trip_map_markers_update_trip_members
on public.trip_map_markers
for update
to authenticated
using (public.is_trip_member(trip_session_id))
with check (public.is_trip_member(trip_session_id));

drop policy if exists trip_map_markers_delete_trip_members on public.trip_map_markers;
create policy trip_map_markers_delete_trip_members
on public.trip_map_markers
for delete
to authenticated
using (public.is_trip_member(trip_session_id));

create or replace function public.upsert_trip_map_marker(
  p_trip_session_id uuid,
  p_marker_id text,
  p_latitude double precision,
  p_longitude double precision,
  p_city text default null,
  p_state text default null,
  p_source_destination_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marker_id text;
  v_city text;
  v_state text;
  v_source_destination_id text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_trip_session_id is null then
    raise exception 'trip_session_id is required';
  end if;

  if not public.is_trip_member(p_trip_session_id) then
    raise exception 'Not authorized to update map markers for this trip session';
  end if;

  v_marker_id := trim(coalesce(p_marker_id, ''));
  if char_length(v_marker_id) = 0 then
    raise exception 'marker_id is required';
  end if;

  if p_latitude is null or p_longitude is null then
    raise exception 'latitude and longitude are required';
  end if;

  if p_latitude < -90 or p_latitude > 90 then
    raise exception 'latitude must be between -90 and 90';
  end if;

  if p_longitude < -180 or p_longitude > 180 then
    raise exception 'longitude must be between -180 and 180';
  end if;

  v_city := left(coalesce(nullif(trim(p_city), ''), 'Custom location'), 120);
  v_state := left(coalesce(trim(p_state), ''), 120);
  v_source_destination_id := nullif(trim(p_source_destination_id), '');

  if v_source_destination_id is not null
     and not exists (select 1 from public.destinations d where d.id = v_source_destination_id) then
    raise exception 'source_destination_id is invalid';
  end if;

  insert into public.trip_map_markers (
    trip_session_id,
    marker_id,
    source_destination_id,
    city,
    state,
    latitude,
    longitude,
    added_by,
    created_at
  )
  values (
    p_trip_session_id,
    v_marker_id,
    v_source_destination_id,
    v_city,
    v_state,
    p_latitude,
    p_longitude,
    auth.uid(),
    timezone('utc', now())
  )
  on conflict (trip_session_id, marker_id)
  do update set
    source_destination_id = coalesce(excluded.source_destination_id, trip_map_markers.source_destination_id),
    city = excluded.city,
    state = excluded.state,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    added_by = auth.uid(),
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.remove_trip_map_marker(
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
    raise exception 'Not authorized to update map markers for this trip session';
  end if;

  v_marker_id := trim(coalesce(p_marker_id, ''));
  if char_length(v_marker_id) = 0 then
    raise exception 'marker_id is required';
  end if;

  delete from public.trip_map_markers
  where trip_session_id = p_trip_session_id
    and marker_id = v_marker_id;
end;
$$;

create or replace function public.list_trip_map_markers(
  p_trip_session_id uuid
)
returns table (
  marker_id text,
  source_destination_id text,
  city text,
  state text,
  latitude double precision,
  longitude double precision,
  added_by uuid,
  created_at timestamptz,
  updated_at timestamptz
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
    raise exception 'Not authorized to read map markers for this trip session';
  end if;

  return query
  select
    tmm.marker_id,
    tmm.source_destination_id,
    tmm.city,
    tmm.state,
    tmm.latitude,
    tmm.longitude,
    tmm.added_by,
    tmm.created_at,
    tmm.updated_at
  from public.trip_map_markers tmm
  where tmm.trip_session_id = p_trip_session_id
  order by tmm.updated_at desc;
end;
$$;

grant execute on function public.upsert_trip_map_marker(uuid, text, double precision, double precision, text, text, text) to authenticated;
grant execute on function public.remove_trip_map_marker(uuid, text) to authenticated;
grant execute on function public.list_trip_map_markers(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'trip_map_markers'
    ) then
      execute 'alter publication supabase_realtime add table public.trip_map_markers';
    end if;
  end if;
end;
$$;

commit;
