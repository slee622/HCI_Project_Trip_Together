begin;

alter table public.trip_sessions
  drop constraint if exists trip_sessions_origin_check;

alter table public.trip_sessions
  add constraint trip_sessions_origin_check
  check (char_length(trim(origin)) between 2 and 64);

commit;
