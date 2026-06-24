# WinningOS Core Readiness Review

## Purpose

This document records what is present, what changed after recent PRs, and what is still missing before WinningOS Core implementation should proceed.

It is intentionally a review artifact. It should be updated or retired once the implementation contract is accepted and the first backend PRs begin.

## Current repo status

Recently merged work includes:

- initial Core charter and agent-agnostic rules
- Core architecture/data/security documentation
- frontend wireframe handoff documentation
- simplified Core frontend wireframe
- removal of extra workspace switching assumptions
- removal of the single sign-on setting from the workspace settings section

Current product direction:

```text
one deployed WinningOS Core instance = one workspace
Core = user management + base system + plugin-ready foundation
Agent/chat = future plugin territory
```

This is now a core constraint, not just a frontend simplification.

## What is solid enough to build on

### 1. Core identity

The repo clearly states that WinningOS is:

- agent-agnostic as a development/repo principle
- source-owned
- Supabase-backed
- build-time modular
- not generic SaaS
- not a runtime plugin marketplace

### 2. Single-workspace scope

The single-workspace Core v0.1 decision is directionally captured.

Important rule:

- no workspace switcher
- no workspace creation UI
- no multi-workspace admin
- future cross-workspace behavior belongs in explicit export/integration plugins or a separate receiving Core style

### 3. Stricter Core scope

Core should be strictly the base system:

- auth/session foundation
- profiles
- members
- roles
- permissions
- workspace settings
- branding/theme tokens
- app shell/navigation
- plugin-ready boundaries

Core should not contain:

- agent/chat UI
- provider selectors
- provider API key storage
- model-provider abstractions
- business workflows

### 4. Frontend shape

The current wireframe gives a good initial Core shell:

```text
/
/home
/members
/settings
```

Primary navigation is intentionally minimal.

### 5. Security posture

The docs correctly emphasize:

- Supabase Auth owns identity
- RLS protects data
- permissions protect actions
- UI hiding is not security
- service role key never reaches the browser
- future plugins must not bypass Core boundaries

## Gaps found during review

### 1. Some docs still described the repo as pre-app-code

`README.md` and `AGENTS.md` were written during the first docs-only phase. After the frontend wireframe merged, they needed to acknowledge that the repo now has a static app scaffold/wireframe.

Action in this PR:

- update phase language from pure definition phase to implementation-contract phase
- remove stale “first slice only” framing from agent instructions

### 2. Core docs treated Agent/chat as a Core primitive

`CORE.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY.md`, and the wireframe docs treated provider-neutral Agent/chat functionality as part of Core.

That created premature scope:

- agent settings
- provider selection
- chat preview
- provider secrets
- chat permissions
- agent-specific schema candidates

Action in this PR:

- remove Agent/chat from Core responsibilities
- move Agent/chat to future plugin territory
- remove Agent settings UI from the wireframe
- remove agent/provider permissions and mock data
- remove agent/provider schema candidates from the implementation contract

### 3. Data model still had multi-workspace residue

`DATA_MODEL.md` had language suggesting multiple workspaces should remain possible and still listed an open question about enforcing exactly one workspace.

Action in this PR:

- resolve the one-workspace question for Core v0.1
- clarify that any future multi-workspace behavior is not part of Core v0.1
- keep table names workspace-based without adding workspace-switching UX

### 4. Frontend brief no longer matched the simplified UI

The older V0 brief asked for separate Dashboard, Roles & Permissions, Branding, Agent, and Settings nav items. The accepted wireframe is now Home, Members, and Settings, with no Agent section.

Action in this PR:

- update the frontend brief to match the accepted simplified shell
- preserve roles/branding details as Settings sections
- remove Agent/chat/provider requirements

### 5. Backend implementation order was not explicit enough

The repo had conceptual architecture but not a concrete order for implementation.

Action in this PR:

- add `IMPLEMENTATION_PLAN.md`
- define phases from app foundation through Supabase, auth, RLS, settings persistence, audit posture, and compatibility

### 6. Supabase contract needed implementation-level detail

The conceptual data model was not enough to write safe migrations.

Action in this PR:

- add `SUPABASE_CONTRACT.md`
- define initial tables, deferred tables, env vars, client boundaries, bootstrap behavior, RLS expectations, and migration conventions
- explicitly exclude Agent/chat/provider tables from Core v0.1

### 7. Routes needed permission/data mapping

The wireframe had screens, but implementation needs a map from routes to auth, data, and permissions.

Action in this PR:

- add `ROUTE_MAP.md`
- map each current route/section to future permission and data boundaries
- explicitly defer Agent/chat/provider routes to future plugins

## Still missing after this PR

These should be the next pieces after the implementation contract is reviewed.

### 1. Compatibility contract

Needed file:

```text
COMPATIBILITY.md
```

Purpose:

- define future build-time plugin boundaries
- define what plugins may import/use
- define what plugins must not mutate
- define table naming conventions for plugins
- define navigation contribution rules
- define plugin permission registration rules
- define compatibility validation expectations

This should happen before any plugin code or plugin skeletons.

### 2. Environment example

Needed file:

```text
.env.example
```

Purpose:

- document required public Supabase variables
- document server-only variables
- avoid leaking secrets

This belongs in the first implementation groundwork PR, not necessarily this docs-only PR.

### 3. Local setup guide

Potential file:

```text
DEVELOPMENT.md
```

Purpose:

- install dependencies
- run local dev server
- build
- configure Supabase locally/remotely
- explain expected validation commands

This can be paired with `.env.example`.

### 4. Supabase migration folder

Potential path:

```text
supabase/migrations/
```

This should wait until the schema contract is accepted.

### 5. Permission helper API

Potential path later:

```text
core/permissions/
```

Still needs exact TypeScript shape before implementation.

### 6. Auth/bootstrap decision

Still needs explicit product decision:

```text
How does the first owner get created?
```

Recommended direction:

- avoid silently making any arbitrary first login the owner in production
- prefer explicit bootstrap command or protected setup path

### 7. Plugin compatibility before Agent work

Before Agent/chat functionality returns, decide:

- how plugins register routes/navigation
- how plugins register permissions
- where plugin-specific tables live
- how plugin RLS policies are validated
- how plugin secrets are stored
- how plugin UI is reviewed and included at build time

## Recommended next PR after this one

After this documentation/wireframe PR is reviewed and merged, the next PR should be small implementation groundwork:

```text
chore: add Supabase environment contract
```

Suggested scope:

- `.env.example`
- `DEVELOPMENT.md`
- Supabase client helper skeletons
- no migrations yet
- no real auth flow yet
- no plugin work
- no agent/chat work

## Review questions

Before merging implementation work, answer:

1. Is the table list in `SUPABASE_CONTRACT.md` correct for Core v0.1?
2. Should first-owner bootstrap be command-based or setup-route-based?
3. Should the database enforce one workspace or should app/bootstrap logic enforce it for now?
4. Should audit events be deferred until after the first privileged write actions?
5. Should `COMPATIBILITY.md` be the next docs PR before the first Supabase code PR?
