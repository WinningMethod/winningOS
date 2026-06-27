-- Fix Disable/Remove member actions failing with a generic permission error.
--
-- Root cause:
-- core_disable_member and core_remove_member declare `status` as a RETURNS TABLE
-- output column, which makes `status` a PL/pgSQL variable inside the function.
-- Their UPDATE ... WHERE clauses referenced an *unqualified* `status`, which is
-- ambiguous between that output variable (NULL at that point) and the
-- core_memberships.status column. Depending on plpgsql.variable_conflict the
-- statement either raised "column reference status is ambiguous" or matched no
-- row (NULL = 'active'), so the UPDATE never applied and the RPC raised — which
-- the Members UI surfaced as "Member access update failed. Check permissions and
-- try again." It was never a permissions problem.
--
-- Fix: qualify the column as public.core_memberships.status in the UPDATE WHERE,
-- exactly like core_set_member_role already does. Behaviour is otherwise
-- identical to the latest definitions (owner/admin disable, owner-only remove).

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

create or replace function public.core_remove_member(target_membership_id uuid)
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
    and m.status in ('invited', 'disabled')
  limit 1;

  if target_workspace_id is null then
    raise exception 'core_remove_member membership not found or not removable';
  end if;

  current_profile_id := private.core_current_profile_id();

  if current_profile_id is null then
    raise exception 'core_remove_member requires an authenticated profile';
  end if;

  if not coalesce(private.core_can_remove_members(target_workspace_id), false) then
    raise exception 'core_remove_member requires owner membership';
  end if;

  if current_profile_id = target_profile_id then
    raise exception 'core_remove_member cannot remove your own membership';
  end if;

  if target_role_key = 'owner' then
    raise exception 'core_remove_member cannot remove owner membership';
  end if;

  update public.core_memberships
  set status = 'removed',
      updated_at = now()
  where id = target_membership_id
    and public.core_memberships.status in ('invited', 'disabled')
  returning id, public.core_memberships.status
  into membership_id, status;

  if membership_id is null then
    raise exception 'core_remove_member only removes invited or disabled memberships';
  end if;

  return next;
end;
$$;

revoke all on function public.core_remove_member(uuid) from public;
grant execute on function public.core_remove_member(uuid) to authenticated;
