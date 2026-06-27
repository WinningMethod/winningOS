-- Harden invite/removal boundaries for WinningOS Core.
--
-- Scope:
-- - removing stale invites/disabled memberships is owner-only
-- - active memberships must be disabled before removal
-- - profileless callers are rejected explicitly so NULL auth state cannot pass guards
--
-- Non-goals:
-- - changing owner/admin role update and disable boundaries
-- - deleting auth.users records
-- - owner transfer

create or replace function private.core_can_remove_members(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select private.core_current_member_role_key(target_workspace_id) = 'owner'
$$;

revoke execute on function private.core_can_remove_members(uuid) from public;

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
    and status in ('invited', 'disabled')
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
