begin;

create or replace function public.list_my_pending_group_invites(p_limit integer default 10)
returns table (
  invite_code text,
  group_id uuid,
  group_name text,
  invited_email text,
  invited_by_user_id uuid,
  invited_by_display_name text,
  invited_by_handle text,
  created_at timestamptz,
  expires_at timestamptz,
  trip_session_id uuid,
  trip_title text,
  trip_origin text,
  trip_departure_date date,
  trip_return_date date,
  trip_travelers integer,
  trip_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_email text;
  clamped_limit integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  requester_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if requester_email = '' then
    return;
  end if;

  clamped_limit := greatest(1, least(coalesce(p_limit, 10), 25));

  return query
  select
    gi.invite_code,
    gi.group_id,
    tg.name as group_name,
    gi.invited_email,
    gi.created_by as invited_by_user_id,
    p.display_name as invited_by_display_name,
    p.handle as invited_by_handle,
    gi.created_at,
    gi.expires_at,
    ts.id as trip_session_id,
    ts.title as trip_title,
    ts.origin as trip_origin,
    ts.departure_date as trip_departure_date,
    ts.return_date as trip_return_date,
    ts.travelers as trip_travelers,
    ts.status::text as trip_status
  from public.group_invites gi
  join public.trip_groups tg
    on tg.id = gi.group_id
  join public.profiles p
    on p.id = gi.created_by
  left join lateral (
    select
      session_row.id,
      session_row.title,
      session_row.origin,
      session_row.departure_date,
      session_row.return_date,
      session_row.travelers,
      session_row.status
    from public.trip_sessions session_row
    where session_row.group_id = gi.group_id
    order by
      case when session_row.status = 'active' then 0 else 1 end,
      session_row.updated_at desc
    limit 1
  ) ts on true
  where gi.status = 'pending'
    and gi.invited_email is not null
    and lower(gi.invited_email) = requester_email
    and (gi.expires_at is null or gi.expires_at > timezone('utc', now()))
  order by gi.created_at desc
  limit clamped_limit;
end;
$$;

create or replace function public.reject_group_invite(p_invite_code text)
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

  if p_invite_code is null or char_length(trim(p_invite_code)) = 0 then
    raise exception 'invite_code is required';
  end if;

  requester_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select *
  into invite_row
  from public.group_invites gi
  where gi.invite_code = trim(p_invite_code)
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  if invite_row.status <> 'pending' then
    raise exception 'Invite is not pending';
  end if;

  if invite_row.expires_at is not null and invite_row.expires_at <= timezone('utc', now()) then
    update public.group_invites
    set status = 'expired'
    where id = invite_row.id;

    raise exception 'Invite is expired';
  end if;

  if invite_row.invited_email is not null
     and lower(invite_row.invited_email) <> requester_email then
    raise exception 'This invite is restricted to a different email address';
  end if;

  update public.group_invites
  set status = 'revoked'
  where id = invite_row.id;

  return invite_row.group_id;
end;
$$;

grant execute on function public.list_my_pending_group_invites(integer) to authenticated;
grant execute on function public.reject_group_invite(text) to authenticated;

commit;
