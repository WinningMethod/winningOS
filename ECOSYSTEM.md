# Plugin Ecosystem Roles — Tables, Apps, Viewers, Bridges

`COMPATIBILITY.md` defines the mechanics of cross-plugin reuse (`dependsOn`,
`publicTables`, slots/modules, install/uninstall order). This document
defines the **roles** plugin repositories play, so every new repo knows what
kind of thing it is before its first commit. The roles fall out of one
principle:

> **Each data domain has exactly one source of truth, and the surfaces on
> top of it are replaceable.** The dataset outlives any particular way of
> looking at it — or working in it.

## The four roles

### Tables — the data owner (one per domain)

A Tables plugin owns a domain's schema and is its single source of truth.
It declares `publicTables` as the domain's stable interface; everything not
listed there is private and may change without notice. It is also the
domain's **ingestion point**: external data enters through the owner — API
syncs (`meta_tables` pulling the Graph API), webhooks, lead-form endpoints —
never through a skin.

Two flavors, distinguished by where the data comes from:

- **Synced-data owner** (e.g. `meta_tables`): an external system is the
  upstream truth and the plugin mirrors it. Writes are engine-only (service
  role behind live grant checks; **no authenticated write policies**), which
  means no other plugin can write this domain, period. Its UI is
  deliberately minimal: a raw-data browser with basic filters plus its
  admin/settings panel — the ground-truth debugging window. All product
  UX lives in Viewers.
- **User-content owner** (e.g. `crm_b2b`): users and ingestion create the
  data. Writes are user-client + RLS (edit/manage grants), which means
  **Apps can write this domain too** — see the multi-writer rule below. The
  owner ships a functional default CRUD: it is the day-one usable product,
  the ground-truth surface, and the reference implementation App authors
  copy. Deployments running a full App on top can simply leave the built-in
  UI to admins (or de-grant it).

**The multi-writer rule (load-bearing):** an owner that intends other
plugins to write its domain must enforce its semantic invariants **in the
database** — checks, FKs, triggers — never only in its own UI code.
Example: `crm_b2b`'s "deals in a won/lost stage carry `closed_at`" rule is a
trigger, so the built-in UI, a GoHighLevel-style App, and a lead-form
webhook can all move deals without drifting. If an invariant only lives in
one client's code, the domain is not actually multi-writer.

Version discipline (restating `COMPATIBILITY.md`): adding a table to
`publicTables` is a minor version; changing a public table's schema is a
major version, and every dependent pins `minVersion`.

Naming: `Winning{Domain}Tables` for synced-data owners. User-content owners
may carry a product name (`WinningCRMTablesB2B`) — the manifest role, not
the repo name, is what binds.

### App — a working surface (read/write, user-content owners only)

An App is a full product UX built on a Tables owner's data layer — think a
GoHighLevel-style CRM experience running entirely on `crm_b2b`'s tables. It
declares `dependsOn` its owner and both **reads and writes** the owner's
`publicTables`:

- Writes go through the **user client under the owner's RLS write
  policies**, gated by the owner's own edit/manage grants — exactly the
  path the owner's built-in CRUD takes. No service role, no side channel.
- Because write capability is the owner's grant, an App may **reference**
  its declared owner's permission keys read-only (capability checks that
  decide whether to render edit affordances). Registering or granting a
  foreign key stays forbidden — `plugins:validate` allows the reference
  only for `dependsOn` owners and rejects foreign keys in migrations
  unconditionally.
- An App can only exist on a **user-content owner** (authenticated write
  policies are the write path). Synced-data owners have none, so a
  "Meta App" is structurally impossible — by design.
