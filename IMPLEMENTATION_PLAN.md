# WinningOS Core v0.1 Implementation Plan

## Purpose

This document defines the implementation sequence for WinningOS Core v0.1 and records where that sequence currently stands.

The goal is to finish a real Supabase-backed Core — auth, members, roles, permissions, settings — without losing the slow, reviewable, core-first discipline of the project. Plugin work starts only after the Core completion gate at the end of this plan passes.

## Current baseline

WinningOS Core has shipped (merged to `main`):

- agent-agnostic project rules, core charter, architecture/data/security docs
- compatibility contract for future build-time plugins (`COMPATIBILITY.md`)
- Next.js app foundation with the simplified Core shell (`/`, `/home`, `/members`, `/settings`)
- Supabase environment contract and client helpers (browser / server / service-role)
- initial Core schema and seeds: `core_workspaces`, `core_profiles`, `core_memberships`, `core_roles`, `core_brand_settings` with RLS
- auth/profile bootstrap: sign-in, callback handling, idempotent profile creation, first-owner bootstrap, protected app routes, pending-access state
- member management: invite, activate, role change, disable, remove — enforced by security-definer RPCs
- permission catalog: typed constants in `core/permissions/catalog.ts`, persisted to `core_permissions` / `core_role_permissions`, editable role grants (owner-only) with locked structural permissions

## Refined Core v0.1 scope

Core v0.1 implements only the primitives needed for a single-workspace company operating system foundation.

Core v0.1 includes:

- Next.js app foundation
- Supabase project/environment contract
- Supabase Auth integration (email + password)
- single-workspace bootstrap
- profile creation/lookup
- membership and role seed model
- typed permission constants backed by live grant tables
- server-side permission helpers
- RLS-backed data access for core tables
- persisted workspace settings
- persisted branding settings
- audit events for privileged actions
- plugin-ready architecture boundaries

Core v0.1 does not include:

- workspace switching, creation UI, or multi-workspace management
- plugin system implementation or example plugins
- agent/chat functionality, provider configuration, or provider secret storage
- runtime plugin marketplace
- custom auth provider abstraction / SSO
- complex custom role editor (the four system roles are the model)
- billing or business workflows
- external secrets manager integration

## Why Agent is not Core

Agent/chat functionality is valuable, but it is not a universal Core primitive. It creates extra product and security surface (provider selection and configuration, API key storage, chat/thread data, tool execution boundaries, audit requirements, permission namespaces) that belongs behind the future plugin boundary. Core must be strong enough to accept an Agent plugin later, but ships none of it in v0.1.

## Decision log

Decisions made while implementing, so later phases don't re-litigate them:

