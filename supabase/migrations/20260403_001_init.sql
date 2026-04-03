begin;

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  home_airport text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

create table if not exists public.trip_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trip_groups_set_updated_at
before update on public.trip_groups
for each row
execute function public.set_updated_at();

create table if not exists public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.trip_groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  join_status text not null check (join_status in ('invited', 'accepted')),
  invited_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint group_memberships_group_user_unique unique (group_id, user_id)
);

create trigger group_memberships_set_updated_at
before update on public.group_memberships
for each row
execute function public.set_updated_at();

create table if not exists public.trip_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.trip_groups(id) on delete cascade,
  name text not null,
  stage text not null default 'planning' check (stage in ('planning', 'voting', 'locked', 'completed')),
  start_date date,
  end_date date,
  source_location text,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trip_sessions_set_updated_at
before update on public.trip_sessions
for each row
execute function public.set_updated_at();

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.trip_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  preference_vector jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_preferences_session_user_unique unique (session_id, user_id)
);

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row
execute function public.set_updated_at();

create table if not exists public.destination_recommendations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.trip_sessions(id) on delete cascade,
  destination_code text not null,
  destination_name text not null,
  score numeric(7, 3) not null,
  explanation text not null,
  metadata jsonb not null default '{}'::jsonb,
  rank integer,
  created_at timestamptz not null default timezone('utc', now()),
  constraint destination_recommendations_session_code_unique unique (session_id, destination_code)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.trip_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  destination_code text not null,
  destination_name text,
  vote_value integer not null check (vote_value between -1 and 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint votes_session_user_unique unique (session_id, user_id)
);

create trigger votes_set_updated_at
before update on public.votes
for each row
execute function public.set_updated_at();

create table if not exists public.selected_destination (
  session_id uuid primary key references public.trip_sessions(id) on delete cascade,
  destination_code text not null,
  selected_by uuid not null references public.users(id) on delete restrict,
  selected_at timestamptz not null default timezone('utc', now()),
  reasoning text
);

create index if not exists idx_group_memberships_group_id on public.group_memberships (group_id);
create index if not exists idx_group_memberships_user_id on public.group_memberships (user_id);
create index if not exists idx_trip_sessions_group_id on public.trip_sessions (group_id);
create index if not exists idx_user_preferences_session_id on public.user_preferences (session_id);
create index if not exists idx_votes_session_id on public.votes (session_id);
create index if not exists idx_recommendations_session_id on public.destination_recommendations (session_id);
create index if not exists idx_selected_destination_selected_by on public.selected_destination (selected_by);

create or replace function public.is_group_member(target_group_id uuid, target_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = target_group_id
      and gm.user_id = target_user_id
      and gm.join_status = 'accepted'
  );
$$;

create or replace function public.is_group_owner(target_group_id uuid, target_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = target_group_id
      and gm.user_id = target_user_id
      and gm.join_status = 'accepted'
      and gm.role = 'owner'
  );
$$;

create or replace function public.is_session_member(target_session_id uuid, target_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.trip_sessions ts
    join public.group_memberships gm on gm.group_id = ts.group_id
    where ts.id = target_session_id
      and gm.user_id = target_user_id
      and gm.join_status = 'accepted'
  );
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.users enable row level security;
alter table public.trip_groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.trip_sessions enable row level security;
alter table public.user_preferences enable row level security;
alter table public.destination_recommendations enable row level security;
alter table public.votes enable row level security;
alter table public.selected_destination enable row level security;

create policy users_select_self
on public.users
for select
to authenticated
using (id = auth.uid());

create policy users_insert_self
on public.users
for insert
to authenticated
with check (id = auth.uid());

create policy users_update_self
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy trip_groups_select_member
on public.trip_groups
for select
to authenticated
using (public.is_group_member(id, auth.uid()));

create policy trip_groups_insert_owner
on public.trip_groups
for insert
to authenticated
with check (created_by = auth.uid());

create policy trip_groups_update_owner
on public.trip_groups
for update
to authenticated
using (public.is_group_owner(id, auth.uid()))
with check (public.is_group_owner(id, auth.uid()));

