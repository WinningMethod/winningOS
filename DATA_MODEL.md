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

For Core v0.1, one deployment has one workspace. The model should stay intentionally single-workspace until a future plugin or receiving Core style is explicitly designed for cross-workspace data exchange.

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

core_nav_preferences
  Per-member personal sidebar layout (groups, nesting, hidden items)

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
core_nav_preferences
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
deleted_at timestamptz nullable
```

Notes:

- Core v0.1 seeds one default workspace per deployment.
- Workspace switching/creation is intentionally out of scope for Core v0.1.
- Future cross-workspace behavior should be handled by explicit plugins or receiving Core designs, not by adding workspace switching to Core.
- Workspace data is the primary scoping boundary for memberships, roles, branding, and future plugin data.
- `deleted_at` is a candidate soft-delete field for records that should remain auditable instead of being hard-deleted. Whether it belongs on every table should be decided with the first migration, not assumed everywhere prematurely.

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

- A profile belongs to the single instance workspace in Core v0.1.
- A workspace can have many profiles.
- Role assignment should happen through membership.
- Initial member-facing reads expose active membership rows in non-deleted workspaces only; invited/disabled/removed rows require later elevated management policies before any member-management UI is wired. Role and workspace foreign-key columns used for lifecycle checks are indexed in the initial schema.

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
- Because `workspace_id` is nullable, role-key uniqueness should be explicit in the first migration. A likely design is one partial unique index for global role templates where `workspace_id IS NULL`, and one unique index on `(workspace_id, key)` for workspace-specific roles where `workspace_id IS NOT NULL`.
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

`namespace` should mean the bare prefix before the dot, such as `workspace`, not the wildcard form `workspace.*`. Because namespace is derivable from `key`, the first implementation should either derive it in code or enforce a database check so `key` starts with `namespace || '.'`. Do not allow namespace and key to drift.

Initial permission namespaces:

```text
workspace.*
members.*
roles.*
branding.*
settings.*
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

### Implemented in Core

`core_permissions` and `core_role_permissions` are live (migration
`20260627194000_add_core_permissions.sql`). The implementation maps system roles
by their stable **text key** (`role_key`, `permission_key`) rather than uuid
foreign keys: Core's four roles are system roles identified by key, so a
key-based map avoids coupling the permission catalog to per-workspace role rows
and keeps the seed declarative. `core/permissions/catalog.ts` is the canonical
source of truth the application gates on; the migration seed mirrors it and
`scripts/validate-permissions.mjs` keeps the two in lockstep. Both tables are
RLS-protected (read-only to active members); the seed is the only writer. The
Settings → Roles view renders this catalog with live member counts. Server-side
enforcement (RPCs/RLS keyed on these tables) and custom roles remain follow-ups.

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
- `theme_json` is a storage carrier, not the long-term component API. Components should consume named core theme tokens.
- Branding is intended to be one row per workspace unless a future theme-history/versioning feature is explicitly designed. The first migration should enforce `UNIQUE(workspace_id)` so a workspace cannot accumulate conflicting active brand settings.

## `core_nav_preferences`

Stores each member's personal sidebar layout (migration
`20260710120000_add_nav_preferences.sql`).

Conceptual fields:

```text
id uuid primary key
workspace_id uuid references core_workspaces(id)
profile_id uuid references core_profiles(id)
layout_json jsonb
created_at timestamptz
updated_at timestamptz
```

Notes:

- One row per `(workspace_id, profile_id)`; absence of a row means the member
  sees the default layout (Workspace group + Plugins group).
- `layout_json` is presentation state, not authorization: it stores an ordered
  tree of nav-item keys (top-level items, user-named groups, parent items with
  dropdown children) plus a hidden list. `lib/nav-layout.ts` is the canonical
  sanitizer/reconciler; items the member cannot see are skipped at render, and
  visible items the layout never mentions are appended so nothing a member is
  entitled to can disappear.
- Reads go through RLS (own row only). Writes go through the
  `core_save_nav_preferences` definer RPC (null layout resets to default).
- Hiding an item only reduces sidebar noise — routes stay reachable and
  permission checks are unaffected.

## Agent/plugin data boundary

Agent/chat provider data does not belong in WinningOS Core v0.1.

If an agent/chat experience is added later, it should arrive through the build-time plugin system after `COMPATIBILITY.md` defines plugin table naming, RLS expectations, navigation contribution rules, and secret handling.

Do not add `core_agent_*` tables to the initial Core schema.

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

The initial schema migration enables RLS and co-documents the helper functions and policies that depend on them. The first helper SQL functions are:

```sql
private.core_current_profile_id()
private.core_is_active_member(target_workspace_id uuid)
private.core_is_active_member_of_any_workspace()
private.core_profiles_share_active_workspace(target_profile_id uuid)
```

These helper functions live in the non-exposed `private` schema so they can support RLS without becoming public PostgREST RPC endpoints. The migration explicitly revokes private schema usage from public/anon/authenticated roles and revokes default public execute on the helper functions. They are intended for RLS policy use, not direct application RPC calls. Browser-facing roles must not receive direct execute grants for these private helpers.

Permission-aware helpers such as `core_has_permission(workspace_id uuid, permission_key text)` remain deferred until the permission-helper slice.

## Open questions

1. How does the first owner get created after Supabase Auth is wired?
2. How much role customization is needed after system roles are proven?
3. When should permission tables replace typed permission constants?

## Current recommendation

For Core v0.1:

- Use `workspace` as the root operating object.
- Start with system roles: owner, admin, member, viewer.
- Define permissions as typed string constants in code for the first implementation slice.
- Seed the four system roles and their permission mappings from code or a simple seed path.
- Defer full `core_permissions` / `core_role_permissions` database tables and role editor UI until the permission check surface is proven.
- Keep permissions explicit and string-keyed.
- Use Supabase RLS for workspace-scoped data once migrations begin.


## Auth/profile bootstrap behavior

The first auth/profile bootstrap slice keeps the table model unchanged and adds a focused RPC boundary:

- authenticated users get a `core_profiles` row tied to `auth.users.id`
- the first authenticated profile becomes owner of the seeded `winningos` workspace if no active memberships exist
- later authenticated profiles can exist without workspace membership and are routed to pending access
- member invitations and membership-management writes are intentionally deferred

This preserves the Core v0.1 rule that one deployed Core instance equals one workspace while avoiding automatic membership grants after the first owner exists.
