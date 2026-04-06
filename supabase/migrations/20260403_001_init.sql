begin;

create extension if not exists pgcrypto;

-- =====================================================
-- Core identity and group tables
-- =====================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,32}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.trip_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.group_members (
  group_id uuid not null references public.trip_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (group_id, user_id)
);

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.trip_groups (id) on delete cascade,
  invite_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  invited_email text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- =====================================================
-- Destination catalog and trip persistence tables
-- =====================================================

create table public.destinations (
  id text primary key,
  city text not null,
  state text not null,
  latitude double precision not null,
  longitude double precision not null,
  temperature_score smallint not null check (temperature_score between 0 and 10),
  budget_score smallint not null check (budget_score between 0 and 10),
  urban_score smallint not null check (urban_score between 0 and 10),
  nature_score smallint not null check (nature_score between 0 and 10),
  food_score smallint not null check (food_score between 0 and 10),
  nightlife_score smallint not null check (nightlife_score between 0 and 10),
  relaxation_score smallint not null check (relaxation_score between 0 and 10),
  short_description text not null,
  image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.trip_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.trip_groups (id) on delete cascade,
  title text not null default 'Trip session' check (char_length(title) between 1 and 120),
  origin text not null check (char_length(origin) between 3 and 8),
  departure_date date not null,
  return_date date not null,
  travelers integer not null check (travelers >= 1),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trip_sessions_date_order check (return_date > departure_date)
);

create table public.trip_user_preferences (
  trip_session_id uuid not null references public.trip_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  adventure smallint not null check (adventure between 0 and 10),
  budget smallint not null check (budget between 0 and 10),
  setting smallint not null check (setting between 0 and 10),
  weather smallint not null check (weather between 0 and 10),
  focus smallint not null check (focus between 0 and 10),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (trip_session_id, user_id)
);

create table public.trip_recommendations (
  trip_session_id uuid not null references public.trip_sessions (id) on delete cascade,
  destination_id text not null references public.destinations (id) on delete restrict,
  rank integer not null check (rank >= 1),
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  reason text not null,
  generated_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (trip_session_id, destination_id)
);

create table public.trip_destination_votes (
  trip_session_id uuid not null references public.trip_sessions (id) on delete cascade,
  destination_id text not null references public.destinations (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (trip_session_id, destination_id, user_id)
);

create table public.trip_selected_destinations (
  trip_session_id uuid primary key references public.trip_sessions (id) on delete cascade,
  destination_id text not null references public.destinations (id) on delete restrict,
  selected_by uuid not null references public.profiles (id) on delete restrict,
  selected_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- =====================================================
-- Indexes
-- =====================================================

create index idx_group_members_user on public.group_members (user_id);
create index idx_group_invites_group_status on public.group_invites (group_id, status);
create index idx_trip_sessions_group_status on public.trip_sessions (group_id, status);
create index idx_trip_preferences_user on public.trip_user_preferences (user_id);
create index idx_trip_recommendations_trip_rank on public.trip_recommendations (trip_session_id, rank);
create index idx_trip_votes_trip_destination on public.trip_destination_votes (trip_session_id, destination_id);

-- =====================================================
-- Updated-at trigger helper
-- =====================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_trip_groups_updated_at
before update on public.trip_groups
for each row execute function public.set_updated_at();

create trigger set_group_invites_updated_at
before update on public.group_invites
for each row execute function public.set_updated_at();

create trigger set_destinations_updated_at
before update on public.destinations
for each row execute function public.set_updated_at();

create trigger set_trip_sessions_updated_at
before update on public.trip_sessions
for each row execute function public.set_updated_at();

create trigger set_trip_user_preferences_updated_at
before update on public.trip_user_preferences
for each row execute function public.set_updated_at();

create trigger set_trip_recommendations_updated_at
before update on public.trip_recommendations
for each row execute function public.set_updated_at();

create trigger set_trip_destination_votes_updated_at
before update on public.trip_destination_votes
for each row execute function public.set_updated_at();

create trigger set_trip_selected_destinations_updated_at
before update on public.trip_selected_destinations
for each row execute function public.set_updated_at();

-- =====================================================
-- Auth/profile bootstrap and helper functions
-- =====================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_handle text;
  generated_display_name text;
begin
  generated_handle := 'user_' || left(replace(new.id::text, '-', ''), 10);
  generated_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    generated_handle
  );

  insert into public.profiles (id, handle, display_name)
  values (new.id, generated_handle, left(generated_display_name, 80))
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  );
$$;

