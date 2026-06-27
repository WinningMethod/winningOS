-- Fix member role updates to resolve the workspace-scoped system roles seeded by WinningOS Core.
--
-- The original member-management RPC looked for global roles, but the Core seed
-- creates owner/admin/member/viewer roles scoped to the single `winningos` workspace. That made valid
-- owner/admin role updates fail with `core_set_member_role role not found`.

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
