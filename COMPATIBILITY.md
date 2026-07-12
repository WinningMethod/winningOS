# WinningOS Core Compatibility Contract — `core-v0`

## Purpose

This document is the specification that WinningOS build-time plugins are built against. The first plugin template repo is built to this contract, every future plugin is built from that template, and Core validates against these rules. When this document and reality disagree, fix one of them in a reviewed PR — never silently.

Status: **Core v0.1 is code-complete and the Phase 10 plugin host is shipped** (manifest type, registry, `/p/{plugin_id}` host route, nav/settings integration, API barrel, `plugins:validate`). The Phase 9 readiness gate (live migrations + the owner→viewer walkthrough in `TESTING.md`) and the scratch-deployment integration proof are what remain before real plugins are approved.

## The three-repository model

WinningOS separates framework from deployment. Three kinds of repositories exist, and the boundary between them is a hard rule:

1. **`WinningMethod/winningOS` — the Core framework.** Versioned, pristine, improved only through reviewed PRs. It never contains an installed plugin: no real plugin source under `plugins/`, no populated registry, no plugin migrations in its history.
2. **`WinningMethod/WinningTemplate` — the plugin template** (and every plugin repo forked from it). Also pristine framework artifacts: a plugin repo holds one plugin's source and is never deployed by itself, and the template never contains Core.
3. **Deployment repos — one per company OS (e.g. `acme-os`).** Created by cloning `winningOS`, attached to that company's own fresh Supabase project/database and hosting. **This is the only place plugins are ever installed**: plugin source is copied into `plugins/{plugin_id}/`, the registry line is added, migrations are installed, and the whole thing deploys as one reviewed system.

Consequences of the rule:

- Framework improvements flow **up** (PRs to `winningOS` / `WinningTemplate`); deployments pull Core updates **down**; plugin installs happen **only in deployments**. Nothing ever installs into the two framework repos.
- Integration testing follows the same rule: proving a plugin against Core happens in a **scratch deployment repo** (a throwaway clone of Core), never by adding plugin code to `winningOS` itself.
- `plugins/` in Core stays empty (plus the registry default of `[]`) forever; a populated `plugins/` folder is the marker of a deployment repo.
- Supabase follows the same separation: every deployment repo and scratch proof gets a fresh Supabase project. Never reuse the Core/framework project or another deployment's `.env.local`; otherwise migrations, plugin tables, permissions, users, storage, and audit events are no longer isolated.

## The one-paragraph plugin model

A WinningOS plugin is a folder of reviewed source code (`plugins/{plugin_id}/`) plus SQL migrations, included in a **deployment repo** before build. A deployment installs a plugin by adding its source and registering its manifest in exactly **one file** (`config/plugins.ts`). Core owns the shell, auth, membership, permissions, theme, and navigation; the plugin contributes routes under `/p/{plugin_id}/…`, permission strings under `plugin.{plugin_id}.*`, tables named `plugin_{plugin_id}_*`, and optional navigation/settings entries — all declared in its manifest, all enforceable without trusting the plugin's UI. Removing the registry line makes the plugin disappear from the product; deleting its data is a separate, explicit operator decision.

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
- plugins import Core code **only** through the `core/plugins/api` barrel

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

1. What the plugin does, and its ecosystem role (`ECOSYSTEM.md`: Tables owner / App / Viewer / Bridge).
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

