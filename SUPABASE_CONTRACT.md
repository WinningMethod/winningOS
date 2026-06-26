# WinningOS Supabase Contract

## Purpose

This document turns the conceptual Core data model into an implementation-facing Supabase contract.

The first schema/seed migrations now implement this contract. This document remains the implementation-facing reference for what the migrations include and what later slices must still add.

## Core assumptions

- Supabase Auth owns authenticated user identity.
- WinningOS Core owns profiles, workspace membership, roles, permissions, branding, and settings.
- One deployed WinningOS Core instance equals one workspace for v0.1.
- There is no workspace switcher, workspace creation UI, or multi-workspace admin in Core v0.1.
- Workspace-scoped data must be protected with Row Level Security.
- UI hiding is not security.
- Service-role credentials must never be exposed to browser code.
- Agent/chat/provider configuration is plugin territory, not Core v0.1.

## Environment variables

Public browser-safe variables for Next.js / `@supabase/ssr` helpers:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Server-only variables for admin helper paths:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Direct `@supabase/server` request-handler variables:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
```

Optional direct request-handler variable:

```text
SUPABASE_JWKS_URL
```

WinningOS derives the JWKS URL from `SUPABASE_URL` when `SUPABASE_JWKS_URL` is blank. If set, `SUPABASE_JWKS_URL` must share the same origin as `SUPABASE_URL`.

Rules:

- Public variables may be read by client components.
- Server-only variables must only be read in server-only modules.
- Service-role/secret-key usage must be rare, named, and documented.
- `.env.local` must not be committed.
- `.env.example` should include placeholder values only.

## Direct request-handler boundary

`@supabase/server` is the Core boundary for standard Web `Request`/`Response` handlers such as Supabase Edge Functions. WinningOS exposes `core/supabase/request-handler.ts` as the local wrapper around `withSupabase`.

Rules:

- default to `auth: "user"` for user-facing handlers
- import the request-handler boundary from server-only code only
- use the named `withWinningOS*` helpers instead of raw `withSupabase` calls
- use `ctx.supabase` for ordinary reads/writes so RLS remains the source of truth
- treat `ctx.supabaseAdmin` as an explicit admin escape hatch, not a default data path
- derive JWKS from `SUPABASE_URL` or assert that `SUPABASE_JWKS_URL` has the same origin
- for Supabase Edge Functions with `publishable`, `secret`, or `none` auth modes, set `verify_jwt = false` for that function in `supabase/config.toml`
- do not commit `SUPABASE_SECRET_KEY`

## Auth/profile bootstrap

The auth bootstrap slice introduces `public.core_bootstrap_current_user(profile_display_name text default null)` as the narrow authenticated RPC for turning a Supabase Auth user into a WinningOS Core profile/session.

Rules:

- The RPC requires `auth.uid()` and raises if called unauthenticated.
- The RPC creates or reuses the caller's `core_profiles` row.
- The RPC locks the seeded `winningos` workspace row while deciding whether the first owner should be created.
- If no active memberships exist, the caller receives the seeded workspace owner role.
- If active memberships already exist and the caller has no active membership, the caller receives a profile but no workspace access.
- The RPC is `security definer` with a fixed search path and grants execute only to `authenticated`.
- Member invitations and member-management writes remain deferred to later slices.

App route rules:

- `/sign-in` starts Supabase email OTP.
- `/auth/callback` exchanges the auth code for a session.
- `/home`, `/members`, and `/settings` require an authenticated Core session with active membership.
- `/pending-access` is the holding page for authenticated profiles without membership.

## Client boundaries

Core should eventually provide separate helpers for:

```text
browser client
server request client
service-role admin client
```

The helpers should make unsafe usage hard:

- browser client uses anon key only
- server request client uses user session context where possible
- service-role client is isolated in server-only code

## Initial schema

The first schema stays small.

Implemented initial tables:

```text
core_workspaces
core_profiles
core_memberships
core_roles
core_brand_settings
```

Deferred tables:

```text
core_permissions
core_role_permissions
core_audit_events
plugin-specific tables
```

Do not add these to Core v0.1:

```text
core_agent_settings
core_agent_providers
core_chat_threads
core_chat_messages
provider secret tables
```

Permissions should begin as typed constants in application code. Full permission tables can be added after the permission surface is proven.

## `core_workspaces`

Represents the single workspace owned by this WinningOS Core instance.

Candidate fields:

```text
id uuid primary key
name text not null
slug text not null
created_by_profile_id uuid nullable references core_profiles(id)
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
deleted_at timestamptz nullable
```

Required constraints:

- `slug` should be unique.
- Core v0.1 should seed exactly one active workspace.

Seed idempotency rules:

- The default workspace seed clears `deleted_at` if the deterministic slug already exists as a soft-deleted row.
- Role and branding seeds resolve the workspace by slug so a non-fresh development database does not fail role foreign keys because of an old manually-created workspace id.
- Deterministic seed ids are guaranteed on clean databases; non-fresh development/restored databases preserve surviving primary keys and dependent seeds resolve the workspace by slug.
- The branding seed preserves an existing `logo_url` on conflict so local resets do not wipe an uploaded logo placeholder.
- The app should not expose workspace creation or switching.

Open implementation decision:

- Whether to enforce exactly one active workspace at the database level with a singleton constraint, or to enforce it through seed/bootstrap code for v0.1.

Recommendation:

Start with one seeded workspace and no UI path to create another. Add a stronger singleton database guard only if it simplifies RLS/bootstrap rather than complicating future migrations.

## `core_profiles`

Represents a WinningOS profile connected to a Supabase Auth user.

Candidate fields:

```text
id uuid primary key
user_id uuid not null references auth.users(id)
display_name text nullable
avatar_url text nullable
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Required constraints:

