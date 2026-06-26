-- WinningOS Core member/access management RPCs.
--
-- Scope:
-- - owner/admin-visible member and pending profile list
-- - owner/admin activation/role update for pending or existing members
-- - owner/admin disable flow for non-owner, non-self memberships
--
-- Non-goals:
-- - email invitations
-- - owner transfer
-- - custom roles or permission tables
-- - plugin/member extensions

create or replace function private.core_current_member_role_key(target_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = auth, public
as $$
  select r.key
  from public.core_memberships m
  join public.core_profiles p on p.id = m.profile_id
  join public.core_roles r on r.id = m.role_id
  join public.core_workspaces w on w.id = m.workspace_id
  where p.user_id = auth.uid()
    and m.workspace_id = target_workspace_id
    and m.status = 'active'
    and w.deleted_at is null
  limit 1
$$;

create or replace function private.core_can_manage_members(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select private.core_current_member_role_key(target_workspace_id) in ('owner', 'admin')
$$;

revoke execute on function private.core_current_member_role_key(uuid) from public;
revoke execute on function private.core_can_manage_members(uuid) from public;

create or replace function public.core_list_workspace_members()
returns table (
  profile_id uuid,
  membership_id uuid,
  user_id uuid,
  email text,
  display_name text,
  avatar_url text,
  role_key text,
  role_name text,
  status text,
  joined_at timestamptz,
  profile_created_at timestamptz,
  can_manage boolean
)
language plpgsql
stable
security definer
set search_path = extensions, auth, private, public
as $$
declare
  target_workspace_id uuid;
  current_role_key text;
begin
  select id
  into target_workspace_id
  from public.core_workspaces
  where deleted_at is null
  order by created_at asc
  limit 1;

  if target_workspace_id is null then
    raise exception 'core_list_workspace_members requires an active workspace';
  end if;

  current_role_key := private.core_current_member_role_key(target_workspace_id);

  if current_role_key is null then
    raise exception 'core_list_workspace_members requires an active membership';
  end if;

  return query
  select
    p.id as profile_id,
    m.id as membership_id,
    u.id as user_id,
    u.email::text as email,
    coalesce(nullif(trim(p.display_name), ''), split_part(u.email, '@', 1), 'Core user') as display_name,
    p.avatar_url,
    r.key as role_key,
    r.name as role_name,
    coalesce(m.status, 'pending_access') as status,
    m.created_at as joined_at,
    p.created_at as profile_created_at,
    current_role_key in ('owner', 'admin') as can_manage
  from public.core_profiles p
  join auth.users u on u.id = p.user_id
  left join public.core_memberships m
    on m.profile_id = p.id
    and m.workspace_id = target_workspace_id
    and m.status <> 'removed'
  left join public.core_roles r on r.id = m.role_id
  where (m.id is not null and m.status = 'active')
    or current_role_key in ('owner', 'admin')
  order by
    case coalesce(m.status, 'pending_access')
      when 'pending_access' then 0
      when 'active' then 1
      when 'disabled' then 2
      else 3
    end,
    p.created_at asc;
end;
$$;

revoke all on function public.core_list_workspace_members() from public;
grant execute on function public.core_list_workspace_members() to authenticated;

create or replace function public.core_set_member_role(target_profile_id uuid, target_role_key text)
returns table (
  profile_id uuid,
  membership_id uuid,
  role_key text,
  status text
)
language plpgsql
volatile
security definer
set search_path = extensions, auth, private, public
as $$
declare
  target_workspace_id uuid;
  target_role_id uuid;
  target_membership_id uuid;
  current_profile_id uuid;
  existing_role_key text;
begin
  select id
  into target_workspace_id
  from public.core_workspaces
  where deleted_at is null
  order by created_at asc
  limit 1;

  if target_workspace_id is null then
    raise exception 'core_set_member_role requires an active workspace';
  end if;

  if not private.core_can_manage_members(target_workspace_id) then
    raise exception 'core_set_member_role requires owner or admin membership';
  end if;

  if target_role_key not in ('admin', 'member', 'viewer') or target_role_key = 'owner' then
    raise exception 'core_set_member_role cannot assign requested role';
  end if;

  current_profile_id := private.core_current_profile_id();

  if current_profile_id = target_profile_id then
    raise exception 'core_set_member_role cannot change your own role';
  end if;

  select r.key
  into existing_role_key
  from public.core_memberships m
  join public.core_roles r on r.id = m.role_id
  where m.workspace_id = target_workspace_id
    and m.profile_id = target_profile_id
    and m.status = 'active'
  limit 1;

  if existing_role_key = 'owner' then
    raise exception 'core_set_member_role cannot change owner membership';
  end if;

  select id
  into target_role_id
  from public.core_roles
  where workspace_id is null
    and key = target_role_key
  limit 1;

  if target_role_id is null then
    raise exception 'core_set_member_role role not found';
  end if;

  insert into public.core_memberships (workspace_id, profile_id, role_id, status)
  values (target_workspace_id, target_profile_id, target_role_id, 'active')
  on conflict on constraint core_memberships_workspace_profile_key do update
    set role_id = excluded.role_id,
        status = 'active',
        updated_at = now()
    where public.core_memberships.status <> 'removed'
  returning id into target_membership_id;

  if target_membership_id is null then
    raise exception 'core_set_member_role cannot reactivate removed membership';
  end if;

  return query
  select target_profile_id, target_membership_id, target_role_key, 'active'::text;
end;
$$;

revoke all on function public.core_set_member_role(uuid, text) from public;
grant execute on function public.core_set_member_role(uuid, text) to authenticated;

create or replace function public.core_disable_member(target_membership_id uuid)
returns table (
  membership_id uuid,
  status text
)
language plpgsql
volatile
security definer
set search_path = extensions, auth, private, public
as $$
declare
  target_workspace_id uuid;
  target_profile_id uuid;
  target_role_key text;
  current_profile_id uuid;
begin
  select m.workspace_id, m.profile_id, r.key
  into target_workspace_id, target_profile_id, target_role_key
  from public.core_memberships m
  join public.core_roles r on r.id = m.role_id
  where m.id = target_membership_id
  limit 1;

  if target_workspace_id is null then
    raise exception 'core_disable_member membership not found';
  end if;

  if not private.core_can_manage_members(target_workspace_id) then
    raise exception 'core_disable_member requires owner or admin membership';
  end if;

  current_profile_id := private.core_current_profile_id();

  if current_profile_id = target_profile_id then
    raise exception 'core_disable_member cannot disable your own membership';
  end if;

  if target_role_key = 'owner' then
    raise exception 'core_disable_member cannot disable owner membership';
  end if;

  update public.core_memberships
  set status = 'disabled',
      updated_at = now()
  where id = target_membership_id
    and status = 'active'
  returning id, public.core_memberships.status
  into membership_id, status;

  if membership_id is null then
    raise exception 'core_disable_member only disables active memberships';
  end if;

  return next;
end;
$$;

revoke all on function public.core_disable_member(uuid) from public;
grant execute on function public.core_disable_member(uuid) to authenticated;
