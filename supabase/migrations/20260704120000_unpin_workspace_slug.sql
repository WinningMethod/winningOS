-- Fix issue #52: renaming the workspace slug broke the whole app.
--
-- Root cause: core_bootstrap_current_user resolved the workspace with
-- `where w.slug = 'winningos'`. The persisted-settings slice made the slug
-- editable, so the moment an owner renamed it the bootstrap RPC raised
-- "requires the winningos workspace seed" — and since every protected page
-- and the sign-in page call ensureCoreSession, the entire app failed.
--
-- Fix: Core v0.1 is single-workspace by constraint (the
-- core_workspaces_single_active_workspace unique index guarantees at most one
-- row with deleted_at null), so the workspace is resolved as THE single
-- active workspace — the same pattern every newer RPC already uses
-- (core_set_member_role, core_update_workspace_settings, ...). The slug
-- becomes what it should have been all along: a human-chosen, machine-
-- readable label carried in workspace metadata for exports and future
-- integrations — nothing in Core resolves by it at runtime.
--
-- Body is otherwise identical to 20260627001000_add_member_invitations.sql
-- (invited-membership promotion included). Applying this migration also
-- REPAIRS any deployment currently broken by a renamed slug — no data
-- changes are needed.

create or replace function public.core_bootstrap_current_user(profile_display_name text default null)
returns table (
  profile_id uuid,
  display_name text,
  workspace_id uuid,
  workspace_name text,
  membership_id uuid,
  role_key text,
  has_active_membership boolean
)
language plpgsql
security definer
set search_path = extensions, auth, private, public
as $$
declare
  current_user_id uuid := auth.uid();
  target_profile_id uuid;
  target_display_name text;
  target_workspace_id uuid;
  target_workspace_name text;
  owner_role_id uuid;
  existing_membership_id uuid;
  existing_role_key text;
  existing_membership_status text;
  active_membership_count bigint;
begin
  if current_user_id is null then
    raise exception 'core_bootstrap_current_user requires an authenticated user'
      using errcode = '28000';
  end if;

  insert into public.core_profiles (user_id, display_name)
  values (current_user_id, nullif(trim(profile_display_name), ''))
  on conflict (user_id) do nothing
  returning public.core_profiles.id, public.core_profiles.display_name into target_profile_id, target_display_name;

  if target_profile_id is null then
    -- Preserve an existing display name; later manual profile editing should own renames.
    update public.core_profiles
    set
      display_name = nullif(trim(profile_display_name), ''),
      updated_at = now()
    where user_id = current_user_id
      and public.core_profiles.display_name is null
      and nullif(trim(profile_display_name), '') is not null
    returning public.core_profiles.id, public.core_profiles.display_name into target_profile_id, target_display_name;
  end if;

  if target_profile_id is null then
    select p.id, p.display_name
    into target_profile_id, target_display_name
    from public.core_profiles p
    where p.user_id = current_user_id;
  end if;

  -- The single active workspace, independent of its (editable) slug.
  select w.id, w.name
  into target_workspace_id, target_workspace_name
  from public.core_workspaces w
  where w.deleted_at is null
  order by w.created_at asc
  limit 1;

  if target_workspace_id is null then
    raise exception 'core_bootstrap_current_user requires an active workspace seed';
  end if;

  select m.id, r.key, m.status
  into existing_membership_id, existing_role_key, existing_membership_status
  from public.core_memberships m
  join public.core_roles r on r.id = m.role_id
  where m.workspace_id = target_workspace_id
    and m.profile_id = target_profile_id
    and m.status in ('active', 'invited')
  limit 1;

  if existing_membership_id is not null then
    if existing_membership_status = 'invited' then
      update public.core_memberships
      set status = 'active', updated_at = now()
      where id = existing_membership_id;
    end if;

    return query select
      target_profile_id,
      target_display_name,
      target_workspace_id,
      target_workspace_name,
      existing_membership_id,
      existing_role_key,
      true;
    return;
  end if;

  -- Re-resolve under lock before the first-owner decision.
  select w.id, w.name
  into target_workspace_id, target_workspace_name
  from public.core_workspaces w
  where w.deleted_at is null
  order by w.created_at asc
  limit 1
  for update;

  if target_workspace_id is null then
    raise exception 'core_bootstrap_current_user requires an active workspace seed';
  end if;

  select m.id, r.key, m.status
  into existing_membership_id, existing_role_key, existing_membership_status
  from public.core_memberships m
  join public.core_roles r on r.id = m.role_id
  where m.workspace_id = target_workspace_id
    and m.profile_id = target_profile_id
    and m.status in ('active', 'invited')
  limit 1;

  if existing_membership_id is not null then
    if existing_membership_status = 'invited' then
      update public.core_memberships
      set status = 'active', updated_at = now()
      where id = existing_membership_id;
    end if;

    return query select
      target_profile_id,
      target_display_name,
      target_workspace_id,
      target_workspace_name,
      existing_membership_id,
      existing_role_key,
      true;
    return;
  end if;

  select count(*)
  into active_membership_count
  from public.core_memberships m
  where m.workspace_id = target_workspace_id
    and m.status = 'active';

  if active_membership_count = 0 then
    select r.id
    into owner_role_id
    from public.core_roles r
    where r.workspace_id = target_workspace_id
      and r.key = 'owner';

    if owner_role_id is null then
      raise exception 'core_bootstrap_current_user requires the owner role seed';
    end if;

    insert into public.core_memberships (workspace_id, profile_id, role_id, status)
    values (target_workspace_id, target_profile_id, owner_role_id, 'active')
    on conflict on constraint core_memberships_workspace_profile_key do nothing
    returning public.core_memberships.id into existing_membership_id;

    if existing_membership_id is not null then
      update public.core_workspaces
      set created_by_profile_id = coalesce(created_by_profile_id, target_profile_id)
      where id = target_workspace_id;

      return query select
        target_profile_id,
        target_display_name,
        target_workspace_id,
        target_workspace_name,
        existing_membership_id,
        'owner'::text,
        true;
      return;
    end if;
  end if;

  return query select
    target_profile_id,
    target_display_name,
    target_workspace_id,
    target_workspace_name,
    null::uuid,
    null::text,
    false;
end;
$$;

revoke all on function public.core_bootstrap_current_user(text) from public;
revoke all on function public.core_bootstrap_current_user(text) from anon;
grant execute on function public.core_bootstrap_current_user(text) to authenticated;
