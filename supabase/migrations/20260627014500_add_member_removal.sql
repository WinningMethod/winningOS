-- WinningOS Core member removal/revoke RPC.
--
-- Scope:
-- - owner/admin removal of stale invites and non-owner memberships
-- - preserve auditable membership rows by marking them removed
--
-- Non-goals:
-- - deleting auth.users records
-- - owner transfer
-- - self-removal

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
    and m.status in ('active', 'invited', 'disabled')
  limit 1;

  if target_workspace_id is null then
    raise exception 'core_remove_member membership not found';
  end if;

  if not private.core_can_manage_members(target_workspace_id) then
    raise exception 'core_remove_member requires owner or admin membership';
  end if;

  current_profile_id := private.core_current_profile_id();

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
    and status in ('active', 'invited', 'disabled')
  returning id, public.core_memberships.status
  into membership_id, status;

  if membership_id is null then
    raise exception 'core_remove_member only removes active, invited, or disabled memberships';
  end if;

  return next;
end;
$$;

revoke all on function public.core_remove_member(uuid) from public;
grant execute on function public.core_remove_member(uuid) to authenticated;
