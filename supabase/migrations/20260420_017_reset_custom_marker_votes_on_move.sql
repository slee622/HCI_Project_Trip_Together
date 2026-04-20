begin;

create or replace function public.reset_trip_custom_marker_votes_on_move()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.source_destination_id is null
    and new.source_destination_id is null
    and (
      old.latitude is distinct from new.latitude
      or old.longitude is distinct from new.longitude
    ) then
    delete from public.trip_custom_marker_votes
    where trip_session_id = new.trip_session_id
      and marker_id = new.marker_id;
  end if;

  return new;
end;
$$;

drop trigger if exists reset_trip_custom_marker_votes_on_move on public.trip_map_markers;
create trigger reset_trip_custom_marker_votes_on_move
before update on public.trip_map_markers
for each row
execute function public.reset_trip_custom_marker_votes_on_move();

commit;
