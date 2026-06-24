# WinningOS Core v0.1 Implementation Plan

## Purpose

This document defines the next implementation sequence for WinningOS Core v0.1.

The goal is to move from a static wireframe and architecture docs into a real Supabase-backed core without losing the slow, reviewable, core-first discipline of the project.

## Current baseline

WinningOS Core has:

- agent-agnostic project rules
- core charter
- architecture, data model, and security docs
- a simplified static frontend wireframe
- one-workspace Core scope
- Vercel deployment configured for Next.js

The next phase is not plugin work. The next phase is to make the Core shell real while preserving the existing boundaries.

## Refined Core v0.1 scope

Core v0.1 should implement only the primitives needed for a single-workspace company operating system foundation.

Core v0.1 includes:

- Next.js app foundation
- Supabase project/environment contract
- Supabase Auth integration
- single-workspace bootstrap
- profile creation/lookup
- membership and role seed model
- typed permission constants
- basic server-side permission helpers
- RLS-backed data access for core tables
- persisted workspace settings
- persisted branding settings
- plugin-ready architecture boundaries

Core v0.1 does not include:

- workspace switching
- workspace creation UI
- multi-workspace management
- plugin system implementation
- meeting notes plugin
- agent/chat functionality
- provider configuration
- provider secret storage
- runtime plugin marketplace
- custom auth provider abstraction
- complex custom role editor
- billing
- business workflows
- external secrets manager integration

## Why Agent is not Core

Agent/chat functionality is valuable, but it is not a universal Core primitive.

It creates extra product and security surface:

- provider selection
- model/provider configuration
- provider API key storage
- chat/thread data
- tool execution boundaries
- audit requirements
- permission namespaces

Those belong behind the future plugin boundary. Core should be strong enough to accept an Agent plugin later, but should not ship Agent UI, Agent permissions, provider settings, or chat contracts in v0.1.

## Implementation sequence

### Phase 1: App foundation hygiene

Goal: make the existing wireframe ready for real app wiring.

Tasks:

1. Confirm package scripts work.
2. Add or fix lint/typecheck scripts if needed.
3. Confirm `.env.local` is ignored.
4. Add `.env.example` with non-secret placeholders.
5. Keep mock data isolated so it can be replaced cleanly.
6. Document local development setup.

Validation:

```bash
npm run build
```

Future validation once scripts exist:

```bash
npm run lint
npm run typecheck
```

### Phase 2: Supabase environment contract

Goal: define environment variables and client boundaries before schema work.

Tasks:

1. Add browser-safe Supabase client helper.
2. Add server-side Supabase client helper.
3. Document public vs server-only variables.
4. Ensure service role key is never imported into client components.
5. Add a local setup note for connecting a Supabase project.

Required public variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Required server-only variables:

```text
SUPABASE_SERVICE_ROLE_KEY
```

### Phase 3: Initial schema and seed data

Goal: introduce the minimum schema needed for a single-workspace Core.

Initial tables:

```text
core_workspaces
core_profiles
core_memberships
core_roles
core_brand_settings
```

Initial seed data:

```text
one workspace
owner/admin/member/viewer system roles
one default branding row
```

Important: permissions should start as typed constants in app code. Full permission and role-permission tables can wait until the permission surface is proven.

Validation:

- migration applies cleanly
- seed path creates exactly one workspace
- unique constraints prevent conflicting settings rows

### Phase 4: Auth and profile bootstrap

Goal: connect Supabase Auth to Core profile records.

Tasks:

1. Wire sign-in/sign-out path.
2. On authenticated access, ensure a `core_profiles` row exists.
3. Connect the authenticated profile to the single workspace through `core_memberships`.
4. Redirect unauthenticated users to the public entry route.
5. Keep unauthenticated UI simple; do not add real SSO until explicitly scoped.

Validation:

- unauthenticated users cannot access app routes
- authenticated users resolve to one profile
- profile bootstrap is idempotent

### Phase 5: Membership, role, and permission helpers

Goal: make access checks boring and reusable.

Tasks:

1. Define role keys: `owner`, `admin`, `member`, `viewer`.
2. Define Core permission constants.
3. Define role-to-permission mapping in code.
4. Add server-side helpers for:
   - current profile
   - current membership
   - current role
   - permission check
5. Use helpers in server-side route/page boundaries before enabling write actions.

Validation:

- each role maps to expected permissions
- permission helper denies by default
- UI can consume permission shape without becoming the security boundary

### Phase 6: RLS policies

Goal: enforce data access in Supabase, not only in UI code.

Tasks:

1. Enable RLS on core tables.
2. Add helper SQL functions where needed.
3. Add policies for active workspace members.
4. Add elevated policies for management actions.
5. Document policies beside migrations.

Validation:

- authenticated non-members cannot read workspace data
- active members can read allowed workspace data
- write actions require appropriate permissions
- service role remains exceptional and documented

### Phase 7: Persist core settings

Goal: replace mock settings with real workspace-scoped data.

Tasks:

1. Read workspace metadata from `core_workspaces`.
2. Read/update branding settings from `core_brand_settings`.
3. Keep roles mostly read-only/system seeded.
4. Add server-side validation for write actions.

Validation:

- settings render from Supabase data
- branding writes persist
- unauthorized users cannot write settings

### Phase 8: Audit posture

Goal: introduce audit logging only once real privileged actions exist.

Candidate events:

```text
workspace.updated
branding.updated
member.invited
member.disabled
role.changed
```

Audit events can be deferred until after settings writes exist.

### Phase 9: Compatibility and plugin preparation

Goal: prepare for future plugin work without building plugins yet.

Tasks:

1. Write `COMPATIBILITY.md`.
2. Define what plugins may and may not touch.
3. Define plugin table naming and RLS expectations.
4. Define how plugins contribute navigation in the future.
5. Define how plugins introduce their own permissions.
6. Use future plugins, including possible Agent or meeting-notes plugins, only as validation examples.

## First implementation PR after this contract

The next code PR after this documentation should be small.

Recommended PR:

```text
chore: add Supabase environment contract
```

Scope:

- `.env.example`
- Supabase client helper skeletons
- local setup docs
- no schema migrations yet
- no auth UI replacement yet
- no plugin work yet
- no agent/chat work yet

## Review gates

Before writing migrations, confirm:

- the single-workspace contract is accepted
- the table list is accepted
- RLS direction is accepted
- permission constants are accepted
- bootstrap behavior is accepted

Before adding plugin code, confirm:

- `COMPATIBILITY.md` exists
- core schema is stable enough to extend
- plugin security expectations are documented
- plugin permission and navigation contribution rules are documented
