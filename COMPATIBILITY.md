# WinningOS Core Compatibility Contract — `core-v0`

## Purpose

This document is the specification that WinningOS build-time plugins are built against. The first plugin template repo is built to this contract, every future plugin is built from that template, and Core validates against these rules. When this document and reality disagree, fix one of them in a reviewed PR — never silently.

Status: **Core v0.1 is code-complete.** The Phase 9 readiness gate (live migrations + the owner→viewer walkthrough in `TESTING.md`) is the last step before the plugin template repo is created. The sections below marked *Core ships in Phase 10* are the plugin-host primitives Core adds next; the template can be authored against this spec in parallel.

## The one-paragraph model

A WinningOS plugin is a folder of reviewed source code (`plugins/{plugin_id}/`) plus SQL migrations, included in a deployment **before build**. A deployment installs a plugin by adding its source and registering its manifest in exactly **one file** (`config/plugins.ts`). Core owns the shell, auth, membership, permissions, theme, and navigation; the plugin contributes routes under `/p/{plugin_id}/…`, permission strings under `plugin.{plugin_id}.*`, tables named `plugin_{plugin_id}_*`, and optional navigation/settings entries — all declared in its manifest, all enforceable without trusting the plugin's UI. Removing the registry line makes the plugin disappear from the product; deleting its data is a separate, explicit operator decision.

## Compatibility level

```text
core-v0
```

`core-v0` is a contract level, not the product version. Multiple Core releases share it until the contract itself breaks. It means:

- single-workspace Core (one deployment = one workspace, enforced by a DB constraint)
- Supabase Auth (email + password) and Postgres with RLS
- explicit permission strings resolved from the live `core_role_permissions` grant map
- security-definer RPCs and RLS as the enforcement layer; UI is never the boundary
- build-time inclusion only — no runtime loading, no marketplace, no install UI
- plugins import Core code **only** through the `core/plugins/api` barrel (*Core ships in Phase 10*)

Breaking any rule in this document is a new compatibility level (`core-v1`), announced in this file with migration notes — never a silent change. Additive changes (new API exports, new optional manifest fields) stay within `core-v0`.

## What a plugin is / is not

A plugin **is**: reviewed, version-controlled source; included before build; deployed as part of the company OS; scoped by Core auth, workspace, permission, and RLS boundaries.

A plugin **is not**: runtime-loaded code; a UI-installed marketplace extension; a remote SaaS masquerading as Core; a second app with its own identity or workspace model; a package that bypasses source review.

## Plugin identity

- `plugin_id`: lowercase `snake_case`, unique per deployment, **stable forever once released** (it is baked into table names, permission strings, URLs, and audit history).
- Display name is separate and freely changeable.
- Reserved ids: `core`, `plugin`, `plugins`, `example` may not be used by real plugins (`example_plugin` is reserved for the template itself).

## Repository shape (the template defines this)

Every plugin repo is created from the template and keeps this shape:

```text
README.md                 what it does, screenshots, status
IMPLEMENTATION.md         integration guide (contract below)
manifest.ts               the WinningOSPluginManifest export
permissions.ts            permission-string constants, typed
components/               plugin UI (client + server components)
routes/                   route components the host route mounts
server/                   server actions, data access ("server-only")
db/migrations/            001_init.sql, 002_*.sql ... (ordinals, not timestamps)
db/uninstall.sql          explicit data-removal script (never auto-run)
tests/ or scripts/        validation commands runnable in the plugin repo
```

### `IMPLEMENTATION.md` must state

1. What the plugin does.
2. `compatibility: core-v0` (and the Core commit/tag it was last verified against).
3. Exact install steps (copy/subtree command + the one-line registry edit + migration install command).
4. Required environment variables (server-only names; never `NEXT_PUBLIC_*` secrets).
5. Every table it creates and every permission it registers (must match the manifest).
6. Navigation and settings entries it requests.
7. External integrations and where their secrets live.
8. Validation commands.
9. Removal: disable / remove-source / purge-data, each spelled out.
10. Known limitations.

## The manifest (the contract's load-bearing artifact)

Core exports this type from `core/plugins/manifest.ts` (*Core ships in Phase 10*; the template mirrors it until then):

```ts
export type WinningOSPluginManifest = {
  /** Stable snake_case id. Never changes after first release. */
  id: string
  /** Human display name. */
  name: string
  /** Plugin semver. */
  version: string
  /** Compatibility level this plugin was built and verified against. */
  compatibility: "core-v0"
  /** Every permission the plugin registers. Format: plugin.{id}.{action}. */
  permissions: {
    key: `plugin.${string}.${string}`
    name: string
    description: string
    /** Default role grants seeded by the plugin's migration. */
    defaultRoles: ("owner" | "admin" | "member" | "viewer")[]
  }[]
  /** Navigation entries Core MAY render (Core decides placement/order). */
  navigation: {
    label: string
    /** Path under the plugin host: /p/{id}{path}. Use "" for the root. */
    path: string
    /** lucide-react icon name; Core resolves it, falls back to a generic icon. */
    icon: string
    /** Permission required to see the entry. */
    permission: `plugin.${string}.${string}`
  }[]
  /** Route table: path under /p/{id} → React component (server or client). */
  routes: Record<string, React.ComponentType>
  /** Optional Settings → Plugins panel. */
  settings?: {
    label: string
    permission: `plugin.${string}.${string}`
    component: React.ComponentType
  }
  /** Every table the plugin owns. Must match db/migrations exactly. */
  tables: `plugin_${string}`[]
}
```

