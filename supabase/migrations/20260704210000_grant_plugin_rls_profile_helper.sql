-- Phase 10 (plugin host): grant the last RLS policy helper plugin policies need.
--
-- The core-v0 plugin SQL templates (COMPATIBILITY.md, PLUGIN_TEMPLATE_HANDOVER.md)
-- gate inserts on `author_profile_id = private.core_current_profile_id()` so a
-- member can only write rows as themselves. RLS policy expressions run with the
-- privileges of the QUERYING role (issues #46/#47), so `authenticated` needs
-- EXECUTE on the helper for those policies to evaluate at all.
--
-- The helper only resolves auth.uid() to the caller's own profile id — it
-- exposes nothing beyond the caller's identity. Schema USAGE was granted in
-- 20260703210000_fix_rls_helper_grants.sql; anon/public stay fully revoked.
-- scripts/validate-supabase-migrations.mjs lists this helper in its
-- policy-grant allowlist.

grant execute on function private.core_current_profile_id() to authenticated;
