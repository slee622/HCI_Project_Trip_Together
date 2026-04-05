begin;

create or replace function public.create_trip_session(
  p_group_id uuid,
  p_title text,
  p_origin text,
  p_departure_date date,
  p_return_date date,
  p_travelers integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_trip_id uuid;
  normalized_origin text;
  normalized_title text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_group_id is null then
    raise exception 'group_id is required';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'Not authorized to create a trip for this group';
  end if;

  normalized_origin := trim(coalesce(p_origin, ''));
  if char_length(normalized_origin) < 2 then
    raise exception 'origin is required';
  end if;

  normalized_title := nullif(trim(coalesce(p_title, '')), '');
  if normalized_title is null then
    normalized_title := 'Trip session';
  end if;

  if p_departure_date is null or p_return_date is null then
    raise exception 'departure and return dates are required';
  end if;

  if p_return_date <= p_departure_date then
    raise exception 'return date must be after departure date';
  end if;

  if p_travelers is null or p_travelers < 1 then
    raise exception 'travelers must be at least 1';
  end if;

  insert into public.trip_sessions (
    group_id,
    title,
    origin,
    departure_date,
    return_date,
    travelers,
    status,
    created_by
  )
  values (
    p_group_id,
    normalized_title,
    normalized_origin,
    p_departure_date,
    p_return_date,
    p_travelers,
    'active',
    auth.uid()
  )
  returning id into new_trip_id;

  return new_trip_id;
end;
$$;

grant execute on function public.create_trip_session(uuid, text, text, date, date, integer) to authenticated;

commit;
