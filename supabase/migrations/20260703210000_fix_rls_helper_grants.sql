-- Fix issues #46/#47: Settings → Workspace and Settings → Branding failed to
-- load in production ("data could not be loaded") because no RLS policy that
-- calls a private.* helper was evaluatable by the authenticated role.
--
-- Root cause: Postgres evaluates row-level-security policy expressions with
-- the privileges of the QUERYING role, not the table or policy owner.
-- SECURITY DEFINER on a helper only changes who the function BODY runs as —
-- the caller still needs EXECUTE on the function and USAGE on its schema to
-- invoke it at all. The Core migrations revoked all private-schema access
-- from authenticated and never granted EXECUTE on the helpers, so every
-- authenticated PostgREST read of a table whose policy calls private.*
-- failed with `permission denied for schema private` (42501):
--
--   core_profiles         <- core_profiles_share_active_workspace
--   core_workspaces       <- core_is_active_member          (issue #46)
--   core_roles            <- core_is_active_member(_of_any_workspace)
--   core_memberships      <- core_is_active_member
--   core_brand_settings   <- core_is_active_member          (issue #47)
--   core_permissions      <- core_is_active_member_of_any_workspace
--   core_role_permissions <- core_is_active_member_of_any_workspace
--   core_audit_events     <- core_current_member_has_permission
--
-- The gap stayed invisible until the persisted-settings slice because every
-- earlier read path went through security-definer RPCs in public (granted to
-- authenticated, body runs as owner) or the service role (bypasses RLS); the
-- role-grant-map and audit-feed reads degraded silently to fallbacks.
--
-- The fix grants authenticated exactly what policy evaluation needs: USAGE
-- on the schema plus EXECUTE on the helpers policies reference. The security
-- posture this repo actually relies on is unchanged:
--   * the private schema is not in PostgREST's exposed schemas (config.toml
--     [api].schemas = public, graphql_public), so nothing here becomes a
--     REST RPC endpoint
--   * anon receives nothing; every Core policy is `to authenticated`
--   * helpers NOT referenced by policies (core_current_profile_id,
--     core_current_member_role_key, core_can_manage_members,
--     core_can_remove_members, core_role_has_permission,
--     core_append_audit_event) stay revoked — they are only called inside
--     security-definer functions, whose bodies run as the function owner.

grant usage on schema private to authenticated;

-- Policy-referenced helpers only. Keep this list in lockstep with the RLS
-- policies and with scripts/validate-supabase-migrations.mjs.
grant execute on function private.core_is_active_member(uuid) to authenticated;
grant execute on function private.core_is_active_member_of_any_workspace() to authenticated;
grant execute on function private.core_profiles_share_active_workspace(uuid) to authenticated;
grant execute on function private.core_current_member_has_permission(uuid, text) to authenticated;