```text
unique(user_id)
```

Notes:

- Profile records are user-scoped, not workspace-scoped.
- Reads of other profiles should be limited through shared active workspace membership.
- Profile bootstrap must be idempotent.

## `core_memberships`

Connects profiles to the single workspace and assigns a role.

Candidate fields:

```text
id uuid primary key
workspace_id uuid not null references core_workspaces(id)
profile_id uuid not null references core_profiles(id)
role_id uuid not null references core_roles(id)
status text not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Statuses:

```text
active
invited
disabled
removed
```

Required constraints:

```text
unique(workspace_id, profile_id)
check(status in ('active', 'invited', 'disabled', 'removed'))
```

Notes:

- Only `active` memberships should grant access.
- Invited/disabled/removed records may be visible to authorized admins but should not grant access.

## `core_roles`

Defines system roles for the workspace.

Candidate fields:

```text
id uuid primary key
workspace_id uuid nullable references core_workspaces(id)
key text not null
name text not null
description text nullable
is_system boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Initial role keys:

```text
owner
admin
member
viewer
```

Required constraints:

- system role keys must be stable
- role keys should be unique within the workspace/system template scope

Recommendation:

For v0.1, seed system roles and keep role customization read-only or deferred. Do not build custom role editing yet.

## Permission constants

Initial permissions should be typed constants in application code.

Candidate permission keys:

```text
workspace.view
workspace.manage
members.view
members.invite
members.remove
roles.view
roles.assign
roles.manage
branding.view
branding.manage
settings.view
settings.manage
plugins.view
plugins.manage
```

Rules:

- permission checks deny by default
- UI can use permission results for visibility
- server/data boundaries remain authoritative
- permission strings should be stable once used in code or policies
- plugin-specific permissions should be introduced by the plugin compatibility contract, not Core ad hoc

## Role permission mapping

Suggested v0.1 mapping:

```text
owner
  all core permissions

admin
  workspace.view
  workspace.manage
  members.view
  members.invite
  members.remove
  roles.view
  roles.assign
  branding.view
  branding.manage
  settings.view
  settings.manage
  plugins.view

member
  workspace.view
  members.view
  roles.view
  branding.view
  settings.view
  plugins.view

viewer
  workspace.view
  members.view
  roles.view
  branding.view
  settings.view
  plugins.view
```

