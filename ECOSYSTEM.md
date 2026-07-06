# Plugin Ecosystem Roles — Tables, Viewers, Bridges

`COMPATIBILITY.md` defines the mechanics of cross-plugin reuse (`dependsOn`,
`publicTables`, install/uninstall order). This document defines the **roles**
plugin repositories play, so every new repo knows what kind of thing it is
before its first commit. The roles fall out of one principle:

> **Each data domain has exactly one source of truth, and presentation is
> replaceable.** The dataset outlives any particular way of looking at it.

## The three roles

### Tables — the data owner (one per domain)

A Tables plugin owns a domain's schema and is its single source of truth.
It declares `publicTables` as the domain's stable interface; everything not
listed there is private and may change without notice.

Two flavors, distinguished by where the data comes from:

- **Synced-data owner** (e.g. `meta_tables`): an external system is the
  upstream truth and the plugin mirrors it. Writes are engine-only (service
  role behind live grant checks; no authenticated write policies). Its UI is
  deliberately minimal: a **raw-data browser with basic filters plus its
  admin/settings panel — nothing more**. The raw view is the ground-truth
  debugging window when a viewer looks wrong; all product-grade UX belongs
  in viewers.
- **User-content owner** (e.g. `crm_b2b`): users type the data in, so the
  CRUD UX **is** the product and ships with the owner. Writes are
  user-client + RLS. Viewers still apply — they add the analytics and
  reporting skins (dashboards, leaderboards) on top of the owner's
  `publicTables`, never the data-entry surfaces.

Version discipline (restating `COMPATIBILITY.md`): adding a table to
`publicTables` is a minor version; changing a public table's schema is a
major version, and every dependent pins `minVersion`.

Naming: `Winning{Domain}Tables` for synced-data owners (the repo is named
for the dataset). User-content owners may carry a product name
(`WinningCRMTablesB2B`) — the manifest role, not the repo name, is what
binds.

### Viewer — a replaceable skin (any number per owner)

A Viewer presents another plugin's data. It declares `dependsOn` its owner,
reads **only** the owner's `publicTables` under RLS, and is **strictly
read-only over them**:

- A viewer **never writes the owner's tables**. No insert, no update, no
  delete, no "just one annotations column." If a viewer needs to store
  something, it owns its own small settings/preference tables
  (`plugin_{viewer_id}_*`) — nothing else.
- A viewer declares no `publicTables` of its own. Viewers are leaves;
  nothing should ever depend on a skin.
- A viewer never talks to the owner's upstream API. `meta_viewer` cannot
  spend Meta API budget by construction; that property is the role, not an
  accident.

This is what makes viewers **replaceable and stackable**. `WinningMetaViewer`
and a future `WinningMetaViewer2` can be installed side by side against the
same dataset — they cannot conflict with each other or corrupt the source of
truth, because neither can write anything the other reads. Removing a viewer
(any of the three removal levels) removes a way of looking at the data and
nothing else.

Row visibility inside a viewer is governed by the **owner's** view grant
(RLS on the owner's tables); the viewer's own `view` permission gates its UI.
A viewer can never show more than its owner allows.

Naming: `Winning{Domain}Viewer`, `Winning{Domain}Viewer2`, … — the number is
a different skin, not a version.

### Bridge — the join between two domains

A Bridge connects two (or more) Tables owners without coupling them to each
other. It declares `dependsOn` **both** owners and owns **only** the
join/attachment tables — rows that foreign-key one owner's `publicTables` to
the other's. It carries no opinion about either domain's schema.

The canonical planned example: a Meta↔CRM bridge that attaches
`plugin_meta_tables_campaigns` rows to `plugin_crm_b2b_companies` /
`_locations` rows. `crm_b2b` was designed for exactly this: it ships
`dependsOn: []` and exposes its entities as `publicTables`, so the bridge —
not the CRM — carries the relationship.

Bridge rules:

- FK behavior is chosen deliberately and stated in its `IMPLEMENTATION.md`.
  Default to `on delete cascade` on **both** sides: deleting a campaign or a
  company silently cleans its attachments. Use `restrict` only when a
  dangling attachment is a product-level error someone must resolve.
- Registered after both owners in `config/plugins.ts`; uninstalled before
  them (the validator enforces the ordering).
- UI stays minimal: the surfaces needed to create/inspect attachments.
- A bridge MAY declare its join tables as `publicTables` — that is how a
  blended viewer (e.g. "Meta performance by CRM company") gets built: it
  `dependsOn` both owners **and** the bridge, and reads all three. The
  blended viewer is still a viewer: strictly read-only over all of it.

Naming: `Winning{A}{B}Bridge` (e.g. `WinningMetaCRMBridge`).

## Choosing a role for a new repo

Ask in order:

1. **Does it own data no other plugin owns?** → It's a **Tables** owner.
   Decide the flavor: synced (external upstream, minimal raw UI) or
   user-content (CRUD UX ships with it).
2. **Does it present data another plugin owns?** → It's a **Viewer**.
   If you're tempted to let it write the owner's tables, stop — either the
   write belongs in the owner (a server action the owner ships), or you're
   actually building a Tables owner.
3. **Does it relate two owners' data?** → It's a **Bridge**.

If a repo seems to need two of these roles, it is two repos. The one
sanctioned exception is baked into the definitions: a user-content Tables
owner ships its own CRUD UX.

## Rules at a glance

| | Tables (owner) | Viewer (skin) | Bridge (join) |
|---|---|---|---|
| Owns tables | the domain schema | own settings only | join tables only |
| Writes | own tables only | own settings only | own join tables only |
| `dependsOn` | `[]` | its owner | both owners |
| `publicTables` | the stable interface | none | join tables (optional) |
| UI | synced: raw browser + settings · user-content: full CRUD | all product-grade presentation | minimal attach/inspect |
| External APIs | yes (it is the sync point) | never | never |
| Per domain | exactly one | any number | one per relationship |

## What enforces this

Mechanics are validator-enforced today (deployment `plugins:validate`):
`dependsOn` targets registered earlier, cross-plugin FKs hitting declared
`publicTables`, table/permission namespace ownership, RLS in the creating
migration. The **role rules themselves** — a viewer never writing its
owner's tables, a bridge owning only joins — are contract-by-review: every
plugin's `IMPLEMENTATION.md` must state its role in the first paragraph
(alongside the compatibility level), and the acceptance review checks the
repo against that role's row in the table above.

## The live ecosystem, mapped

| Repo | Role |
|---|---|
| `WinningMetaTables` (`meta_tables`) | Tables — synced-data owner (Meta Graph API) |
| `WinningMetaViewer` (`meta_viewer`) | Viewer — skin #1 over `meta_tables` |
| `WinningCRMTablesB2B` (`crm_b2b`) | Tables — user-content owner (ships CRUD) |
| Future `WinningMetaViewer2` | Viewer — skin #2, same dataset, zero contract changes |
| Future `WinningMetaCRMBridge` | Bridge — attaches Meta campaigns to CRM companies/locations |
| Future `WinningCRMViewer` | Viewer — reporting skins over `crm_b2b` `publicTables` |