create policy trip_groups_delete_owner
on public.trip_groups
for delete
to authenticated
using (public.is_group_owner(id, auth.uid()));

create policy memberships_select_related
on public.group_memberships
for select
to authenticated
using (user_id = auth.uid() or public.is_group_member(group_id, auth.uid()));

create policy memberships_insert_owner_or_self_join
on public.group_memberships
for insert
to authenticated
with check (
  (public.is_group_owner(group_id, auth.uid()) and invited_by = auth.uid())
  or (user_id = auth.uid() and join_status = 'accepted')
);

create policy memberships_update_owner_or_self
on public.group_memberships
for update
to authenticated
using (user_id = auth.uid() or public.is_group_owner(group_id, auth.uid()))
with check (
  (user_id = auth.uid() and join_status in ('invited', 'accepted'))
  or public.is_group_owner(group_id, auth.uid())
);

create policy memberships_delete_owner
on public.group_memberships
for delete
to authenticated
using (public.is_group_owner(group_id, auth.uid()));

create policy sessions_select_member
on public.trip_sessions
for select
to authenticated
using (public.is_group_member(group_id, auth.uid()));

create policy sessions_insert_member
on public.trip_sessions
for insert
to authenticated
with check (public.is_group_member(group_id, auth.uid()) and created_by = auth.uid());

create policy sessions_update_member
on public.trip_sessions
for update
to authenticated
using (public.is_group_member(group_id, auth.uid()))
with check (public.is_group_member(group_id, auth.uid()));

create policy sessions_delete_member
on public.trip_sessions
for delete
to authenticated
using (public.is_group_member(group_id, auth.uid()));

create policy prefs_select_member
on public.user_preferences
for select
to authenticated
using (public.is_session_member(session_id, auth.uid()));

create policy prefs_insert_self
on public.user_preferences
for insert
to authenticated
with check (user_id = auth.uid() and public.is_session_member(session_id, auth.uid()));

create policy prefs_update_self
on public.user_preferences
for update
to authenticated
using (user_id = auth.uid() and public.is_session_member(session_id, auth.uid()))
with check (user_id = auth.uid() and public.is_session_member(session_id, auth.uid()));

create policy prefs_delete_self
on public.user_preferences
for delete
to authenticated
using (user_id = auth.uid() and public.is_session_member(session_id, auth.uid()));

create policy recs_select_member
on public.destination_recommendations
for select
to authenticated
using (public.is_session_member(session_id, auth.uid()));

create policy recs_write_member
on public.destination_recommendations
for all
to authenticated
using (public.is_session_member(session_id, auth.uid()))
with check (public.is_session_member(session_id, auth.uid()));

create policy votes_select_member
on public.votes
for select
to authenticated
using (public.is_session_member(session_id, auth.uid()));

create policy votes_insert_self
on public.votes
for insert
to authenticated
with check (user_id = auth.uid() and public.is_session_member(session_id, auth.uid()));

create policy votes_update_self
on public.votes
for update
to authenticated
using (user_id = auth.uid() and public.is_session_member(session_id, auth.uid()))
with check (user_id = auth.uid() and public.is_session_member(session_id, auth.uid()));

create policy votes_delete_self
on public.votes
for delete
to authenticated
using (user_id = auth.uid() and public.is_session_member(session_id, auth.uid()));

create policy selected_destination_select_member
on public.selected_destination
for select
to authenticated
using (public.is_session_member(session_id, auth.uid()));

create policy selected_destination_insert_member
on public.selected_destination
for insert
to authenticated
with check (selected_by = auth.uid() and public.is_session_member(session_id, auth.uid()));

create policy selected_destination_update_member
on public.selected_destination
for update
to authenticated
using (public.is_session_member(session_id, auth.uid()))
with check (selected_by = auth.uid() and public.is_session_member(session_id, auth.uid()));

create policy selected_destination_delete_member
on public.selected_destination
for delete
to authenticated
using (public.is_session_member(session_id, auth.uid()));

commit;
