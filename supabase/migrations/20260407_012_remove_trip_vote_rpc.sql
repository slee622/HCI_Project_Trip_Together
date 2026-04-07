begin;

create or replace function public.remove_trip_vote(
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
    raise exception 'Not authorized to remove vote for this trip session';
  end if;

  delete from public.trip_destination_votes
  where trip_session_id = p_trip_session_id
    and destination_id = trim(p_destination_id)
    and user_id = auth.uid();
end;
$$;

grant execute on function public.remove_trip_vote(uuid, text) to authenticated;

commit;
