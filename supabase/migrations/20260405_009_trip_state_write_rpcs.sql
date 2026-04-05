begin;

create or replace function public.upsert_trip_user_preferences(
  p_trip_session_id uuid,
  p_adventure integer,
  p_budget integer,
  p_setting integer,
  p_weather integer,
  p_focus integer
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

  if not public.is_trip_member(p_trip_session_id) then
    raise exception 'Not authorized to update preferences for this trip session';
  end if;

  if least(p_adventure, p_budget, p_setting, p_weather, p_focus) < 0
     or greatest(p_adventure, p_budget, p_setting, p_weather, p_focus) > 10 then
    raise exception 'Preference values must be between 0 and 10';
  end if;

  insert into public.trip_user_preferences (
    trip_session_id,
    user_id,
    adventure,
    budget,
    setting,
    weather,
    focus
  )
  values (
    p_trip_session_id,
    auth.uid(),
    p_adventure::smallint,
    p_budget::smallint,
    p_setting::smallint,
    p_weather::smallint,
    p_focus::smallint
  )
  on conflict (trip_session_id, user_id)
  do update set
    adventure = excluded.adventure,
    budget = excluded.budget,
    setting = excluded.setting,
    weather = excluded.weather,
    focus = excluded.focus,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.replace_trip_recommendations(
  p_trip_session_id uuid,
  p_recommendations jsonb
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

  if not public.is_trip_member(p_trip_session_id) then
    raise exception 'Not authorized to update recommendations for this trip session';
  end if;

  if p_recommendations is null then
    p_recommendations := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_recommendations) <> 'array' then
    raise exception 'recommendations payload must be a JSON array';
  end if;

  delete from public.trip_recommendations
  where trip_session_id = p_trip_session_id;

  insert into public.trip_recommendations (
    trip_session_id,
    destination_id,
    rank,
    score,
    reason,
    generated_at
  )
  with parsed as (
    select
      nullif(trim(entry.item ->> 'destinationId'), '') as destination_id,
      greatest(1, coalesce((entry.item ->> 'rank')::integer, entry.ordinality::integer)) as rank,
      least(100, greatest(0, coalesce((entry.item ->> 'score')::numeric, 0)))::numeric(5, 2) as score,
      coalesce(nullif(trim(entry.item ->> 'reason'), ''), 'Recommended destination') as reason,
      entry.ordinality
    from jsonb_array_elements(p_recommendations) with ordinality as entry(item, ordinality)
  ),
  deduped as (
    select distinct on (p.destination_id)
      p.destination_id,
      p.rank,
      p.score,
      p.reason
    from parsed p
    where p.destination_id is not null
    order by p.destination_id, p.ordinality
  )
  select
    p_trip_session_id,
    d.id,
    d2.rank,
    d2.score,
    left(d2.reason, 500),
    timezone('utc', now())
  from deduped d2
  join public.destinations d on d.id = d2.destination_id
  order by d2.rank
  limit 20;
end;
$$;

create or replace function public.set_trip_selected_destination(
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

  if not public.is_trip_member(p_trip_session_id) then
    raise exception 'Not authorized to update selected destination for this trip session';
  end if;

  if p_destination_id is null or char_length(trim(p_destination_id)) = 0 then
    delete from public.trip_selected_destinations
    where trip_session_id = p_trip_session_id;
    return;
  end if;

  insert into public.trip_selected_destinations (
    trip_session_id,
    destination_id,
    selected_by,
    selected_at
  )
  values (
    p_trip_session_id,
    trim(p_destination_id),
    auth.uid(),
    timezone('utc', now())
  )
  on conflict (trip_session_id)
  do update set
    destination_id = excluded.destination_id,
    selected_by = excluded.selected_by,
    selected_at = excluded.selected_at,
    updated_at = timezone('utc', now());
end;
$$;

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

  insert into public.trip_destination_votes (
    trip_session_id,
    destination_id,
    user_id,
    vote
  )
  values (
    p_trip_session_id,
    trim(p_destination_id),
    auth.uid(),
    p_vote::smallint
  )
  on conflict (trip_session_id, destination_id, user_id)
  do update set
    vote = excluded.vote,
    updated_at = timezone('utc', now());
end;
$$;

grant execute on function public.upsert_trip_user_preferences(uuid, integer, integer, integer, integer, integer) to authenticated;
grant execute on function public.replace_trip_recommendations(uuid, jsonb) to authenticated;
grant execute on function public.set_trip_selected_destination(uuid, text) to authenticated;
grant execute on function public.upsert_trip_vote(uuid, text, integer) to authenticated;

commit;