Core exports this type from `core/plugins/manifest.ts` (the template repo mirrors it in its core-stub so plugin repos typecheck standalone):

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
  /**
   * Tables this plugin exposes as its stable interface. Other plugins may
   * read and foreign-key ONLY these. Schema changes to public tables are
   * breaking (major version). Omit/empty = nothing shared.
   */
  publicTables?: `plugin_${string}`[]
  /**
   * Plugins this plugin builds on. Dependencies must be installed first,
   * uninstalled after, and expose what this plugin uses via publicTables.
   */
  dependsOn?: { pluginId: string; minVersion: string }[]
  /**
   * Named extension points this plugin's UI offers to other plugins
   * (ECOSYSTEM.md "Modules"). Contributors target `{this_plugin_id}:{slot id}`;
   * the host renders contributions via `resolveSlotModules` and documents each
   * slot's context shape in its IMPLEMENTATION.md.
   */
  slots?: { id: string; description: string }[]
  /**
   * Components this plugin mounts into other plugins' declared slots
   * (`{host_plugin_id}:{slot_id}`). A module renders only when the host is
   * installed, declares the slot, and the member holds `permission` (owned by
   * the CONTRIBUTING plugin). How a Bridge surfaces joined data inside a host
   * App/Viewer without either side knowing the other's code.
   */
  modules?: {
    slot: string
    title: string
    component: React.ComponentType<PluginModuleProps>
    permission: `plugin.${string}.${string}`
  }[]
}
```

Rules:

- The manifest is the **single source of declarations**. Validators compare it against migrations and permission constants; drift fails review.
- `routes` keys are plugin-relative (`""`, `"/new"`, `"/items/[id]"`). Core mounts them under `/p/{plugin_id}` — collisions with Core routes or other plugins are structurally impossible. Exact keys win over `[param]` keys. Route components may optionally accept the Next-style page props Core's host forwards: `params` (a Promise resolving to the `[name]` bindings from the matched route key) and `searchParams` (Next's promise, untouched); prop-less components simply ignore them.
- Declare `tables`, `publicTables`, permission keys, `dependsOn` pluginIds, slot ids, and module slot targets as **string literals** (not computed values) — the validators read them statically, and a value they cannot read fails the build.
- A module may target a slot whose host plugin is **not installed** — it stays dormant and renders nowhere. But if the host IS registered, the slot must exist in its manifest (`plugins:validate` catches the typo). Modules never target the contributing plugin's own slots.
- Everything the plugin renders receives Core context via the Plugin API, not via props smuggled around the shell.

## Installation (exactly one blessed path)

Installation happens **in a deployment repo only** — a clone of Core owned by the deploying company (or a scratch clone for integration testing) and connected to that repo's own fresh Supabase project. Never into `WinningMethod/winningOS` or `WinningMethod/WinningTemplate` themselves, and never into a database shared with either framework repo.

1. Bring the source: copy or `git subtree add` the plugin repo's installable source into the deployment's `plugins/{plugin_id}/`. (Submodules are discouraged: they complicate clones, CI, and review.)
2. Register it: add one line to `config/plugins.ts` (Core ships this file, default empty):

```ts
import examplePlugin from "@/plugins/example_plugin/manifest"

