begin;

create or replace function public.get_trip_startup_state(p_trip_session_id uuid)
returns jsonb
language plpgsql
security invoker
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

create or replace function public.get_my_startup_state(p_group_id uuid default null)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  resolved_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select ts.id
  into resolved_trip_id
  from public.trip_sessions ts
  join public.group_members gm
    on gm.group_id = ts.group_id
   and gm.user_id = auth.uid()
  where ts.status = 'active'
    and (p_group_id is null or ts.group_id = p_group_id)
  order by ts.updated_at desc
  limit 1;

  if resolved_trip_id is null then
    return jsonb_build_object(
      'tripSession', null,
      'group', null,
      'groupMembers', '[]'::jsonb,
      'preferences', '[]'::jsonb,
      'recommendations', '[]'::jsonb,
      'votes', '[]'::jsonb,
      'selectedOption', null,
      'startupVersion', 1
    );
  end if;

  return public.get_trip_startup_state(resolved_trip_id);
end;
$$;

grant execute on function public.get_trip_startup_state(uuid) to authenticated;
grant execute on function public.get_my_startup_state(uuid) to authenticated;

commit;
