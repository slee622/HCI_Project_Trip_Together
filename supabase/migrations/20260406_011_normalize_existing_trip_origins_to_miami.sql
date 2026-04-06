begin;

update public.trip_sessions
set
  origin = 'Miami, FL',
  updated_at = timezone('utc', now())
where origin is distinct from 'Miami, FL';

commit;
