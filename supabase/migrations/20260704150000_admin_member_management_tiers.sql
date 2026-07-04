-- Issues #58 + #60: admins manage the member/viewer tier; only owners touch admins.
--
-- #60: admins may now invite members — members.invite moves from owner-only to
-- admin-tier by default and becomes editable from Settings → Roles like
-- members.disable. The app layer restricts WHICH role an admin may invite as
-- (member/viewer only); the invite flow acts through the service role, so that
-- tier restriction is enforced in the invite action, while the grant itself is
-- enforced here.
--
-- #58: core_set_member_role gains tier rules — a non-owner caller can neither
-- assign the admin role nor change a member who currently holds it. Owners
-- keep full range (except the existing owner-role floor).
--
-- The structural locked set shrinks to: workspace.delete, members.remove,
-- roles.manage. members.remove stays owner-only so an admin still cannot
-- revoke memberships outright.

-- Default grant: admins can invite. Editable afterwards via Settings → Roles.
insert into public.core_role_permissions (role_key, permission_key)
values ('admin', 'members.invite')
on conflict on constraint core_role_permissions_pkey do nothing;

-- Grant editor: members.invite leaves the locked list (body otherwise
-- identical to 20260704100000_fix_role_permission_grant_conflict.sql).
create or replace function public.core_set_role_permission(
  target_role_key text,
  target_permission_key text,
  granted boolean
)
returns table (
  role_key text,
  permission_key text,
  is_granted boolean
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

  if not private.core_current_member_has_permission(target_workspace_id, 'roles.manage') then
    raise exception 'core_set_role_permission requires the roles.manage permission';
  end if;

  if target_role_key not in ('admin', 'member', 'viewer') then
    raise exception 'core_set_role_permission can only edit admin, member, or viewer roles';
  end if;

  -- Structural owner-only permissions stay locked (#60 unlocked members.invite).
  if target_permission_key in ('workspace.delete', 'members.remove', 'roles.manage') then
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
    on conflict on constraint core_role_permissions_pkey do nothing;
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

-- Role assignment: non-owner callers stay inside the member/viewer tier (#58).
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
  actor_role_key text;
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

  actor_role_key := private.core_current_member_role_key(target_workspace_id);

  -- Only owners may hand out the admin role (#58).
  if actor_role_key <> 'owner' and target_role_key = 'admin' then
    raise exception 'core_set_member_role only owners can assign the admin role';
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

  -- Only owners may change a member who currently holds admin (#58).
  if actor_role_key <> 'owner' and existing_role_key = 'admin' then
    raise exception 'core_set_member_role only owners can change an admin member';
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
