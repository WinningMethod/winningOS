# WinningOS Core Architecture

## Purpose

This document defines the first architectural boundaries for WinningOS Core.

WinningOS Core is the stable operating layer for custom company operating systems. It should be small, explicit, and durable. Business-specific workflows belong outside core.

## Architectural stance

WinningOS is:

- agent-agnostic
- Supabase-backed
- source-owned
- build-time modular
- company-deployment oriented
- designed for future plugins, but not plugin-first

WinningOS is not:

- a generic SaaS product
- a centralized multi-tenant marketplace
- a runtime plugin host
- tied to one AI provider or coding agent

## Core layers

WinningOS Core should be organized around stable layers.

```text
User interface layer
  App shell, navigation, layout, settings surfaces, theme usage

Application layer
  Workspace actions, membership flows, permission checks, settings actions

Domain layer
  Profiles, workspaces, memberships, roles, permissions, branding, plugin readiness

Data layer
  Supabase client/server access, SQL migrations, RLS policies, typed data access helpers

Integration layer
  Future plugin adapters and external service boundaries
```

The layers are conceptual. They do not require premature abstraction, but they should guide file placement and responsibility.

## Core responsibilities

WinningOS Core owns:

1. Workspace model
2. Profile model
3. Membership model
4. Role and permission model
5. Supabase integration conventions
6. Auth/session boundary
7. App shell and core navigation
8. Branding and theme tokens
9. Future build-time plugin boundary
10. Compatibility rules and validation conventions
11. Agent-agnostic contribution rules

## Core non-responsibilities

WinningOS Core must not own business-specific workflows.

Examples that do not belong in core:

- meeting notes
- CRM
- project management
- billing
- analytics
- documents
- automations
- industry workflows
- agent/chat experiences, provider configuration, or model-provider integrations

Core may define extension boundaries for these, but it should not implement them directly.

## Workspace as the root operating object

The root operating object is a workspace.

A workspace represents the company-owned operating context inside a WinningOS deployment.

For Core v0.1, a deployment has exactly one workspace. The architecture should not include workspace switching or multi-workspace management in the Core shell. Future cross-workspace data exchange should be modeled as explicit plugin/export behavior or a separate receiving Core style.

Use workspace language in core APIs, database tables, permissions, and documentation unless a more specific domain concept is clearly needed.

## Supabase boundary

Supabase is the default backend foundation.

Core should use Supabase for:

- authentication
- Postgres persistence
- Row Level Security
- storage later, if needed
- realtime later, if needed

Core should not hide Supabase behind a generic database abstraction before requirements prove that is needed.

Instead, core should provide clear Supabase conventions:

- browser-safe client creation
- server-side client creation
- service-role usage restrictions
- migration naming
- RLS policy expectations
- environment variable naming

## App shell boundary

Core owns the global application shell.

The app shell includes:

- root authenticated layout
- sidebar or primary navigation
- topbar/header area
- static workspace display area
- account/settings access
- theme application
- permission-aware navigation display

Future plugins may request navigation entries through the compatibility contract, but they must not replace the core shell. Satellite plugins (Viewers, Bridges, Connectors orbiting a domain owner) declare `navRollup: { into: "{host_id}" }` so a whole function stays one sidebar entry — see COMPATIBILITY.md "Navigation and settings" and the sidebar rules in ECOSYSTEM.md. Members can additionally rearrange, group, and hide entries per-user (`core_nav_preferences`); neither mechanism changes what a member is permitted to see.

## Branding and theme boundary

Core owns theme tokens and branding primitives.

Branding should be token-based, not scattered through one-off component styles.

Core should eventually define tokens for:

- brand name
- logo
- color palette
- radius
- typography
- light/dark mode behavior

Future modules should consume core theme tokens.

In early implementations, `theme_json` may act as a pragmatic storage carrier for theme values. That JSON should not become the long-term programming interface. Core should evolve toward strongly typed theme token helpers so components consume named tokens rather than raw arbitrary JSON.

## Permission boundary

Core owns the permission system.

Permissions should be explicit strings grouped by namespace.

Initial core namespaces may include:

```text
workspace.*
members.*
roles.*
branding.*
settings.*
plugins.*
```

UI visibility is not security. Server-side checks and Supabase RLS must enforce access to protected data and actions.

## Agent/plugin boundary

Agent and chat functionality are plugin territory, not Core v0.1.

Core may eventually allow a build-time plugin to contribute agent/chat routes, settings, permissions, and provider integrations. Until `COMPATIBILITY.md` defines that plugin boundary, Core should not include:

- agent settings sections
- provider selectors
- chat previews
- agent-specific permissions
- provider API key handling
- model-provider abstractions

This keeps Core focused on user management, workspace settings, branding, permissions, and plugin readiness.

## Future plugin boundary

WinningOS will use build-time plugins.

A build-time plugin is source code included in a deployment before build/deploy. A plugin may eventually come from a separate GitHub repository, but it is not runtime-loaded; it is inspected, version-controlled, validated, and deployed as part of the company OS.

Runtime plugin loading is out of scope.

Plugin implementation should wait until core architecture, data model, security model, compatibility rules, and the operational Supabase-backed Core are complete and tested.

## File direction

An example expected Next.js app structure may eventually move toward this shape:

```text
app/
components/
core/
  workspace/
  profiles/
  memberships/
  permissions/
  branding/
  plugins/
  supabase/
config/
supabase/
  migrations/
scripts/
tests/
```

This is directional, not final. Do not scaffold all folders before they are useful.

## Architecture rules

- Keep core small.
- Prefer explicit contracts over clever abstractions.
- Do not add business workflows to core.
- Do not add plugin machinery before core is stable enough to support it.
- Do not require any specific AI agent to understand or maintain the repo.
- Do not introduce runtime plugin assumptions without explicit approval.
- Document architectural decisions before implementation when they affect future plugins or data boundaries.
