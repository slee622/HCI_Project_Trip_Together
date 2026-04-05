begin;

create or replace function public.list_my_trip_sessions(p_limit integer default 10)
returns table (
  id uuid,
  group_id uuid,
  group_name text,
  title text,
  origin text,
  departure_date date,
  return_date date,
  travelers integer,
  status text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clamped_limit integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  clamped_limit := greatest(1, least(coalesce(p_limit, 10), 25));

  return query
  select
    ts.id,
    ts.group_id,
    tg.name as group_name,
    ts.title,
    ts.origin,
    ts.departure_date,
    ts.return_date,
    ts.travelers,
    ts.status::text,
    ts.updated_at
  from public.trip_sessions ts
  join public.group_members gm
    on gm.group_id = ts.group_id
   and gm.user_id = auth.uid()
  join public.trip_groups tg
    on tg.id = ts.group_id
  order by ts.updated_at desc
  limit clamped_limit;
end;
$$;

grant execute on function public.list_my_trip_sessions(integer) to authenticated;

commit;
