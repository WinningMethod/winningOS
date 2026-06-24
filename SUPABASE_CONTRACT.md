# WinningOS Supabase Contract

## Purpose

This document turns the conceptual Core data model into an implementation-facing Supabase contract.

It does not contain SQL migrations yet. It defines what the first migrations should implement and what they should avoid.

## Core assumptions

- Supabase Auth owns authenticated user identity.
- WinningOS Core owns profiles, workspace membership, roles, permissions, branding, and settings.
- One deployed WinningOS Core instance equals one workspace for v0.1.
- There is no workspace switcher, workspace creation UI, or multi-workspace admin in Core v0.1.
- Workspace-scoped data must be protected with Row Level Security.
- UI hiding is not security.
- Service-role credentials must never be exposed to browser code.

## Environment variables

Public browser-safe variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Server-only variables:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Rules:

- Public variables may be read by client components.
- Server-only variables must only be read in server-only modules.
- Service-role usage must be rare, named, and documented.
- `.env.local` must not be committed.
- `.env.example` should include placeholder values only.

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

The first schema should stay small.

Recommended initial tables:

```text
core_workspaces
core_profiles
core_memberships
core_roles
core_brand_settings
core_agent_settings
```

Deferred tables:

```text
core_permissions
core_role_permissions
core_audit_events
plugin-specific tables
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
- Core v0.1 should seed exactly one workspace.
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
chat.view
chat.use
chat.configure
plugins.view
plugins.manage
```

Rules:

- permission checks deny by default
- UI can use permission results for visibility
- server/data boundaries remain authoritative
- permission strings should be stable once used in code or policies

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
  chat.view
  chat.use
  chat.configure
  plugins.view

member
  workspace.view
  members.view
  roles.view
  branding.view
  settings.view
  chat.view
  chat.use
  plugins.view

viewer
  workspace.view
  members.view
  roles.view
  branding.view
  settings.view
  chat.view
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

## `core_agent_settings`

Stores placeholder configuration for provider-neutral chat/agent settings.

Candidate fields:

```text
id uuid primary key
workspace_id uuid not null references core_workspaces(id)
provider_key text nullable
is_enabled boolean not null default false
public_config_json jsonb not null default '{}'::jsonb
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Required constraints:

```text
unique(workspace_id)
```

Rules:

- Do not store provider API keys in `public_config_json`.
- Do not implement provider calls until the provider secret strategy is documented.
- Hermes may be a reference adapter later, but Core must remain provider-neutral.

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

RLS should be enabled on all core user/workspace tables once migrations begin.

Expected helper functions:

```sql
core_current_profile_id()
core_is_active_member(workspace_id uuid)
core_has_permission(workspace_id uuid, permission_key text)
```

Policy direction:

- profiles: users can read/update their own profile; shared workspace profile visibility requires membership joins
- workspaces: active members can read the single workspace
- memberships: active members can read; management requires elevated permissions
- roles: active members can read system roles
- brand settings: active members can read; `branding.manage` required to update
- agent settings: active members can read public config; `chat.configure` required to update public config

Do not rely on client-supplied workspace IDs without RLS/server verification.

## Bootstrap behavior

A fresh deployment should be able to bootstrap one workspace.

Bootstrap should establish:

```text
one workspace
one owner profile/membership for the first authorized user or seed path
four system roles
default brand settings row
default agent settings row, if included
```

Open implementation decision:

- whether the first authenticated user becomes owner automatically
- whether owner bootstrap requires an explicit admin seed command

Recommendation:

Do not silently make any arbitrary first login an owner in production unless deployment setup explicitly opts into that behavior. Prefer a deliberate bootstrap command or protected setup path.

## Migration conventions

Initial migration naming should be boring:

```text
YYYYMMDDHHMMSS_create_core_schema.sql
YYYYMMDDHHMMSS_seed_core_defaults.sql
```

Each migration that adds RLS should document:

- tables touched
- helper functions added
- policies added
- expected access matrix

## Non-goals for first Supabase PR

Do not include these in the first Supabase implementation PR:

- plugin tables
- meeting notes tables
- full custom role editor
- external secrets manager
- real agent provider calls
- multi-workspace tenant model
- workspace switcher