Rules:

- The manifest is the **single source of declarations**. Validators compare it against migrations and permission constants; drift fails review.
- `routes` keys are plugin-relative (`""`, `"/new"`, `"/items/[id]"`). Core mounts them under `/p/{plugin_id}` — collisions with Core routes or other plugins are structurally impossible.
- Everything the plugin renders receives Core context via the Plugin API, not via props smuggled around the shell.

## Installation (exactly one blessed path)

1. Bring the source: copy or `git subtree add` the plugin repo into `plugins/{plugin_id}/`. (Submodules are discouraged: they complicate clones, CI, and review.)
2. Register it: add one line to `config/plugins.ts` (*Core ships this file, default empty, in Phase 10*):

```ts
import examplePlugin from "@/plugins/example_plugin/manifest"

export const installedPlugins = [examplePlugin]
```

3. Install migrations: copy each `db/migrations/NNN_*.sql` into `supabase/migrations/` as `{today}_plugin_{plugin_id}_{NNN}_{name}.sql`, then `npx supabase db push`.
4. `npm run typecheck && npm run build` plus Core validators — a compatibility mismatch is a **type error** (the manifest's `compatibility` literal must match Core's current level).

Core must never auto-fetch plugin repos, install from the UI, or execute plugin code that was not included and reviewed as deployment source.

### Why ordinal migration filenames in the plugin repo

Plugin repos number migrations `001_…`, `002_…`. The **install date** provides the timestamp when they are copied into Core. This keeps ordering correct relative to each deployment's own history (two deployments can install the same plugin years apart), and prevents cross-repo timestamp collisions. Installed migration files are never edited afterward; plugin upgrades append new ordinals.

## The Plugin API surface (*Core ships in Phase 10*)

Plugins import Core **only** from `@/core/plugins/api` — a reviewed barrel that re-exports, at minimum:

```text
ensureCoreSession            profile / membership / workspace context
pluginPermission helpers     has(sessionRole, "plugin.{id}.{action}") via live grants
createClient / service-role  Supabase access under Core conventions
logCoreAuditEvent            best-effort audit append (plugin.{id}.{event} actions)
UI kit                       components/ui/* (Button, Card, Input, ...) + theme tokens
PageContainer / PageHeader   so plugin pages match the shell
```

Everything else under `core/` is internal and may change without notice inside `core-v0`. This is the single most important future-compatibility rule: Core refactors freely behind the barrel; plugins that import around the barrel are rejected in review.

## Permissions

Format and storage:

- Key format: `plugin.{plugin_id}.{action}` — three lowercase segments. The live schema accepts this (namespace column = `plugin`); Core migration `20260704200000` widened the format constraints that previously allowed only `namespace.action`.
- Registered by the plugin's **first migration**: idempotent inserts into `core_permissions` (with `namespace = 'plugin'`) and default grants into `core_role_permissions`, using the named-constraint conflict form (see SQL template in the handover doc).
- Deny by default: no grant row → denied everywhere. Unknown keys never grant.

Enforcement:

- **Database:** plugin RLS policies and RPCs call `private.core_current_member_has_permission(workspace_id, 'plugin.{id}.{action}')` — this reads the live grant map and already works for plugin keys. Owner always holds every permission by construction.
- **App:** the Phase 10 helpers expose the same check for UI gating. UI visibility is never the boundary.
- Owners edit plugin grants in Settings → Roles exactly like Core's editable grants (the grid grows a "Plugins" group in Phase 10). Plugin permissions can never enter the structural locked set (`workspace.delete`, `members.remove`, `roles.manage`), and plugins cannot grant themselves Core permissions — their migrations may insert **only** `plugin.{their_id}.*` keys.

## Database rules