create or replace function public.is_trip_member(p_trip_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_sessions ts
    join public.group_members gm on gm.group_id = ts.group_id
    where ts.id = p_trip_session_id
      and gm.user_id = auth.uid()
  );
$$;

create or replace function public.has_shared_group(p_other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members me
    join public.group_members other_member
      on other_member.group_id = me.group_id
    where me.user_id = auth.uid()
      and other_member.user_id = p_other_user
  );
$$;

create or replace function public.create_group_with_owner(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'Group name is required';
  end if;

  insert into public.trip_groups (name, created_by)
  values (trim(p_name), auth.uid())
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, auth.uid(), 'owner')
  on conflict do nothing;

  return new_group_id;
end;
$$;

create or replace function public.create_group_invite(
  p_group_id uuid,
  p_invited_email text default null,
  p_expires_in_days integer default 14
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  normalized_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_group_owner(p_group_id) then
    raise exception 'Only group owners can create invites';
  end if;

  normalized_email := nullif(lower(trim(p_invited_email)), '');

  insert into public.group_invites (
    group_id,
    invited_email,
    created_by,
    expires_at
  )
  values (
    p_group_id,
    normalized_email,
    auth.uid(),
    timezone('utc', now()) + make_interval(days => greatest(p_expires_in_days, 1))
  )
  returning invite_code into new_code;

  return new_code;
end;
$$;

create or replace function public.accept_group_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.group_invites%rowtype;
  requester_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  requester_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select *
  into invite_row
  from public.group_invites gi
  where gi.invite_code = p_invite_code
    and gi.status = 'pending'
    and (gi.expires_at is null or gi.expires_at > timezone('utc', now()))
  for update;

  if not found then
    raise exception 'Invite is invalid, expired, or already used';
  end if;

  if invite_row.invited_email is not null
     and lower(invite_row.invited_email) <> requester_email then
    raise exception 'This invite is restricted to a different email address';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (invite_row.group_id, auth.uid(), 'member')
  on conflict do nothing;

  update public.group_invites
  set
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = timezone('utc', now())
  where id = invite_row.id;

  return invite_row.group_id;
end;
$$;

grant execute on function public.create_group_with_owner(text) to authenticated;
grant execute on function public.create_group_invite(uuid, text, integer) to authenticated;
grant execute on function public.accept_group_invite(text) to authenticated;

-- =====================================================
-- Row level security policies
-- =====================================================

alter table public.profiles enable row level security;
alter table public.trip_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.destinations enable row level security;
alter table public.trip_sessions enable row level security;
alter table public.trip_user_preferences enable row level security;
alter table public.trip_recommendations enable row level security;
alter table public.trip_destination_votes enable row level security;
alter table public.trip_selected_destinations enable row level security;

create policy profiles_select_self_or_group
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.has_shared_group(id));

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy trip_groups_select_members
on public.trip_groups
for select
to authenticated
using (public.is_group_member(id));

create policy trip_groups_update_owner
on public.trip_groups
for update
to authenticated
using (public.is_group_owner(id))
with check (public.is_group_owner(id));

create policy trip_groups_delete_owner
on public.trip_groups
for delete
to authenticated
using (public.is_group_owner(id));

create policy group_members_select_group
on public.group_members
for select
to authenticated
using (public.is_group_member(group_id));

create policy group_members_insert_owner_only
on public.group_members
for insert
to authenticated
with check (public.is_group_owner(group_id));

