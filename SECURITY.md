# WinningOS Core Security Model

## Purpose

This document defines the initial security posture for WinningOS Core.

Security assumptions should be explicit before application code, Supabase migrations, or plugin boundaries are implemented.

## Security stance

WinningOS Core should treat security as a core architectural boundary, not a UI feature.

The system should assume:

- users authenticate through Supabase Auth
- workspace-scoped data must be protected by Supabase Row Level Security
- UI hiding is not security
- server-side actions must verify access
- secrets must never be exposed to browser code
- future plugins must not bypass core auth or permission boundaries

## Authentication

Supabase Auth is the default authentication provider.

Core should not introduce another authentication provider unless explicitly approved.

Authentication responsibilities:

```text
Supabase Auth
  Owns authenticated user identity and session tokens

WinningOS Core
  Owns profile records, workspace memberships, roles, permissions, and app-level access decisions
```

## Authorization

Authorization should combine:

1. membership checks
2. permission checks
3. Supabase Row Level Security

The UI may hide actions a user cannot perform, but the UI must not be the only enforcement layer.

## Workspace security boundary

Workspace membership is the core access boundary.

A user should not be able to access workspace-scoped data unless they are an active member of that workspace.

Future plugin data should also be workspace-scoped unless there is a documented reason not to be.

## Roles and permissions

Roles are bundles of permissions.

Permissions are explicit action strings.

Initial system roles:

```text
owner
admin
member
viewer
```

Initial permission namespaces:

```text
workspace.*
members.*
roles.*
branding.*
settings.*
plugins.*
```

Permission checks should be used for actions, not just page visibility.

Examples:

- viewing the branding page may require `branding.view`
- updating branding settings requires `branding.manage`
- inviting a member requires `members.invite`
- changing a role requires `roles.manage`

## Row Level Security

RLS should be enabled on all user/workspace-scoped tables once Supabase migrations begin.

Expected RLS direction:

- profiles: users can read/update their own profile; limited visibility of other profiles must be derived through shared active workspace membership joins, because `core_profiles` is user-scoped and has no `workspace_id`
- workspaces: active members can read their workspace records
- memberships: active members can read relevant membership records; management requires elevated permission
- roles/permissions: active members can read role definitions; management requires elevated permission
- branding: active members can read; management requires `branding.manage`

RLS policy details should be defined with the first schema migration, not guessed prematurely. Profile visibility deserves special care because cross-profile reads cannot use a direct workspace-scoped helper without joining through memberships.

## Service role key

The Supabase service role key must never be exposed to browser code.

Rules:

- only server-side code may use service-role credentials
- service-role usage must be rare and documented
- user-facing operations should prefer user-scoped Supabase clients plus RLS
- environment variables containing service-role secrets must not use public/browser prefixes

## Environment variables

Browser-exposed variables must be clearly separated from server-only variables.

Expected browser-exposed variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Expected server-side non-secret variables:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_JWKS_URL
```

These variables are not browser-accessible in Next.js because they do not use the `NEXT_PUBLIC_` prefix. They may be used by server-side request-handler code only. `SUPABASE_JWKS_URL` is optional in WinningOS helpers; when absent, it is derived from `SUPABASE_URL`, and when present its origin must match `SUPABASE_URL`.

Expected server-only secret variables:

```text
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEY
```

Server-only and server-side-only variables must never be referenced in client components.

## Plugin and integration secrets

Core v0.1 should not store or manage agent/provider secrets.

Future plugins that integrate with external providers must document their secret strategy before implementation. Plugin credentials must not be exposed to browser code, and plugin server calls must preserve the same client/server boundary as Core.

## Audit posture

Core should eventually record important security and administrative events.

Examples:

- workspace created
- member invited
- member removed or disabled
- role changed
- branding changed
- plugin installed or removed, later

Audit logging does not need to be implemented in the first schema, but the architecture should leave room for it.

## Plugin security posture

Plugins are not implemented yet, but core security should anticipate them.

Future plugins must not:

- bypass Supabase Auth
- bypass workspace membership checks
- bypass permission checks
- expose server secrets to browser code
- create workspace-scoped tables without RLS
- mutate core tables without explicit compatibility approval

Plugin security rules will be formalized in future `COMPATIBILITY.md`.

## Client/server boundary

WinningOS will likely use Next.js, which has server and client execution contexts.

Security-sensitive operations should live server-side.

Client components may:

- render UI
- call safe server endpoints/actions
- use public Supabase anon key with RLS-protected access

Client components must not:

- contain service-role secrets
- perform privileged permission decisions alone
- directly trust user-controlled workspace IDs without server/RLS verification

## Validation expectations

When implementation begins, security-sensitive changes should include validation.

Examples:

- tests for permission helpers
- RLS policy tests where practical
- checks that required env vars are documented
- code review checklist items for server/client boundaries

## Current non-goals

Do not implement these before core schema and app scaffold exist:

- full audit event system
- custom auth provider abstraction
- complex custom role editor
- plugin security validator
- external secrets manager integration

## Security rules

- Supabase Auth owns identity.
- Workspace membership is the primary access boundary.
- Permissions protect actions.
- RLS protects data.
- UI hiding is not security.
- Service-role keys never reach the browser.
- Plugins must eventually obey the same boundaries as core.


## Direct Supabase server handlers

`@supabase/server` handlers must validate inbound credentials before handler logic runs. User-facing handlers should use `auth: "user"` and `ctx.supabase` so Row Level Security scopes database access to the caller. `ctx.supabaseAdmin` bypasses RLS and must remain an explicit server-only/admin path.

For Supabase Edge Functions using non-user auth modes (`publishable`, `secret`, or `none`), disable the platform JWT check for that specific function with `verify_jwt = false`; do not disable JWT verification globally.
