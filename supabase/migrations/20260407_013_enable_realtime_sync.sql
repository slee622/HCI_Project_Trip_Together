begin;

-- Allow invite recipients (before joining the group) to read their own invite rows.
drop policy if exists group_invites_select_invited_email on public.group_invites;
create policy group_invites_select_invited_email
on public.group_invites
for select
to authenticated
using (
  invited_email is not null
  and lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- Ensure realtime publication includes collaboration tables.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'trip_user_preferences'
    ) then
      execute 'alter publication supabase_realtime add table public.trip_user_preferences';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'trip_compare_destinations'
    ) then
      execute 'alter publication supabase_realtime add table public.trip_compare_destinations';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'trip_destination_votes'
    ) then
      execute 'alter publication supabase_realtime add table public.trip_destination_votes';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'group_invites'
    ) then
      execute 'alter publication supabase_realtime add table public.group_invites';
    end if;
  end if;
end;
$$;

commit;
