-- Plugin readiness: let the schema accept the compatibility contract's own
-- plugin formats before the first plugin template exists.
--
-- COMPATIBILITY.md defines plugin permissions as plugin.{plugin_id}.{action}
-- (three segments) and plugin audit actions as plugin.{plugin_id}.{event},
-- but the original check constraints only allowed the two-segment Core form
-- (namespace.action). Without this migration the very first plugin migration
-- would be rejected by core_permissions_key_format, and plugin audit appends
-- would violate core_audit_events_action_format.
--
-- Rules encoded here:
-- - Core permissions stay exactly two segments: {namespace}.{action}.
-- - Plugin permissions are exactly three segments and must start with the
--   literal 'plugin.': plugin.{plugin_id}.{action}. Their namespace column is
--   'plugin', which still satisfies core_permissions_namespace_matches_key
--   ('plugin.meeting_notes.view' like 'plugin' || '.%').
-- - Audit actions accept the same two forms.
--
-- Nothing here grants anything: plugin permission keys remain deny-by-default
-- until a reviewed plugin migration seeds core_permissions and
-- core_role_permissions rows for its own plugin.{plugin_id}.* keys.

alter table public.core_permissions
  drop constraint core_permissions_key_format;

alter table public.core_permissions
  add constraint core_permissions_key_format check (
    key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'
    or key ~ '^plugin\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'
  );

alter table public.core_audit_events
  drop constraint core_audit_events_action_format;

alter table public.core_audit_events
  add constraint core_audit_events_action_format check (
    action ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'
    or action ~ '^plugin\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'
  );
