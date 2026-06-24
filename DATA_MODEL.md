# WinningOS Core Data Model

## Purpose

This document defines the initial conceptual data model for WinningOS Core.

The goal is to agree on durable core entities before writing Supabase migrations or application code.

## Backend foundation

WinningOS Core uses Supabase as the default backend foundation.

Supabase provides:

- authentication
- Postgres database
- Row Level Security
- storage later if needed
- realtime later if needed

## Root operating object: workspace

The root operating object is a workspace.

A workspace represents the company-owned operating context inside a WinningOS deployment.

A deployment may have one default workspace at first, but the model should support multiple workspaces later without rewriting core assumptions.

## Conceptual entity model

```text
auth.users
  Supabase-owned authenticated user identity

core_profiles
  WinningOS profile connected to auth.users

core_workspaces
  Company-owned operating contexts

core_memberships
  Connect profiles to workspaces with roles/status

core_roles
  Named role definitions within a workspace or core default set

core_permissions
  Explicit permission definitions

core_role_permissions
  Join table mapping roles to permissions

core_brand_settings
  Workspace branding and theme configuration

core_agent_providers
  Optional future table for configured agent/chat providers

core_audit_events
  Optional future table for important security/activity events
```

## Table naming conventions

Core tables use the `core_` prefix.

Future plugin tables should not use the `core_` prefix.

Core table names should be boring and explicit:

```text
core_profiles
core_workspaces
core_memberships
core_roles
core_permissions
core_role_permissions
core_brand_settings
```

## `auth.users`

Owned by Supabase Auth.

Core should reference `auth.users.id` but should not attempt to replace Supabase Auth identity.

## `core_profiles`

Represents the WinningOS profile for a Supabase-authenticated user.

Conceptual fields:

```text
id uuid primary key
user_id uuid references auth.users(id)
display_name text
avatar_url text nullable
created_at timestamptz
updated_at timestamptz
```

Notes:

- `user_id` should be unique.
- Profile data should be minimal at first.
- Business-specific user attributes do not belong here unless they are universally needed.

## `core_workspaces`

Represents a company-owned operating context.

Conceptual fields:

```text
id uuid primary key
name text
slug text
created_by_profile_id uuid references core_profiles(id)
created_at timestamptz
updated_at timestamptz
```

Notes:

- A deployment may begin with one default workspace.
- Multiple workspaces should remain possible.
- Workspace data is the primary scoping boundary for memberships, roles, branding, and future plugin data.

## `core_memberships`

Connects profiles to workspaces.

Conceptual fields:

```text
id uuid primary key
workspace_id uuid references core_workspaces(id)
profile_id uuid references core_profiles(id)
role_id uuid references core_roles(id)
status text
created_at timestamptz
updated_at timestamptz
```

Possible statuses:

```text
active
invited
disabled
removed
```

Notes:

- A profile can belong to multiple workspaces.
- A workspace can have many profiles.
- Role assignment should happen through membership.

## `core_roles`

Defines named permission bundles.

Conceptual fields:

```text
id uuid primary key
workspace_id uuid nullable references core_workspaces(id)
key text
name text
description text nullable
is_system boolean
created_at timestamptz
updated_at timestamptz
```

Initial system role keys:

```text
owner
admin
member
viewer
```

Notes:

- `workspace_id` can be nullable for global system role templates if useful.
- Custom workspace-specific roles can be added later.
- Do not overbuild role customization in the first implementation.

## `core_permissions`

Defines explicit actions.

Conceptual fields:

```text
id uuid primary key
key text unique
name text
description text nullable
namespace text
created_at timestamptz
```

Initial permission namespaces:

```text
workspace.*
members.*
roles.*
branding.*
settings.*
chat.*
plugins.*
```

Example permissions:

```text
workspace.view
workspace.manage
members.view
members.invite
members.remove
roles.view
roles.manage
branding.view
branding.manage
settings.view
settings.manage
chat.use
chat.configure
plugins.view
plugins.manage
```

## `core_role_permissions`

Maps roles to permissions.

Conceptual fields:

```text
role_id uuid references core_roles(id)
permission_id uuid references core_permissions(id)
created_at timestamptz
```

Composite primary key:

```text
(role_id, permission_id)
```

## `core_brand_settings`

Stores workspace-level branding and theme settings.

Conceptual fields:

```text
id uuid primary key
workspace_id uuid references core_workspaces(id)
brand_name text
logo_url text nullable
theme_json jsonb
created_at timestamptz
updated_at timestamptz
```

Notes:

- Theme details can begin as JSON while the token model matures.
- The application should expose typed theme helpers rather than spreading raw JSON everywhere.

## Future: `core_agent_providers`

Optional future table for workspace-configured agent/chat providers.

Conceptual fields:

```text
id uuid primary key
workspace_id uuid references core_workspaces(id)
provider_key text
display_name text
config_json jsonb
is_enabled boolean
created_at timestamptz
updated_at timestamptz
```

Notes:

- This should not be implemented until the provider abstraction is designed.
- Secrets should not be stored casually in plain JSON.

## Future: `core_audit_events`

Optional future table for security and activity history.

Conceptual fields:

```text
id uuid primary key
workspace_id uuid nullable references core_workspaces(id)
actor_profile_id uuid nullable references core_profiles(id)
event_type text
target_type text nullable
target_id uuid nullable
metadata_json jsonb
created_at timestamptz
```

Notes:

- Audit events are important, but can wait until core auth and permissions exist.

## Workspace scoping rule

Any user-owned or company-owned data should be scoped to a workspace unless there is a strong reason not to.

Profile records are user-scoped.
Workspace records are operating-context-scoped.
Membership, branding, roles, permissions, and future plugin records are workspace-scoped.

## RLS direction

Row Level Security should enforce workspace membership for workspace-scoped data.

The core model should eventually provide helper SQL functions such as:

```sql
core_is_workspace_member(workspace_id uuid)
core_has_permission(workspace_id uuid, permission_key text)
```

Do not implement these before the initial schema is finalized.

## Open questions

1. Should system roles be stored in database rows from day one, or seeded from code first?
2. Should permissions be database rows from day one, or typed constants first?
3. Should each deployment enforce exactly one default workspace initially?
4. How much role customization is needed in Core v0.1?

## Current recommendation

For Core v0.1:

- Use `workspace` as the root operating object.
- Start with system roles: owner, admin, member, viewer.
- Keep permissions explicit and string-keyed.
- Prefer simple seeded roles/permissions before building a full role editor.
- Use Supabase RLS for workspace-scoped data once migrations begin.