export const installedPlugins = [examplePlugin]
```

3. Install migrations: copy each `db/migrations/NNN_*.sql` into `supabase/migrations/` as `{today}_plugin_{plugin_id}_{NNN}_{name}.sql`, verify `.env.local` points at the deployment's own Supabase project ref, then `npx supabase db push --db-url "$SUPABASE_DB_URL" --yes`.
4. `npm run typecheck && npm run build` plus Core validators — a compatibility mismatch is a **type error** (the manifest's `compatibility` literal must match Core's current level).

Core must never auto-fetch plugin repos, install from the UI, or execute plugin code that was not included and reviewed as deployment source.

### Why ordinal migration filenames in the plugin repo

Plugin repos number migrations `001_…`, `002_…`. The **install date** provides the timestamp when they are copied into Core. This keeps ordering correct relative to each deployment's own history (two deployments can install the same plugin years apart), and prevents cross-repo timestamp collisions. Installed migration files are never edited afterward; plugin upgrades append new ordinals.

## The Plugin API surface

Plugins import Core **only** from `@/core/plugins/api` — a reviewed barrel that re-exports, at minimum:

```text
ensureCoreSession            profile / membership / workspace context
pluginPermission helpers     has(sessionRole, "plugin.{id}.{action}") via live grants
createClient / service-role  Supabase access under Core conventions
logCoreAuditEvent            best-effort audit append (plugin.{id}.{event} actions)
resolveSlotModules           permission-filtered module contributions for a host slot
UI kit                       components/ui/* (Button, Card, Input, ...) + theme tokens
PageContainer / PageHeader   so plugin pages match the shell
```

Everything else under `core/` is internal and may change without notice inside `core-v0`. This is the single most important future-compatibility rule: Core refactors freely behind the barrel; plugins that import around the barrel are rejected in review (and fail `npm run plugins:validate`).

The barrel is **server-first**: it declares `server-only`, so plugin route components (server), server data modules, and server actions import it freely, but a `"use client"` module cannot. Client components in plugins receive data and UI from their server parents. If a plugin genuinely needs client-safe Core exports, that is a compatibility-level addition (a separate client barrel), not a workaround import.

## Permissions

Format and storage:

- Key format: `plugin.{plugin_id}.{action}` — three lowercase segments. The live schema accepts this (namespace column = `plugin`); Core migration `20260704200000` widened the format constraints that previously allowed only `namespace.action`.
- Registered by the plugin's **first migration**: idempotent inserts into `core_permissions` (with `namespace = 'plugin'`) and default grants into `core_role_permissions`, using the named-constraint conflict form (see SQL template in the handover doc).
- Deny by default: no grant row → denied everywhere. Unknown keys never grant.

Enforcement:

- **Database:** plugin RLS policies and RPCs call `private.core_current_member_has_permission(workspace_id, 'plugin.{id}.{action}')` — this reads the live grant map and already works for plugin keys. Owner always holds every permission by construction.
- **App:** `roleHasPluginPermission` from the barrel exposes the same check for UI gating. UI visibility is never the boundary.
- Owners edit plugin grants in Settings → Roles exactly like Core's editable grants (the grid grows a "Plugins" group when plugins are installed). Plugin permissions can never enter the structural locked set (`workspace.delete`, `members.remove`, `roles.manage`), and plugins cannot grant themselves Core permissions — their migrations may insert **only** `plugin.{their_id}.*` keys.

## Database rules

- Tables: `plugin_{plugin_id}_{table}`. Never `core_*`. The name is a convention, not a parser — identity comes from the manifest's `tables` list, never from splitting on `_`.
- Every plugin table: `workspace_id uuid not null references core_workspaces(id)` (single-workspace today, but this is what makes plugin data portable and future-proof), `created_at`/`updated_at`, RLS **enabled in the same migration that creates the table**, policies written before any app code reads it.
- Reference Core identity (`core_profiles.id`, `core_memberships.id`) — never duplicate it, never reference `auth.users` directly.
- Plugin migrations may touch, exhaustively: their own `plugin_{plugin_id}_*` objects; idempotent seed inserts into `core_permissions` / `core_role_permissions` for their own `plugin.{id}.*` keys; a `plugin-{plugin_id}` storage bucket; foreign keys **to** the `publicTables` of plugins they declare in `dependsOn`. **Nothing else** — no ALTER on `core_*` tables or other plugins' tables, no `private` schema changes, no grants to `anon`.
- SQL sharp edges the template encodes (all hit in Core's own history): policy helper functions run as the querying role; `ON CONFLICT` must use the named-constraint form inside PL/pgSQL when output columns shadow column names; qualify columns when output parameters could collide; resolve the workspace structurally (`deleted_at is null`, oldest first) — **never by slug**.

## Sharing data across plugins (dependencies)

This section defines the mechanics; `ECOSYSTEM.md` defines the repository
**roles** built on them (Tables owners, Apps, Viewers, Bridges), the
slot/module extension system, and how to pick a role for a new plugin repo.

Plugins should not recreate each other's data. A Client Changelog plugin that tracks changes to a CRM plugin's clients should reference `plugin_crm_clients` — not maintain a second client list. But undeclared cross-plugin coupling is how ecosystems rot, so reuse is allowed **only** through declared dependencies:

**Reading:**

- Any plugin may read **Core** tables through RLS — that is what RLS is for. Plugins must reference Core identity (`core_profiles`, `core_memberships`) rather than duplicate it; the same logic extends to plugin data.
- A plugin may read and foreign-key **another plugin's** tables only when (a) it lists that plugin in its manifest `dependsOn`, and (b) the target table appears in the owner's `publicTables`. Everything not in `publicTables` is that plugin's private schema and may change without notice.

**Writing:**

- Only when the owner is built for it. A Tables owner that intends other plugins to write its domain (Apps — `ECOSYSTEM.md`) says so in its `IMPLEMENTATION.md`, keeps authenticated RLS write policies as the boundary, and — the load-bearing rule — **enforces its semantic invariants in the database itself** (checks, FKs, triggers), never only in its own UI code. Writers then use the user client under the owner's RLS write policies, gated by the owner's own edit/manage grants — exactly the path the owner's built-in UI takes. With invariants in the schema, N writers (the owner's UI, Apps, ingestion endpoints) cannot drift apart.
- A writer may therefore **reference** its declared owner's permission keys read-only (e.g. `roleHasPluginPermission(role, "plugin.crm_b2b.edit")` to decide whether to render edit affordances). `plugins:validate` permits foreign permission literals only for `dependsOn` owners, and never in migrations — registration and granting stay own-namespace only.
- An owner without authenticated write policies (synced-data owners like a Meta mirror, whose writes are engine/service-role only) is not writable by other plugins, period.
- Plugins never write **Core** tables directly — Core writes go through Core's exposed server functions/RPCs, unchanged.

**Ordering and lifecycle (this is where undeclared coupling bites):**

- Dependencies are one-directional; cycles are forbidden.
- Install order: dependencies first. `config/plugins.ts` is an ordered array; `npm run plugins:validate` checks that every `dependsOn` target appears earlier in it.
- Disable order: dependents first. You cannot remove the CRM's registry line while Client Changelog is still registered — the validator fails the build, which is exactly the guardrail you want.
- Purge order: dependents' `db/uninstall.sql` run before the dependency's. The dependent chooses its FK behavior deliberately and documents it in `IMPLEMENTATION.md`: `on delete cascade` (changelog entries die with their client) or `on delete restrict` (the CRM cannot delete a client that has history — a product decision, stated out loud).
- Versioning: the dependent pins `minVersion`; the owner treats `publicTables` schema as semver-stable — breaking changes to a public table are a major version, called out in its `IMPLEMENTATION.md`.

**A gravity warning for deployment owners:** if several plugins need the same entity, that entity is drifting toward infrastructure. Rather than everyone depending on the CRM (which then can never be replaced), consider promoting the shared entity to a small data-owning plugin — e.g. a `clients` plugin whose main job is owning `plugin_clients_clients` and exposing it as public — with the CRM and the changelog both depending on it. The contract supports either shape; choose deliberately.

## Navigation and settings

- Core owns the shell and final rendering. Plugin nav entries come from manifests, are permission-gated per entry, render by default in a "Plugins" sidebar group below Core items, and disappear automatically when the registry entry is removed.
- Satellite plugins declare `navRollup: { into: "{host_plugin_id}" }` to contribute their nav entries as dropdown children of the host's primary (first visible) nav entry instead of top-level entries of their own. This is the expected shape for Viewers and Bridges orbiting an owner App — one function, ONE sidebar entry. It is a hint, not a command: Core resolves it (chains collapse to the root host; cycles, uninstalled hosts, or hosts with no visible entries fall back to top-level entries so nothing the member is entitled to disappears), each rolled entry keeps its own permission gate, and the whole cluster moves/hides as a single unit in per-user layouts.
- Members may personally rearrange the sidebar (reorder, group under custom categories, nest as dropdown children, hide into the collapsed bottom section) via `core_nav_preferences`. This is per-user presentation state owned by Core (`lib/nav-layout.ts`): it never changes what a member is permitted to see, plugins cannot read or write it, and entries a layout references reappear in their saved position when the plugin or permission returns.
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
- [ ] Migrations only touch the allowed surface (own objects + own permission seeds + own bucket + FKs to declared dependencies' public tables).
- [ ] Every cross-plugin reference targets a `publicTables` entry of a plugin listed in `dependsOn`; registry order puts dependencies first; FK delete behavior is documented; `db/uninstall.sql` ordering notes dependents-first.
- [ ] Secrets server-only, `PLUGIN_{ID}_*` named, documented.
- [ ] Disable-level removal verified: registry line removed → Core builds, routes 404, nav gone, no console errors.
- [ ] `db/uninstall.sql` present and reviewed.
- [ ] Plugin validation commands pass; Core validators + typecheck + build pass with the plugin installed.

## Sequencing from here

1. Core: pass the Phase 9 live gate (`TESTING.md` walkthrough).
2. Template: build the `Example_Plugin` template repo to this spec (see `PLUGIN_TEMPLATE_HANDOVER.md`) — it can start now.
3. Core: ship Phase 10 (plugin host: manifest type, registry, host route, nav/settings integration, API barrel, plugin validators). — **done**
4. Create a **scratch deployment repo** (third repo: clone of Core + the template's plugin source) and run the acceptance checklist there as the contract's proof; fix whichever framework repo is wrong. Neither `winningOS` nor `WinningTemplate` receives the install.
5. Only then: real plugins (Agent, Meeting Notes remain the validation examples — Core still pre-builds none of their internals).

## Core owns forever

Auth/session boundary · single-workspace assumption · profile/membership/role models · the Core permission model and structural locked set · workspace settings · branding/theme tokens · app shell and navigation rendering · Supabase conventions · RLS expectations · service-role restrictions · this contract. Plugins extend; they never redefine.
