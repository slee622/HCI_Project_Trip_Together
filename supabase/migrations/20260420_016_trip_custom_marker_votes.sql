begin;

create table if not exists public.trip_custom_marker_votes (
  trip_session_id uuid not null references public.trip_sessions (id) on delete cascade,
  marker_id text not null check (char_length(marker_id) between 1 and 120),
  user_id uuid not null references public.profiles (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (trip_session_id, marker_id, user_id),
  constraint trip_custom_marker_votes_marker_fk
    foreign key (trip_session_id, marker_id)
    references public.trip_map_markers (trip_session_id, marker_id)
    on delete cascade
);

create index if not exists idx_trip_custom_marker_votes_trip_marker
  on public.trip_custom_marker_votes (trip_session_id, marker_id);

drop trigger if exists set_trip_custom_marker_votes_updated_at on public.trip_custom_marker_votes;
create trigger set_trip_custom_marker_votes_updated_at
before update on public.trip_custom_marker_votes
for each row execute function public.set_updated_at();

alter table public.trip_custom_marker_votes enable row level security;

drop policy if exists trip_custom_marker_votes_select_trip_members on public.trip_custom_marker_votes;
create policy trip_custom_marker_votes_select_trip_members
on public.trip_custom_marker_votes
for select
to authenticated
using (public.is_trip_member(trip_session_id));

drop policy if exists trip_custom_marker_votes_insert_self on public.trip_custom_marker_votes;
create policy trip_custom_marker_votes_insert_self
on public.trip_custom_marker_votes
for insert
to authenticated
with check (public.is_trip_member(trip_session_id) and user_id = auth.uid());

drop policy if exists trip_custom_marker_votes_update_self on public.trip_custom_marker_votes;
create policy trip_custom_marker_votes_update_self
on public.trip_custom_marker_votes
for update
to authenticated
using (public.is_trip_member(trip_session_id) and user_id = auth.uid())
with check (public.is_trip_member(trip_session_id) and user_id = auth.uid());

drop policy if exists trip_custom_marker_votes_delete_self on public.trip_custom_marker_votes;
create policy trip_custom_marker_votes_delete_self
on public.trip_custom_marker_votes
for delete
to authenticated
using (public.is_trip_member(trip_session_id) and user_id = auth.uid());

create or replace function public.upsert_trip_vote(
  p_trip_session_id uuid,
  p_destination_id text,
  p_vote integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destination_id text;
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

  if p_vote not in (-1, 1) then
    raise exception 'vote must be -1 or 1';
  end if;

  if not public.is_trip_member(p_trip_session_id) then
    raise exception 'Not authorized to vote for this trip session';
  end if;

  v_destination_id := trim(p_destination_id);

  if exists (
    select 1
    from public.destinations d
    where d.id = v_destination_id
  ) then
    insert into public.trip_destination_votes (
      trip_session_id,
      destination_id,
      user_id,
      vote
    )
    values (
      p_trip_session_id,
      v_destination_id,
      auth.uid(),
      p_vote::smallint
    )
    on conflict (trip_session_id, destination_id, user_id)
    do update set
      vote = excluded.vote,
      updated_at = timezone('utc', now());
    return;
  end if;

  if exists (
    select 1
    from public.trip_map_markers tmm
    where tmm.trip_session_id = p_trip_session_id
      and tmm.marker_id = v_destination_id
      and tmm.source_destination_id is null
  ) then
    insert into public.trip_custom_marker_votes (
      trip_session_id,
      marker_id,
      user_id,
      vote
    )
    values (
      p_trip_session_id,
      v_destination_id,
      auth.uid(),
      p_vote::smallint
    )
    on conflict (trip_session_id, marker_id, user_id)
    do update set
      vote = excluded.vote,
      updated_at = timezone('utc', now());
    return;
  end if;

  raise exception 'destination_id is invalid for this trip session';
end;
$$;

create or replace function public.remove_trip_vote(
  p_trip_session_id uuid,
  p_destination_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destination_id text;
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
    raise exception 'Not authorized to remove vote for this trip session';
  end if;

  v_destination_id := trim(p_destination_id);

  delete from public.trip_destination_votes
  where trip_session_id = p_trip_session_id
    and destination_id = v_destination_id
    and user_id = auth.uid();

  delete from public.trip_custom_marker_votes
  where trip_session_id = p_trip_session_id
    and marker_id = v_destination_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.get_trip_startup_state(p_trip_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_trip_session_id is null then
    raise exception 'trip_session_id is required';
  end if;

  if not public.is_trip_member(p_trip_session_id) then
    raise exception 'Not authorized to read this trip session';
  end if;

  select jsonb_build_object(
    'tripSession', (
      select to_jsonb(ts_row)
      from (
        select
          ts.id,
          ts.group_id as "groupId",
          ts.title,
          ts.origin,
          ts.departure_date as "departureDate",
          ts.return_date as "returnDate",
          ts.travelers,
          ts.status,
          ts.created_by as "createdBy",
          ts.created_at as "createdAt",
          ts.updated_at as "updatedAt"
        from public.trip_sessions ts
        where ts.id = p_trip_session_id
        limit 1
      ) ts_row
    ),
    'group', (
      select to_jsonb(group_row)
      from (
        select
          tg.id,
          tg.name,
          tg.created_by as "createdBy",
          tg.created_at as "createdAt",
          tg.updated_at as "updatedAt"
        from public.trip_groups tg
        join public.trip_sessions ts on ts.group_id = tg.id
        where ts.id = p_trip_session_id
        limit 1
      ) group_row
    ),
    'groupMembers', (
      select coalesce(
        jsonb_agg(to_jsonb(member_row) order by member_row."joinedAt" asc),
        '[]'::jsonb
      )
      from (
        select
          gm.user_id as "userId",
          gm.role,
          gm.joined_at as "joinedAt",
          p.handle,
          p.display_name as "displayName",
          p.avatar_url as "avatarUrl"
        from public.group_members gm
        join public.trip_sessions ts on ts.group_id = gm.group_id
        join public.profiles p on p.id = gm.user_id
        where ts.id = p_trip_session_id
      ) member_row
    ),
    'preferences', (
      select coalesce(
        jsonb_agg(to_jsonb(pref_row) order by pref_row."updatedAt" desc),
        '[]'::jsonb
      )
      from (
        select
          tup.user_id as "userId",
          tup.adventure,
          tup.budget,
          tup.setting,
          tup.weather,
          tup.focus,
          tup.updated_at as "updatedAt"
        from public.trip_user_preferences tup
        where tup.trip_session_id = p_trip_session_id
      ) pref_row
    ),
    'recommendations', (
      select coalesce(
        jsonb_agg(to_jsonb(rec_row) order by rec_row.rank asc),
        '[]'::jsonb
      )
      from (
        select
          tr.destination_id as "destinationId",
          tr.rank,
          tr.score,
          tr.reason,
          tr.generated_at as "generatedAt",
          tr.updated_at as "updatedAt",
          jsonb_build_object(
            'id', d.id,
            'city', d.city,
            'state', d.state,
            'latitude', d.latitude,
            'longitude', d.longitude,
            'temperatureScore', d.temperature_score,
            'budgetScore', d.budget_score,
            'urbanScore', d.urban_score,
            'natureScore', d.nature_score,
            'foodScore', d.food_score,
            'nightlifeScore', d.nightlife_score,
            'relaxationScore', d.relaxation_score,
            'shortDescription', d.short_description,
            'imageUrl', d.image_url
          ) as destination
        from public.trip_recommendations tr
        join public.destinations d on d.id = tr.destination_id
        where tr.trip_session_id = p_trip_session_id
      ) rec_row
    ),
    'votes', (
      select coalesce(
        jsonb_agg(to_jsonb(vote_row) order by vote_row."updatedAt" desc),
        '[]'::jsonb
      )
      from (
        select
          tdv.destination_id as "destinationId",
          tdv.user_id as "userId",
          tdv.vote,
          tdv.updated_at as "updatedAt"
        from public.trip_destination_votes tdv
        where tdv.trip_session_id = p_trip_session_id

        union all

        select
          tcmv.marker_id as "destinationId",
          tcmv.user_id as "userId",
          tcmv.vote,
          tcmv.updated_at as "updatedAt"
        from public.trip_custom_marker_votes tcmv
        where tcmv.trip_session_id = p_trip_session_id
      ) vote_row
    ),
    'selectedOption', (
      select to_jsonb(selected_row)
      from (
        select
          tsd.destination_id as "destinationId",
          tsd.selected_by as "selectedBy",
          tsd.selected_at as "selectedAt",
          tsd.updated_at as "updatedAt"
        from public.trip_selected_destinations tsd
        where tsd.trip_session_id = p_trip_session_id
        limit 1
      ) selected_row
    ),
    'startupVersion', 1
  )
  into payload;

  if payload->'tripSession' is null or payload->'tripSession' = 'null'::jsonb then
    raise exception 'Trip session not found';
  end if;

  return payload;
end;
$$;

grant execute on function public.upsert_trip_vote(uuid, text, integer) to authenticated;
grant execute on function public.remove_trip_vote(uuid, text) to authenticated;
grant execute on function public.get_trip_startup_state(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'trip_custom_marker_votes'
    ) then
      execute 'alter publication supabase_realtime add table public.trip_custom_marker_votes';
    end if;
  end if;
end;
$$;

commit;
