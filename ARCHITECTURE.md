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
  Workspace actions, membership flows, permission checks, agent/chat orchestration

Domain layer
  Profiles, workspaces, memberships, roles, permissions, branding, provider abstractions

Data layer
  Supabase client/server access, SQL migrations, RLS policies, typed data access helpers

Integration layer
  Agent providers, future plugin adapters, external service boundaries
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
9. Agent/chat provider abstraction
10. Future build-time plugin boundary
11. Compatibility rules and validation conventions
12. Agent-agnostic contribution rules

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
- provider-specific integrations beyond reference adapters

Core may define extension boundaries for these, but it should not implement them directly.

## Workspace as the root operating object

The root operating object is a workspace.

A workspace represents the company-owned operating context inside a WinningOS deployment.

A deployment may start with one default workspace, but the architecture should not prevent multiple workspaces later.

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
- workspace switcher or workspace display area
- account/settings access
- theme application
- permission-aware navigation display

Future plugins may contribute navigation entries, but they must not replace the core shell.

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
chat.*
plugins.*
```

UI visibility is not security. Server-side checks and Supabase RLS must enforce access to protected data and actions.

## Agent/chat boundary

Core may provide chat or agent-facing functionality, but it must be provider-neutral.

Correct model:

```text
Core defines an AgentProvider interface.
Hermes, OpenAI, Anthropic, local agents, or custom company agents can implement adapters.
```

WinningOS should not hardcode itself to Hermes, Claude, Codex, or any one provider.

## Future plugin boundary

WinningOS will use build-time plugins.

A build-time plugin is source code included in the repo before build/deploy. It is inspected, version-controlled, validated, and deployed as part of the company OS.

Runtime plugin loading is out of scope.

Plugin implementation should wait until core architecture, data model, security model, and compatibility rules are clear.

## File direction

The future app scaffold should likely move toward this shape:

```text
app/
components/
core/
  workspace/
  profiles/
  memberships/
  permissions/
  branding/
  agent/
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