create policy group_members_update_owner_or_self
on public.group_members
for update
to authenticated
using (public.is_group_owner(group_id) or auth.uid() = user_id)
with check (
  public.is_group_owner(group_id)
  or (auth.uid() = user_id and role = 'member')
);

create policy group_members_delete_owner_or_self
on public.group_members
for delete
to authenticated
using (public.is_group_owner(group_id) or auth.uid() = user_id);

create policy group_invites_select_group_members
on public.group_invites
for select
to authenticated
using (public.is_group_member(group_id));

create policy group_invites_insert_owner
on public.group_invites
for insert
to authenticated
with check (public.is_group_owner(group_id) and created_by = auth.uid());

create policy group_invites_update_owner
on public.group_invites
for update
to authenticated
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

create policy group_invites_delete_owner
on public.group_invites
for delete
to authenticated
using (public.is_group_owner(group_id));

create policy destinations_select_authenticated
on public.destinations
for select
to authenticated
using (true);

create policy trip_sessions_select_trip_members
on public.trip_sessions
for select
to authenticated
using (public.is_group_member(group_id));

create policy trip_sessions_insert_group_members
on public.trip_sessions
for insert
to authenticated
with check (public.is_group_member(group_id) and created_by = auth.uid());

create policy trip_sessions_update_trip_members
on public.trip_sessions
for update
to authenticated
using (public.is_group_member(group_id))
with check (public.is_group_member(group_id));

create policy trip_sessions_delete_group_owner
on public.trip_sessions
for delete
to authenticated
using (public.is_group_owner(group_id));

create policy trip_user_preferences_select_trip_members
on public.trip_user_preferences
for select
to authenticated
using (public.is_trip_member(trip_session_id));

create policy trip_user_preferences_insert_self
on public.trip_user_preferences
for insert
to authenticated
with check (public.is_trip_member(trip_session_id) and user_id = auth.uid());

create policy trip_user_preferences_update_self
on public.trip_user_preferences
for update
to authenticated
using (public.is_trip_member(trip_session_id) and user_id = auth.uid())
with check (public.is_trip_member(trip_session_id) and user_id = auth.uid());

create policy trip_user_preferences_delete_self
on public.trip_user_preferences
for delete
to authenticated
using (public.is_trip_member(trip_session_id) and user_id = auth.uid());

create policy trip_recommendations_select_trip_members
on public.trip_recommendations
for select
to authenticated
using (public.is_trip_member(trip_session_id));

create policy trip_recommendations_write_trip_members
on public.trip_recommendations
for all
to authenticated
using (public.is_trip_member(trip_session_id))
with check (public.is_trip_member(trip_session_id));

create policy trip_destination_votes_select_trip_members
on public.trip_destination_votes
for select
to authenticated
using (public.is_trip_member(trip_session_id));

create policy trip_destination_votes_insert_self
on public.trip_destination_votes
for insert
to authenticated
with check (public.is_trip_member(trip_session_id) and user_id = auth.uid());

create policy trip_destination_votes_update_self
on public.trip_destination_votes
for update
to authenticated
using (public.is_trip_member(trip_session_id) and user_id = auth.uid())
with check (public.is_trip_member(trip_session_id) and user_id = auth.uid());

create policy trip_destination_votes_delete_self
on public.trip_destination_votes
for delete
to authenticated
using (public.is_trip_member(trip_session_id) and user_id = auth.uid());

create policy trip_selected_destinations_select_trip_members
on public.trip_selected_destinations
for select
to authenticated
using (public.is_trip_member(trip_session_id));

create policy trip_selected_destinations_insert_trip_members
on public.trip_selected_destinations
for insert
to authenticated
with check (public.is_trip_member(trip_session_id) and selected_by = auth.uid());

create policy trip_selected_destinations_update_trip_members
on public.trip_selected_destinations
for update
to authenticated
using (public.is_trip_member(trip_session_id))
with check (public.is_trip_member(trip_session_id) and selected_by = auth.uid());

create policy trip_selected_destinations_delete_trip_members
on public.trip_selected_destinations
for delete
to authenticated
using (public.is_trip_member(trip_session_id));

commit;
