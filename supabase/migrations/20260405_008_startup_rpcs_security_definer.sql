begin;

alter function public.get_trip_startup_state(uuid) security definer;
alter function public.get_my_startup_state(uuid) security definer;

commit;