1. **One deployment = one workspace** (`core_workspaces` has a single-active-row constraint). Future multi-workspace behavior is explicit plugin/integration territory.
2. **First authenticated user becomes owner** of the seeded workspace (serialized in `core_bootstrap_current_user`). Later users wait in pending-access until invited/activated.
3. **Email + password is the primary auth method** (issue #39). Magic-link-only sign-in caused email-provider rate limiting on every login. Password sign-in removes email from the hot path; email remains for invites, sign-up confirmation, and password recovery. Custom SMTP remains the lever if invite/recovery volume ever hits limits.
4. **Permissions are explicit and boring.** The catalog in `core/permissions/catalog.ts` is the nameable source of truth; `core_role_permissions` is the live, owner-editable grant map the server enforces. Owner is immutable and structural permissions (`workspace.delete`, `members.invite`, `members.remove`, `roles.manage`) stay owner-only.
5. **UI is never the security boundary.** Security-definer RPCs and RLS enforce every write; the app layer gates for UX consistency only.
6. **Audit events are best-effort observability, not a security control.** They record who did what; RLS/RPCs remain the enforcement layer.
7. **Plugins integrate through one registry file and one URL prefix.** A plugin is source under `plugins/{plugin_id}/` plus one line in `config/plugins.ts`; all its routes live under `/p/{plugin_id}`. Installation, discovery, navigation, settings, and removal all derive from the manifest, so uninstalling is deleting one line (see `COMPATIBILITY.md`).
8. **Plugins import Core only through the `core/plugins/api` barrel.** Everything else under `core/` is internal and free to refactor inside a compatibility level.
9. **Plugin data removal is never automatic.** Disabling a plugin leaves its tables and grants intact; purging is an explicit operator-run `db/uninstall.sql`.

## Implementation sequence

### Phase 0: Compatibility contract — DONE

`COMPATIBILITY.md` defines future external plugin repo expectations, permission/table naming, and explicitly gates plugin work on Core being operational and tested.

### Phase 1: App foundation hygiene — DONE

Package scripts (`build`, `typecheck`, validators), `.env.example`, `DEVELOPMENT.md`, isolated mock data.

### Phase 2: Supabase environment contract — DONE

Browser-safe and server-only client helpers, documented public vs server-only variables, isolated service-role module.

Required public variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`.
Required server-only variables: `SUPABASE_SERVICE_ROLE_KEY`.

### Phase 3: Initial schema and seed data — DONE

Tables: `core_workspaces`, `core_profiles`, `core_memberships`, `core_roles`, `core_brand_settings`. Seeds: one workspace, owner/admin/member/viewer system roles, one default branding row. RLS enabled from the first migration. Validation via `npm run db:validate`.

### Phase 4: Auth and profile bootstrap — DONE (magic-link era), REWORKED in Phase 4b

Sign-in/sign-out, callback handling, idempotent profile bootstrap, first-owner membership bootstrap, protected app routes, pending-access state.

### Phase 4b: Email + password auth rework — IN PROGRESS (this slice)

Goal: make email + password the primary auth method (issue #39) with graceful error handling (issue #26).

Tasks:

1. Sign-in page: email + password via `signInWithPassword` (no email sent on login).
2. Sign-up path: `signUp` with email confirmation support, optional display name.
3. Password recovery: `resetPasswordForEmail` → recovery callback → set-password page.
4. Invite acceptance: invite email link → callback → set-password page → active membership on bootstrap.
5. Callback route supports `signup` and `recovery` token types alongside `invite`/`magiclink` (legacy links keep working).
6. Branded, repo-owned email templates for invite, recovery, and confirmation (alongside the existing magic-link template).
7. Map Supabase password-auth error codes (`invalid_credentials`, `email_not_confirmed`, `weak_password`, `user_already_exists`, rate limits) to safe, specific user-facing messages.

Validation:

- `npm run auth:validate`
- sign-in never sends email; recovery and invite flows still deliver branded emails
- every auth failure surfaces a distinct, safe error message

Deployment note: hosted Supabase Auth config (templates, password policy) requires `supabase config push` from an authenticated CLI session or the dashboard — the repo carries the config as source of truth.

### Phase 5: Membership, role, and permission helpers — DONE

Role keys, permission constants, role-to-permission mapping, server-side helpers (`ensureCoreSession`, live grant map in `core/permissions/grants.ts`), permission-gated server actions.

### Phase 6: RLS policies — DONE

RLS on all core tables, private helper functions (`core_is_active_member`, `core_current_profile_id`, `core_current_member_has_permission`), active-member read policies, security-definer RPCs for privileged writes, service role kept exceptional.

### Phase 6b: Editable role grants — DONE (PR #44)

`core_role_permissions` is the live source of truth; owners toggle grants from Settings → Roles via `core_set_role_permission`. Owner immutable, structural permissions locked, admin-tier RPCs re-gated on live grants. Revoked invites no longer resurface as pending access (issue #43).

### Phase 7: Persist core settings — IN PROGRESS (this slice)

Goal: replace the remaining mock settings with real workspace-scoped data.

Tasks:

1. Read workspace metadata (name, slug, created) from `core_workspaces` on Home and Settings → Workspace.
2. Update workspace name/slug via a permission-gated RPC (`workspace.manage`).
3. Read/update branding (brand name, logo URL, primary color token) from `core_brand_settings` via a permission-gated RPC (`branding.manage`).
4. Wire Home to live member counts; remove `lib/mock-data.ts` from the app entirely.
5. Server-side validation for all write actions (length, slug format, color format).

Validation:

- settings render from Supabase data
- workspace and branding writes persist and re-render
- unauthorized users cannot write settings (RPC denies, not just hidden UI)

### Phase 8: Audit posture — IN PROGRESS (this slice)

Goal: record privileged actions now that they exist.

Implemented events:

```text
workspace.updated
branding.updated
member.invited
member.role_changed
member.disabled
member.removed
role_permission.changed
```

Direction: a `core_audit_events` table written by the settings RPCs server-side and by the app layer for service-role flows (invites). Owners/admins can read the trail; Home surfaces recent activity. Audit is observability, not enforcement.

### Phase 9: Plugin readiness review — the Core completion gate

Goal: verify Core is ready before any plugin repo or example plugin exists.

Tasks:

1. Confirm Core is operational with Supabase: auth (password + invite + recovery), membership lifecycle, permission editing, settings persistence, audit trail.
2. Run all validators (`db:validate`, `auth:validate`, `members:validate`, `permissions:validate`) plus `typecheck` and `build`.
3. Apply pending migrations and hosted auth config to the live Supabase project.
4. Reconcile implementation with `COMPATIBILITY.md`.
5. Update `CORE_READINESS_REVIEW.md` with the completion status and declare the gate open (or list what blocks it).

Exit criteria for starting plugin work:

- all validators and builds green
- migrations applied to the live project without error
- an owner can: sign in with a password, invite a member, edit a role grant, rename the workspace, update branding, and see each action in the audit trail (`TESTING.md` is the script)
- `Example_Plugin` explicitly approved as the next validation step

### Phase 10: Plugin host primitives — SHIPPED (integration proof pending)

Goal: give Core the minimal machinery that makes the `core-v0` contract real, so the
`Example_Plugin` template (built in its own repo from `PLUGIN_TEMPLATE_HANDOVER.md`)
can be installed as the contract's proof.

Groundwork merged earlier: migration `20260704200000` widened the permission/audit
key constraints so `plugin.{plugin_id}.{action}` keys and `plugin.{id}.{event}`
audit actions are storable, and DB-side checks (`core_current_member_has_permission`)
already resolve plugin keys from the live grant map.

Shipped (each piece is specified in `COMPATIBILITY.md`):

1. `core/plugins/manifest.ts` — the `WinningOSPluginManifest` type + the
   `plugin.{id}.{action}` key guard (mirrors the `20260704200000` constraint).
2. `config/plugins.ts` — the empty-by-default install registry; the ONLY file a
   deployment edits to install a plugin. Stays `[]` in the framework repos.
3. `/p/[plugin]/[[...segments]]` host route — resolves manifest route tables
   (exact keys win over `[param]` keys); 404s for unregistered ids and
   unmatched paths; inherits the (app) layout's auth/membership guard.
4. Navigation: `core/plugins/navigation.ts` computes the permission-gated
   "Plugins" sidebar group server-side from the live grant map; the client
   sidebar receives serializable items and resolves icon names via the curated
   `lib/plugin-icons.ts` map (unknown names fall back to Puzzle).
5. Settings → Plugins tab: lists installed plugins; mounts manifest settings
   panels (permission-gated, rendered server-side and passed as a ReactNode).
6. `core/plugins/api.ts` — the sanctioned import barrel: session, plugin
   permission helper, Supabase clients, audit logger, UI kit. Server-first
   (`server-only`) and type-compatible with the template's core-stub (the
   Button wrapper accepts the stub's `"default"` size as an alias for `"md"`).
7. `roleHasPluginPermission` + `getPluginPermissionNamespaces` (live grant map
   without the Core-catalog filter; owner always allowed, errors deny); the
   Roles grid grows a "Plugins" group of editable grants and
   `setRolePermission` accepts registered plugin keys (the RPC re-enforces).
8. Migration `20260704210000` grants `private.core_current_profile_id()`
   EXECUTE to authenticated — the template's insert policy
   (`author_profile_id = private.core_current_profile_id()`) needs it;
   `db:validate`'s policy-helper allowlist grew accordingly.
9. `npm run plugins:validate` — host invariants (barrel surface parity with the
   core-stub, registry/host-route/nav/settings wiring) plus per-installed-plugin
   contract checks that activate in deployment repos: barrel-only imports,
   permission/table namespace ownership, RLS in creating migrations, no `core_`
   DDL, no slug resolution, `dependsOn` targets registered earlier, cross-plugin
   FKs limited to declared `publicTables`.

Remaining validation: create a scratch deployment repo (a third repo cloned from
Core — plugins never install into this repo or the template repo; see the
three-repository model in `COMPATIBILITY.md`), install the template plugin
there, run the acceptance checklist, verify disable-level removal, then
approve real plugins.

## Known deferred items (post-Core backlog)

- custom SMTP for invite/recovery volume (issue #39 follow-up; config-only)
- hosted Supabase auth config push (requires `SUPABASE_ACCESS_TOKEN`; issue #19)
- audit writes moved inside the member RPCs (today: app-layer, best-effort)
- workspace archive/delete flows behind `workspace.delete`

## Review gates

Before adding plugin code, confirm:

- `COMPATIBILITY.md` exists — done
- Core is operational and tested — Phase 9 gate
- core schema is stable enough to extend — after Phase 7/8 migrations merge
- plugin security expectations documented — done
- plugin permission and navigation contribution rules documented — done
- `Example_Plugin` explicitly approved as the next validation step — pending
