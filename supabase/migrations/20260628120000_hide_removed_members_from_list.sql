-- Fix issue #43: a revoked invite must not linger on the Members page.
--
-- Root cause:
-- core_remove_member sets a membership's status to 'removed'. The previous
-- core_list_workspace_members LEFT JOIN filtered removed rows *inside the join*
-- (`m.status <> 'removed'`), so a removed membership produced a NULL join row —
-- indistinguishable from a profile that never had a membership. The trailing
-- `coalesce(m.status, 'pending_access')` then relabelled the revoked person as
-- "Pending access" and the UI offered an "Activate" button that can never work
-- (core_set_member_role refuses to reactivate a removed membership).
--
-- Fix: join the membership unconditionally and exclude removed memberships in the
-- WHERE clause instead. A genuine first-sign-in profile (no membership row at all)
-- still surfaces as pending_access; a deliberately removed/revoked membership is
-- dropped from the list entirely, exactly as the issue requests. Re-inviting that
-- person continues to go through the normal invite flow.
--
-- The (workspace_id, profile_id) uniqueness on core_memberships guarantees at most
-- one membership per profile per workspace, so the open join introduces no row
-- duplication. Behaviour is otherwise identical to the prior definition.

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
  left join public.core_roles r on r.id = m.role_id
  -- Revoked/removed memberships are dropped instead of reappearing as
  -- pending_access (issue #43); profiles with no membership at all are still
  -- shown to owners/admins as genuine pending access.
  where coalesce(m.status, 'pending_access') <> 'removed'
    and (
      (m.id is not null and m.status = 'active')
      or current_role_key in ('owner', 'admin')
    )
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