`plugins.manage` should likely remain owner-only until plugin compatibility is formalized.

## `core_brand_settings`

Stores token-based workspace branding.

Candidate fields:

```text
id uuid primary key
workspace_id uuid not null references core_workspaces(id)
brand_name text not null
logo_url text nullable
theme_json jsonb not null default '{}'::jsonb
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Required constraints:

```text
unique(workspace_id)
```

Notes:

- `theme_json` is a storage carrier, not the component API.
- Components should consume typed theme helpers/tokens.

## Agent/plugin data boundary

Agent/chat data does not belong in the first Core schema.

If an Agent plugin is added later, it should own its plugin-specific tables and follow compatibility rules for:

- table naming
- RLS policies
- permission registration
- navigation contribution
- provider secret handling
- audit events

Core should not pre-create agent tables before the plugin boundary exists.

## Deferred `core_audit_events`

Audit logging matters, but it should arrive after real privileged actions exist.

Candidate fields later:

```text
id uuid primary key
workspace_id uuid references core_workspaces(id)
actor_profile_id uuid nullable references core_profiles(id)
event_type text not null
target_type text nullable
target_id uuid nullable
metadata_json jsonb not null default '{}'::jsonb
created_at timestamptz not null default now()
```

## RLS expectations

RLS is enabled in the initial schema migration for all core user/workspace tables.

Implemented helper functions:

```sql
private.core_current_profile_id()
private.core_is_active_member(target_workspace_id uuid)
private.core_is_active_member_of_any_workspace()
private.core_profiles_share_active_workspace(target_profile_id uuid)
```

These helpers live in the non-exposed `private` schema so they can support RLS policies without becoming public PostgREST RPC endpoints. The migration explicitly revokes private schema usage from public/anon/authenticated roles and revokes default public execute on the helper functions. The helpers are intended for RLS policy use, not direct application RPC calls. Direct grants to browser-facing roles are not allowed.

Deferred helper functions:

```sql
core_has_permission(workspace_id uuid, permission_key text)
```

Policy direction:

- profiles: users can read/update their own profile; shared workspace profile visibility requires membership joins
- workspaces: active members can read the single workspace
- memberships: active members can read active membership rows in non-deleted workspaces; invited/disabled/removed rows require later elevated management policies before any member-management UI is wired
- roles: active members can read workspace roles; authenticated users with at least one active membership can read global role templates if those are introduced later; workspace-scoped checks guard against null workspace ids explicitly
- brand settings: active members can read; `branding.manage` required to update

Do not rely on client-supplied workspace IDs without RLS/server verification. The initial policies allow active-member reads and own-profile updates; permission-aware write policies are deferred until permission helpers exist.

## Bootstrap behavior

A fresh deployment should be able to bootstrap one workspace.

Bootstrap should establish:

```text
one workspace
one owner profile/membership for the first authorized user or seed path
four system roles
default brand settings row
```

Open implementation decision:

- whether the first authenticated user becomes owner automatically
- whether owner bootstrap requires an explicit admin seed command or protected setup route

Recommendation:

Do not silently make any arbitrary first login an owner in production unless deployment setup explicitly opts into that behavior. Prefer a deliberate bootstrap command or protected setup path.

## Migration conventions

Initial migration naming is boring and timestamped:

```text
20260625231000_create_core_schema.sql
20260625232000_seed_core_defaults.sql
```

Each migration that adds RLS should document:

- tables touched
- helper functions added
- policies added
- expected access matrix

## Non-goals for first Supabase schema PR

Do not include these in the first Supabase schema PR:

- plugin tables
- meeting notes tables
- agent/chat/provider tables
- full custom role editor
- external secrets manager
- real agent provider calls
- multi-workspace tenant model
- workspace switcher