- Tables: `plugin_{plugin_id}_{table}`. Never `core_*`. The name is a convention, not a parser — identity comes from the manifest's `tables` list, never from splitting on `_`.
- Every plugin table: `workspace_id uuid not null references core_workspaces(id)` (single-workspace today, but this is what makes plugin data portable and future-proof), `created_at`/`updated_at`, RLS **enabled in the same migration that creates the table**, policies written before any app code reads it.
- Reference Core identity (`core_profiles.id`, `core_memberships.id`) — never duplicate it, never reference `auth.users` directly.
- Plugin migrations may touch, exhaustively: their own `plugin_{plugin_id}_*` objects; idempotent seed inserts into `core_permissions` / `core_role_permissions` for their own `plugin.{id}.*` keys; a `plugin-{plugin_id}` storage bucket. **Nothing else** — no ALTER on `core_*` tables, no `private` schema changes, no grants to `anon`, no touching other plugins' objects.
- SQL sharp edges the template encodes (all hit in Core's own history): policy helper functions run as the querying role; `ON CONFLICT` must use the named-constraint form inside PL/pgSQL when output columns shadow column names; qualify columns when output parameters could collide; resolve the workspace structurally (`deleted_at is null`, oldest first) — **never by slug**.

## Navigation and settings

- Core owns the shell and final rendering. Plugin nav entries come from manifests, are permission-gated per entry, render in a "Plugins" sidebar group below Core items (*Core ships in Phase 10*), and disappear automatically when the registry entry is removed.
- Plugins never: replace the shell; replace or reorder Home/Members/Settings; inject workspace switchers; add auth controls; render outside their `/p/{plugin_id}` subtree except via declared settings panels.
- Plugin settings live under `Settings → Plugins → {name}` via the manifest's `settings` entry — never as new top-level Core settings tabs, and never provider/API-key fields inside Core's Workspace/Branding sections.

## Secrets and external calls

- Plugin secrets are server-only env vars, named `PLUGIN_{PLUGIN_ID}_*` (uppercase id), documented in `IMPLEMENTATION.md`, never `NEXT_PUBLIC_*`, never imported into client components (`server-only` guards required).
- External calls that use secrets happen in `server/` code only.
- Agent/chat plugins carry the highest secret/tool-execution risk; they follow this contract like everyone else and get extra review on provider credential storage and tool boundaries.

## Removal (three explicit levels)

1. **Disable** — delete the plugin's line from `config/plugins.ts`. Routes 404, nav and settings entries vanish, Core builds and runs. Data, tables, and grants remain untouched. This must always be sufficient to "turn off" a plugin.
2. **Remove source** — also delete `plugins/{plugin_id}/`. Same runtime result; the deployment no longer carries the code.
3. **Purge data** — operator explicitly runs the plugin's `db/uninstall.sql` (drops the plugin's tables, deletes its `plugin.{id}.%` rows from `core_permissions`/`core_role_permissions`). Never automatic, never bundled into disable/remove. Audit history keeps historical `plugin.{id}.*` action strings by design.

Future-pacing rule: because routes, nav, settings, and permissions all derive from the manifest + registry line, there is exactly **one** thing to remove and nothing to forget. Orphaned grant rows after level 1/2 are harmless (deny-by-default reads them only for display) and are cleaned by level 3.

## Acceptance checklist (run against every plugin PR, starting with the template)

- [ ] Source included at build time under `plugins/{plugin_id}/`; registered in `config/plugins.ts` only.
- [ ] Stable snake_case id; not a reserved id.
- [ ] `IMPLEMENTATION.md` covers all ten required points.
- [ ] Manifest `compatibility` matches Core's current level (build fails otherwise).
- [ ] Manifest permissions/tables match `permissions.ts`, migrations, and `db/uninstall.sql` exactly (no drift).
- [ ] All routes under `/p/{plugin_id}`; no Core route or shell changes.
- [ ] All tables `plugin_{plugin_id}_*`, workspace-scoped, RLS enabled in the creating migration.
- [ ] Permission keys `plugin.{plugin_id}.*` only; deny-by-default verified; DB-side checks used in RLS/RPCs.
- [ ] Migrations only touch the allowed surface (own objects + own permission seeds + own bucket).
- [ ] Secrets server-only, `PLUGIN_{ID}_*` named, documented.
- [ ] Disable-level removal verified: registry line removed → Core builds, routes 404, nav gone, no console errors.
- [ ] `db/uninstall.sql` present and reviewed.
- [ ] Plugin validation commands pass; Core validators + typecheck + build pass with the plugin installed.

## Sequencing from here

1. Core: pass the Phase 9 live gate (`TESTING.md` walkthrough).
2. Template: build the `Example_Plugin` template repo to this spec (see `PLUGIN_TEMPLATE_HANDOVER.md`) — it can start now.
3. Core: ship Phase 10 (plugin host: manifest type, registry, host route, nav/settings integration, API barrel, plugin validators).
4. Integrate the template into a Core deployment as the contract's proof; fix whichever side is wrong.
5. Only then: real plugins (Agent, Meeting Notes remain the validation examples — Core still pre-builds none of their internals).

## Core owns forever

Auth/session boundary · single-workspace assumption · profile/membership/role models · the Core permission model and structural locked set · workspace settings · branding/theme tokens · app shell and navigation rendering · Supabase conventions · RLS expectations · service-role restrictions · this contract. Plugins extend; they never redefine.
