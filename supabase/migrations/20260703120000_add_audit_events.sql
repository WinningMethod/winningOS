-- WinningOS Core audit events (Phase 8: audit posture).
--
-- Scope:
-- - one append-only table recording privileged Core actions
-- - read access for members who can manage the workspace (live workspace.manage grant)
-- - no update/delete path for any client role: the trail is append-only
--
-- Event vocabulary (dot-namespaced, mirroring permission naming):
--   workspace.updated, branding.updated, member.invited, member.role_changed,
--   member.disabled, member.removed, role_permission.changed
--
-- Writers:
-- - the settings RPCs (added in the persist-core-settings migration) insert
--   server-side in the same transaction as the change
-- - service-role app flows (member invites and other admin-client actions)
--   insert best-effort from the app layer
--
-- Non-goals:
-- - audit is observability, not a security control; RLS and the RPC permission
--   checks remain the enforcement layer
-- - no retention/rotation policy yet (defer until volume exists)

create table if not exists public.core_audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.core_workspaces(id) on delete cascade,
  actor_profile_id uuid references public.core_profiles(id) on delete set null,
  action text not null,
  subject_type text,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint core_audit_events_action_format check (action ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  constraint core_audit_events_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists core_audit_events_workspace_created_idx
  on public.core_audit_events (workspace_id, created_at desc);

create index if not exists core_audit_events_actor_profile_id_idx
  on public.core_audit_events (actor_profile_id)
  where actor_profile_id is not null;

-- Append helper for security-definer RPCs. Resolves the acting profile from
-- auth.uid() so callers cannot spoof the actor.
create or replace function private.core_append_audit_event(
  target_workspace_id uuid,
  event_action text,
  event_subject_type text default null,
  event_subject_id uuid default null,
  event_metadata jsonb default '{}'::jsonb
)
returns void
language sql
volatile
security definer
set search_path = extensions, auth, private, public
as $$
  insert into public.core_audit_events (workspace_id, actor_profile_id, action, subject_type, subject_id, metadata)
  values (
    target_workspace_id,
    private.core_current_profile_id(),
    event_action,
    event_subject_type,
    event_subject_id,
    coalesce(event_metadata, '{}'::jsonb)
  )
$$;

revoke execute on function private.core_append_audit_event(uuid, text, text, uuid, jsonb) from public;

alter table public.core_audit_events enable row level security;

-- Read: anyone holding the live workspace.manage grant (admin-tier by default,
-- owner always). Ordinary members do not see the audit trail.
drop policy if exists "Workspace managers can read audit events" on public.core_audit_events;

create policy "Workspace managers can read audit events"
  on public.core_audit_events
  for select
  to authenticated
  using (private.core_current_member_has_permission(workspace_id, 'workspace.manage'));

-- No insert/update/delete policies for authenticated: writes happen through
-- security-definer helpers or the service role only, and nothing edits history.