- An App owns its **own** UI-state tables (`plugin_{app_id}_*`: saved
  views, layout preferences) but never adds columns, tables, or triggers to
  the owner's domain. If an App needs new domain fields, that is a feature
  request against the owner (or the owner's `custom` jsonb columns).
- Apps declare no `publicTables` and, like any plugin, may declare `slots`
  so Bridges can extend them (see Modules).

Multiple Apps on one owner are legal — RLS and the owner's DB-enforced
invariants keep them consistent. In practice expect one primary App per
domain per deployment plus Viewers for the read-only angles.

Naming: `Winning{Domain}App` (e.g. `WinningCRMApp`).

### Viewer — a replaceable skin (read-only, any number per owner)

A Viewer presents another plugin's data. It declares `dependsOn` its owner,
reads **only** the owner's `publicTables` under RLS, and is **strictly
read-only over them**:

- A viewer **never writes the owner's tables**. No insert, no update, no
  delete, no "just one annotations column." If that itch appears, the repo
  is an App (user-content owners) or the write belongs in the owner. A
  viewer owns at most its own small settings tables.
- A viewer declares no `publicTables` of its own.
- A viewer never talks to the owner's upstream API. `meta_viewer` cannot
  spend Meta API budget by construction; that property is the role, not an
  accident.

This is what makes viewers **replaceable and stackable**: `WinningMetaViewer`
and a future `WinningMetaViewer2` install side by side against the same
dataset and cannot corrupt it or each other. Removing a viewer removes a
way of looking at the data and nothing else.

Row visibility inside a viewer is governed by the **owner's** view grant
(RLS on the owner's tables); the viewer's own `view` permission gates its
UI. A viewer can never show more than its owner allows.

**Sidebar rule:** a Viewer declares `navRollup: { into: "{owner_id}" }` in
its manifest. The domain keeps ONE sidebar entry — the owner's (or primary
App's) — and the viewer's entries appear as its dropdown children. A
top-level sidebar entry per skin is exactly the noise the rollup contract
exists to prevent (see COMPATIBILITY.md "Navigation and settings").

Naming: `Winning{Domain}Viewer`, `Winning{Domain}Viewer2`, … — the number
is a different skin, not a version.

### Bridge — the join between two domains

A Bridge connects two (or more) Tables owners without coupling them to each
other. It declares `dependsOn` **both** owners and owns **only** the
join/attachment tables — rows that foreign-key one owner's `publicTables`
to the other's. It carries no opinion about either domain's schema.

The canonical planned example: `WinningMetaCRMBridge`, attaching
`plugin_meta_tables_campaigns` rows to `plugin_crm_b2b_companies` /
`_locations` rows. `crm_b2b` was designed for exactly this: it ships
`dependsOn: []` and exposes its entities as `publicTables`, so the bridge —
not the CRM — carries the relationship.

Bridge rules:

- FK behavior is chosen deliberately and stated in its `IMPLEMENTATION.md`.
  Default to `on delete cascade` on **both** sides: deleting a campaign or
  a company silently cleans its attachments. Use `restrict` only when a
  dangling attachment is a product-level error someone must resolve.
- Registered after both owners in `config/plugins.ts`; uninstalled before
  them (the validator enforces the ordering).
- Its own UI stays minimal: the surfaces needed to create/inspect
  attachments. Its real presentation payload ships as **Modules** (below).
- **Sidebar rule:** a Bridge that declares nav entries at all rolls them up
  with `navRollup: { into: ... }` targeting the owner it primarily extends
  (usually the one whose App/Viewer hosts its modules). Most Bridges need
  no nav entries of their own — Modules render inside their hosts. A
  top-level sidebar entry for a Bridge is a review flag.
- A bridge MAY declare its join tables as `publicTables` — that is how a
  blended viewer ("Meta performance by CRM company") gets built: it
  `dependsOn` both owners **and** the bridge, and reads all three. The
  blended viewer is still a viewer: strictly read-only over all of it.

Naming: `Winning{A}{B}Bridge` (e.g. `WinningMetaCRMBridge`).

## Modules — how a Bridge shows up inside an App or Viewer

Joined data is only useful where people already work: Meta campaign numbers
belong ON the CRM company page, not on a separate bridge page. Modules are
the sanctioned way to get them there without coupling.

- A host (App or Viewer, sometimes a Tables owner's built-in UI) declares
  named **slots** in its manifest — extension points in its pages:

  ```ts
  slots: [
    { id: "company_detail_panels", description: "Panels under the company header; context: { companyId }" },
  ]
  ```

- A contributor (typically a Bridge) declares **modules** targeting
  `{host_plugin_id}:{slot_id}`:

  ```ts
  modules: [
    {
      slot: "crm_app:company_detail_panels",
      title: "Meta campaign performance",
      component: MetaCompanyPanel,
      permission: PERMISSIONS.view, // the CONTRIBUTOR's permission
    },
  ]
  ```

- The host renders whatever is installed, permission-filtered per member,
  via the Core barrel:

  ```ts
  const panels = await resolveSlotModules("crm_app:company_detail_panels")
  // ...
  {panels.map((p) => <p.component key={p.pluginId} context={{ companyId }} />)}
  ```

Rules:

- The host documents each slot's **context shape** in its
  `IMPLEMENTATION.md`; module components receive it as the `context` prop
  and must tolerate absence (render nothing, never crash).
- A module renders only when the host is installed, the host declares the
  slot, and the member holds the module's permission. A module targeting an
  uninstalled host is **dormant** — install order between a bridge and a
  second viewer never matters.
- Modules are presentation: a module reads through its own plugin's data
  layer (RLS applies as always); it never becomes a write side-channel into
  a domain its plugin couldn't otherwise write.
- Hosts render nothing (not an empty frame) when a slot has no modules —
  slots are invisible until something fills them.
- Core wraps every module resolved through `resolveSlotModules` in an error
  boundary: a module that throws while rendering on the client degrades to a
  one-line failure note instead of crashing the host page. Boundaries only
  catch client-side errors — a module whose server-component render throws
  still fails the host route, so modules must degrade gracefully on their
  own (missing context, empty data, upstream fetch failures).
- `plugins:validate` checks slot-id format, module target format, that a
  module never targets its own plugin, and that a registered host actually
  declares any slot a module targets.

The long game: every App and Viewer that ships declares slots at its
natural extension points, and every Bridge ships its presentation as
modules. Deployments then compose — CRM App + Meta Tables + Bridge =
campaign data on company pages, no fork of anything.

## Choosing a role for a new repo

Ask in order:

1. **Does it own data no other plugin owns?** → It's a **Tables** owner.
   Decide the flavor: synced (external upstream, engine writes, minimal raw
   UI) or user-content (RLS writes, reference CRUD, DB-enforced invariants,
   ingestion endpoints).
2. **Does it let users work IN another plugin's data?** → It's an **App**
   (user-content owners only).
3. **Does it present another plugin's data without changing it?** → It's a
   **Viewer**.
4. **Does it relate two owners' data?** → It's a **Bridge**, and its
   presentation ships as Modules into host slots.

If a repo seems to need two of these roles, it is two repos. The one
sanctioned exception is baked into the definitions: a user-content Tables
owner ships its own reference CRUD.

## Rules at a glance

| | Tables (owner) | App (surface) | Viewer (skin) | Bridge (join) |
|---|---|---|---|---|
| Owns tables | the domain schema | own UI-state only | own settings only | join tables only |
| Reads | own | owner's `publicTables` | owner's `publicTables` | both owners' `publicTables` |
| Writes | own tables | owner's `publicTables` under owner RLS | own settings only | own join tables only |
| `dependsOn` | `[]` | its owner | its owner | both owners |
| `publicTables` | the stable interface | none | none | join tables (optional) |
| `slots` / `modules` | may host slots | hosts slots | hosts slots | ships modules |
| UI | synced: raw browser + settings · user-content: reference CRUD | full product UX | presentation | attach/inspect + modules |
| Sidebar nav | hosts the domain's entry (or rolls up under its App) | hosts the domain's entry | `navRollup` into owner/App | none, or `navRollup` into primary host |
| External APIs / ingestion | yes (it is the sync point) | never | never | never |
| Per domain | exactly one | few (usually one) | any number | one per relationship |

## What enforces this

Mechanics are validator-enforced today (deployment `plugins:validate`):
`dependsOn` targets registered earlier, cross-plugin FKs hitting declared
`publicTables`, table/permission namespace ownership, RLS in the creating
migration, slot/module formats and typo-guards. Write-capability is
structural: only owners with authenticated RLS write policies are writable,
and only by members holding the owner's edit/manage grants. The **role
rules themselves** — a Viewer never writing, an App never DDLing the
owner's domain, a Bridge owning only joins — are contract-by-review: every
plugin's `IMPLEMENTATION.md` states its role in the first paragraph
(alongside the compatibility level), and the acceptance review checks the
repo against that role's column above.

## The live ecosystem, mapped

| Repo | Role |
|---|---|
| `WinningMetaTables` (`meta_tables`) | Tables — synced-data owner (Meta Graph API) |
| `WinningMetaViewer` (`meta_viewer`) | Viewer — skin #1 over `meta_tables` |
| `WinningCRMTablesB2B` (`crm_b2b`) | Tables — user-content owner (reference CRUD, DB-enforced invariants, App-writable) |
| Future `WinningCRMApp` | App — GoHighLevel-style working surface on `crm_b2b` |
| Future `WinningMetaViewer2` | Viewer — skin #2, same dataset, zero contract changes |
| Future `WinningMetaCRMBridge` | Bridge — attaches Meta campaigns to CRM companies/locations; ships modules into CRM App/Viewer slots |
| Future `WinningCRMViewer` | Viewer — reporting skins over `crm_b2b` `publicTables` |
