# WinningOS Core Route Map

## Purpose

This document maps the implemented Core surfaces to their authentication, data, and permission boundaries.

The route map prevents backend work from drifting away from the product surface and prevents UI routes from implying permissions that do not exist.

## Routing principles

- Routes reflect the single-workspace Core scope.
- Routes do not accept arbitrary workspace IDs in URLs for Core v0.1.
- The active workspace is the instance workspace, not a user-selected tenant.
- UI visibility is not security; security-definer RPCs and RLS enforce access.
- Settings contains sections/tabs without becoming separate backend concepts prematurely.
- Agent/chat routes are plugin territory and do not exist in Core v0.1.

## Current route inventory

```text
/                    public entry, links to sign-in/sign-up
/sign-in             email + password sign-in
/sign-up             account creation (first account becomes owner)
/forgot-password     password reset request
/set-password        choose a password (invite acceptance + recovery)
/auth/callback       Supabase auth link handling (code, token_hash, hash tokens)
/auth/sign-out       same-origin POST sign-out
/pending-access      authenticated, waiting for membership
/home                workspace home (protected)
/members             member management (protected)
/settings            workspace / roles / branding tabs (protected)
```

Shared boundaries: `app/(auth)/layout.tsx` wraps the public auth pages; `app/(app)/layout.tsx` requires an active membership via `ensureCoreSession()` and redirects to `/sign-in` or `/pending-access`.

## Public and auth routes

### `/`

Public entry. Explains WinningOS Core and links to `/sign-in` and `/sign-up`. No data, no permissions.

### `/sign-in`, `/sign-up`, `/forgot-password`

Email + password auth (issue #39). Sign-in sends no email. Sign-up may send a confirmation email; forgot-password sends a recovery email. All failures surface as safe error codes from `core/auth/errors.ts` — nothing user-supplied or vendor-internal is reflected. Authenticated visitors with an active membership are redirected to `/home`; pending users to `/pending-access`.

### `/set-password`

Requires an authenticated session (arrived via invite or recovery link, or already signed in). Updates the password via `supabase.auth.updateUser`, then redirects to `/home`.

### `/auth/callback`

Handles Supabase PKCE `code` exchange, `token_hash` verification (`invite`, `magiclink`, `recovery`, `signup`), and legacy hash-token sessions. Invite and recovery land on `/set-password`; other links land on `/home`. Only same-app relative `next` paths are followed. Expired links map to a distinct `link-expired` error.

### `/pending-access`

Authenticated users without an active membership wait here. Invited memberships are promoted to active automatically by `core_bootstrap_current_user` on the next session bootstrap.

## Authenticated app routes

### `/home`

Workspace home backed by live data: `core_workspaces` metadata, member counts from `core_list_workspace_members`, a real setup checklist, and the recent `core_audit_events` feed (visible with the live `workspace.manage` grant).

Required auth: active membership. Minimum permission: `workspace.view`.

### `/members`

Member lifecycle: invite (owner-only), role assignment, disable, remove. Buttons render from the live grant map; the RPCs (`core_set_member_role`, `core_disable_member`, `core_remove_member`) and the service-role invite flow re-enforce every action server-side. Member actions are recorded in the audit trail.

Required auth: active membership. Minimum permission: `members.view`. Action permissions: `members.invite`, `members.disable`, `members.remove`, `roles.assign`.

Data: `core_profiles`, `core_memberships`, `core_roles` via `core_list_workspace_members`.

### `/settings`

Single settings surface with three tabs (deep-linkable via `?tab=`):

- **Workspace** — name/slug read from `core_workspaces`; writes via `core_update_workspace_settings` (requires live `workspace.manage`).
- **Roles** — live permission catalog from `core_permissions` / `core_role_permissions`; owners toggle grants via `core_set_role_permission` (owner immutable, structural permissions locked).
- **Branding** — brand name, logo URL, and primary color read from `core_brand_settings`; writes via `core_update_brand_settings` (requires live `branding.manage`).

Core settings must not include: Agent, Chat, provider configuration, single sign-on, plugin installation UI.

## Deferred routes

Do not add these in Core v0.1 unless explicitly scoped:

```text
/workspaces
/workspaces/[id]
/modules
/plugins
/agent
/chat
/providers
/admin/billing
/meeting-notes
/crm
/projects
/documents
/analytics
```

Future plugin routes live behind the compatibility contract, not ad hoc route additions.

## Permission summary

```text
/                         public
/sign-in|/sign-up|/forgot-password   public
/set-password             authenticated
/home                     workspace.view
/members                  members.view (+ action permissions above)
/settings                 settings.view
/settings?tab=workspace   workspace.view / workspace.manage
/settings?tab=roles       roles.view / roles.assign / roles.manage
/settings?tab=branding    branding.view / branding.manage
audit feed on /home       workspace.manage
```

## Data loading direction

Protected app routes load data server-side:

```text
server route/page boundary
  ensureCoreSession(): user -> profile -> membership (bootstrap RPC)
  check live permission grants where needed
  load route data through the user client (RLS) or permission-gated RPCs
  render client components with safe props
```

Client components render interactive UI but never own privileged decisions.

## Redirect and error states

```text
unauthenticated -> /sign-in
authenticated without profile -> profile created by bootstrap RPC
authenticated without active membership -> /pending-access
authenticated without permission -> controls hidden + server denies with safe status codes
expired/invalid email link -> /sign-in with a distinct safe error code
missing core workspace seed -> bootstrap RPC raises; error boundary renders
```
