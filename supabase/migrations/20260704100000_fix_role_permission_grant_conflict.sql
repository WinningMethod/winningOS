-- Fix issue #49: owners got "Role permission update failed" when GRANTING a
-- permission from Settings → Roles (revoking worked).
--
-- Root cause: core_set_role_permission declares output columns named
-- role_key and permission_key, and its insert used the column-inference
-- conflict form:
--
--   on conflict (role_key, permission_key) do nothing
--
-- PL/pgSQL attempts variable substitution inside the ON CONFLICT inference
-- clause, so those identifiers collide with the same-named output columns and
-- the statement fails at runtime with `column reference "role_key" is
-- ambiguous` (42702). The delete path (revoke) never touches the conflict
-- clause, which is why only granting failed. This is the same bug class the
-- repo already fixed elsewhere by naming the constraint (see
-- core_memberships_workspace_profile_key usage in the bootstrap and
-- member-role RPCs) — this migration applies the same pattern here.
--
-- Body is otherwise identical to 20260628130000_editable_role_permissions.sql.

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
    -- Named constraint instead of column inference: the inference form is
    -- subject to PL/pgSQL variable substitution and collides with the
    -- role_key/permission_key output columns (issue #49).
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
