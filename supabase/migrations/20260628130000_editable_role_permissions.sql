-- Issue #42: make Settings → Roles permission grants editable.
--
-- Until now core_role_permissions was seed-only reference data and server
-- enforcement read the hardcoded role keys baked into each RPC. This migration
-- turns core_role_permissions into the live source of truth for the editable
-- portion of the permission model and gives owners an RPC to toggle grants.
--
-- Safety rails (defense in depth — UI is never the boundary):
--   * Owner is immutable: the owner row can never be edited, and owner is treated
--     as holding every permission by construction (core_role_has_permission). An
--     owner can therefore never lock themselves out, even if a grant row is
--     missing.
--   * Only owners may edit grants: core_set_role_permission requires roles.manage,
--     which is owner-only and itself locked (below).
--   * Structural owner-only permissions stay locked and cannot be granted to a
--     lower role or stripped from owner: workspace.delete, members.invite,
--     members.remove, roles.manage. These are the boundaries the member-removal
--     and invite hardening depend on (see validate-permissions.mjs OWNER_ONLY).
--   * The editable admin-tier RPCs (core_set_member_role / core_disable_member)
--     now gate on the live grant map, so revoking members.disable or roles.assign
--     from admin takes effect immediately. Owner-only RPCs keep their existing
--     owner floors untouched.

-- Live permission resolver. Owner always holds everything; every other role holds
-- exactly what core_role_permissions grants it.
create or replace function private.core_role_has_permission(p_role_key text, p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = extensions, auth, private, public
as $$
  select p_role_key = 'owner'
    or exists (
      select 1
      from public.core_role_permissions rp
      where rp.role_key = p_role_key
        and rp.permission_key = p_permission_key
    )
$$;

-- Whether the calling active member holds a permission in the given workspace.
create or replace function private.core_current_member_has_permission(target_workspace_id uuid, p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = extensions, auth, private, public
as $$
  select coalesce(
    private.core_role_has_permission(
      private.core_current_member_role_key(target_workspace_id),
      p_permission_key
    ),
    false
  )
$$;

revoke execute on function private.core_role_has_permission(text, text) from public;
revoke execute on function private.core_current_member_has_permission(uuid, text) from public;

-- Re-point the two editable admin-tier RPCs at the live grant map so owner edits
-- to roles.assign / members.disable take effect. Bodies are otherwise identical
-- to their latest definitions.
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

  if not private.core_current_member_has_permission(target_workspace_id, 'roles.assign') then
    raise exception 'core_set_member_role requires the roles.assign permission';
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

  select r.id
  into target_role_id
  from public.core_roles r
  where r.workspace_id = target_workspace_id
    and r.key = target_role_key
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

  if not private.core_current_member_has_permission(target_workspace_id, 'members.disable') then
    raise exception 'core_disable_member requires the members.disable permission';
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
    and public.core_memberships.status = 'active'
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

-- Owner-only editor for the grant map. Toggles a single (role, permission) grant.
create or replace function public.core_set_role_permission(
  target_role_key text,
  target_permission_key text,
  granted boolean
)
returns table (
  role_key text,
  permission_key text,
  granted boolean
)
language plpgsql
volatile
security definer
set search_path = extensions, auth, private, public
as $$
declare
  target_workspace_id uuid;
  permission_exists boolean;
begin
  select id
  into target_workspace_id
  from public.core_workspaces
  where deleted_at is null
  order by created_at asc
  limit 1;

  if target_workspace_id is null then
    raise exception 'core_set_role_permission requires an active workspace';
  end if;

  -- Only owners (roles.manage is owner-only and locked) may edit grants.
  if not private.core_current_member_has_permission(target_workspace_id, 'roles.manage') then
    raise exception 'core_set_role_permission requires the roles.manage permission';
  end if;

  -- Owner is immutable: it always holds every permission by construction.
  if target_role_key not in ('admin', 'member', 'viewer') then
    raise exception 'core_set_role_permission can only edit admin, member, or viewer roles';
  end if;

  -- Structural owner-only permissions stay locked to preserve the security
  -- boundaries the member/invite/remove flows depend on.
  if target_permission_key in ('workspace.delete', 'members.invite', 'members.remove', 'roles.manage') then
    raise exception 'core_set_role_permission cannot edit owner-only permission %', target_permission_key;
  end if;

  select exists (
    select 1 from public.core_permissions cp where cp.key = target_permission_key
  )
  into permission_exists;

  if not permission_exists then
    raise exception 'core_set_role_permission unknown permission %', target_permission_key;
  end if;

  if granted then
    insert into public.core_role_permissions (role_key, permission_key)
    values (target_role_key, target_permission_key)
    on conflict (role_key, permission_key) do nothing;
  else
    delete from public.core_role_permissions rp
    where rp.role_key = target_role_key
      and rp.permission_key = target_permission_key;
  end if;

  return query
  select target_role_key, target_permission_key, granted;
end;
$$;

revoke all on function public.core_set_role_permission(text, text, boolean) from public;
grant execute on function public.core_set_role_permission(text, text, boolean) to authenticated;
