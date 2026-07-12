# Handover: Building the WinningOS Plugin Template Repo

You are building `Example_Plugin` — the template repository every future WinningOS plugin starts from. It lives in a **separate repo**, is built to the `core-v0` contract in `COMPATIBILITY.md`, and doubles as the working proof of that contract. Read `COMPATIBILITY.md` first; this document adds the context, code templates, and sharp edges you can't see from the contract alone.

## What Core is, in five sentences

WinningOS Core is a single-workspace, Supabase-backed Next.js 16 (App Router) app: email+password auth, profiles, memberships, four system roles (owner/admin/member/viewer), an owner-editable live permission grant map, persisted workspace + branding settings (three theme colors and a logo that restyle the whole shell), and an append-only audit trail. Every privileged write goes through a SECURITY DEFINER RPC or the service role; RLS guards every read; the UI is never the boundary. One deployment = one workspace, enforced by a unique index — the workspace is always resolved structurally ("the single active workspace"), never by slug. Permissions are strings resolved from `core_role_permissions` at runtime; owner always holds everything; unknown keys deny. String-assertion validator scripts (`npm run *:validate`) act as executable documentation and must stay green.

## What exists for you today vs. what lands with Core Phase 10

Available now (usable while authoring the template):

- The `core-v0` contract (`COMPATIBILITY.md`) — your requirements document.
- DB acceptance of `plugin.{plugin_id}.{action}` permission keys and `plugin.{id}.{event}` audit actions (Core migration `20260704200000`).
- DB-side permission checking that already works for plugin keys: `private.core_current_member_has_permission(workspace_id, 'plugin.example_plugin.view')` reads the live grant map with no catalog filter. Your RLS policies and RPCs can use it verbatim.
- The four-role model, seeded permission idioms, audit table, and every SQL convention shown below.

Shipped with Core Phase 10 (the plugin host):

- `core/plugins/manifest.ts` (`WinningOSPluginManifest` — the template mirrors this interface in its core-stub),
- `config/plugins.ts` registry + the `/p/[plugin]` host route + nav/settings integration,
- `@/core/plugins/api` barrel (the only sanctioned Core import path; server-first — client components receive data/UI from their server parents),
- app-side plugin permission helpers and the Roles-grid "Plugins" group,
- `npm run plugins:validate` — checks installed plugins against their manifests (barrel-only imports, key/table namespacing, RLS in creating migrations, dependsOn registry order, publicTables FK targets).

With Phase 10 shipped, the remaining proof is one real install into a **scratch deployment repo** — a third repo created by cloning Core and attached to its own fresh Supabase project; never into `WinningMethod/winningOS`, the template repo, or either repo's database — fixing whichever framework side is wrong. That integration run is the contract's proof (three-repository model in `COMPATIBILITY.md`).

## Template repo requirements

Follow the repository shape in COMPATIBILITY.md exactly. The example plugin itself should be deliberately boring — a workspace-scoped "Notes"-style list (create/view/manage) is ideal because it exercises every contract surface (table, RLS, three permissions, nav entry, settings panel, audit events) with zero business complexity. Name it `example_plugin`; its point is to be copied.

Beyond the shape, the template must include:

1. **A `CREATING_A_PLUGIN.md`** — step-by-step "fork this template" guide: rename checklist (plugin_id appears in folder name, manifest, permissions.ts, every migration, uninstall.sql, env var prefix), then the acceptance checklist from COMPATIBILITY.md copied in as the PR gate. The guide's manifest walkthrough must cover the sidebar rule: a satellite plugin (Viewer, Bridge, Connector — anything orbiting a domain owner) declares `navRollup: { into: "{host_id}" }` so its nav entries roll up under the host's primary entry instead of adding top-level sidebar noise; only the domain's primary plugin (its Tables owner or App) hosts a top-level entry.
2. **Validation scripts** in the plugin repo (`npm run plugin:validate` style, mirroring Core's string-assertion validator pattern) that assert: manifest/permissions/migrations/uninstall stay in lockstep; every table in the manifest appears in a migration with `enable row level security`; no `NEXT_PUBLIC_` secret names; no `core_` table DDL; no slug-based workspace resolution; ON CONFLICT uses named constraints inside plpgsql.
3. **`IMPLEMENTATION.md`** filled in for the example plugin itself — all ten required points, so template users have a worked example, not a blank form.

## SQL templates (copy these idioms exactly)

### Permission registration (first migration, after creating tables)

```sql
-- Register this plugin's permissions. Idempotent; only plugin.example_plugin.* keys.
insert into public.core_permissions (key, name, description, namespace)
values
  ('plugin.example_plugin.view',   'View Example',   'See example plugin data.',            'plugin'),
  ('plugin.example_plugin.create', 'Create Example', 'Create example plugin records.',      'plugin'),
  ('plugin.example_plugin.manage', 'Manage Example', 'Edit or delete any example records.', 'plugin')
on conflict on constraint core_permissions_key_unique do update
  set name = excluded.name, description = excluded.description, namespace = excluded.namespace;

-- Default grants. Owners hold everything by construction; seed the rest.
insert into public.core_role_permissions (role_key, permission_key)
select r.role_key, g.permission_key
from (values
  ('plugin.example_plugin.view',   array['admin', 'member', 'viewer']),
  ('plugin.example_plugin.create', array['admin', 'member']),
  ('plugin.example_plugin.manage', array['admin'])
) as g(permission_key, roles)
cross join lateral unnest(g.roles) as r(role_key)
on conflict on constraint core_role_permissions_pkey do nothing;
```

### Table + RLS (same migration that creates the table)

```sql
create table if not exists public.plugin_example_plugin_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.core_workspaces(id) on delete cascade,
  author_profile_id uuid not null references public.core_profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plugin_example_plugin_notes_title_not_blank check (length(trim(title)) > 0)
);

create or replace trigger plugin_example_plugin_notes_touch_updated_at
before update on public.plugin_example_plugin_notes
for each row execute function public.core_touch_updated_at();

alter table public.plugin_example_plugin_notes enable row level security;

create policy "Members with view can read example notes"
  on public.plugin_example_plugin_notes for select to authenticated
  using (private.core_current_member_has_permission(workspace_id, 'plugin.example_plugin.view'));

create policy "Members with create can insert their own example notes"
  on public.plugin_example_plugin_notes for insert to authenticated
  with check (
    private.core_current_member_has_permission(workspace_id, 'plugin.example_plugin.create')
    and author_profile_id = private.core_current_profile_id()
  );
-- update: author-or-manage pattern, same helpers.
-- delete: manage-only — the permission named for an action gates it at EVERY
-- layer; RLS must never be wider than the app-layer check (template issue #6).
```

Note: `private.core_current_member_has_permission`, `private.core_is_active_member`, and `private.core_current_profile_id` are all EXECUTE-granted to `authenticated` (Core learned this the hard way — RLS policy expressions run as the querying role; the profile-id grant shipped with Phase 10 in migration `20260704210000` exactly because the insert policy above needs it). Use these three helpers verbatim; never grant additional `private.*` helpers from a plugin migration — that is a Core-side decision enforced by Core's `db:validate` allowlist.

### Uninstall script (`db/uninstall.sql`, operator-run only)

```sql
-- Explicit, destructive, never run automatically. Level-3 removal per COMPATIBILITY.md.
drop table if exists public.plugin_example_plugin_notes;
delete from public.core_role_permissions where permission_key like 'plugin.example_plugin.%';
delete from public.core_permissions where key like 'plugin.example_plugin.%';
-- Audit history intentionally retains plugin.example_plugin.* action strings.
```

## Cross-plugin data (build this into the template's manifest and docs)

Plugins reuse data instead of recreating it, through **declared dependencies** (full rules in COMPATIBILITY.md "Sharing data across plugins"): manifest `dependsOn` + the owner's `publicTables` gate all cross-plugin reads and foreign keys; writes only via the owner's exposed server functions; registry order = install order (dependencies first, dependents removed first). The template must:

- include `publicTables` and `dependsOn` in its mirrored manifest type,
- declare its own example table in `publicTables` (so the template demonstrates *being* a dependency),
- leave `dependsOn: []` with a commented example (`{ pluginId: "crm", minVersion: "1.0.0" }`),
- document in `CREATING_A_PLUGIN.md` when to depend on another plugin vs. when a shared entity deserves its own small data-owning plugin.

## Sharp edges (every one of these caused a real Core bug — encode them in the template's validators and docs)

1. **RLS helper privileges**: policy expressions execute as the querying role. If a policy calls a function the `authenticated` role can't EXECUTE (or in a schema without USAGE), every read of that table 500s with `permission denied for schema private` (#46/#47). Only use the already-granted helpers listed above.
2. **`ON CONFLICT` inside PL/pgSQL**: the column-inference form is subject to variable substitution; if output columns share names with the conflict columns you get `column reference is ambiguous` **at runtime only** (#49). Always `on conflict on constraint {name}`.
3. **Output-parameter shadowing**: qualify every column reference in plpgsql bodies whose functions declare same-named output columns (Core hit this twice more before #49).
4. **Never resolve the workspace by slug** — it is owner-editable and renaming it took the whole app down once (#52). Resolve structurally: `where deleted_at is null order by created_at asc limit 1`.
5. **Server-action body limits**: file uploads above Next's default 1 MB action body limit crash before your validation runs (#57). Core raised its limit to 6 MB and validates client-side first; plugin upload features must do both.
6. **Statically-valid SQL still fails live**: none of Core's environments could execute migrations during review; #49 shipped because of it. The template must state loudly: run migrations against a real Supabase project before tagging a release.
7. **Auth/session context**: get user context from `ensureCoreSession()` only. Never read `auth.users` directly, never cache role keys across requests, never trust a role passed from the client.
8. **Error surfacing**: follow Core's pattern — safe kebab-case codes in query params, human messages in the page, raw errors only in server logs. No vendor names, no user input reflected.
9. **Live grants, not constants**: permission checks must read the live grant map (owners edit grants at runtime). Never bake "admin can X" into plugin logic; ask the map.
10. **Additive migrations only**: never edit a shipped migration file; upgrades append new ordinals. Uninstall is a separate script, never a migration.
11. **RLS wider than the app gate is a hole, not a convenience**: the first live acceptance run (template issue #6) shipped an author-or-manage delete policy while manifest, UI, and server action all treated `manage` as the delete permission — a member deleted rows straight through RLS with the anon client. Gate every action on the SAME permission at UI, server, and RLS; the widest layer is the real boundary.

## Ordering and definition of done

1. Scaffold the template repo to the contract shape; mirror the manifest type.
2. Build the example feature end-to-end (routes/components/server/db) against the SQL templates above.
3. Write the plugin-repo validators and `CREATING_A_PLUGIN.md`.
4. When Core Phase 10 merges: create a scratch deployment repo (clone Core into a new third repo), create a fresh Supabase project for that repo, install the template's plugin source there (copy source, one registry line, install migrations, db push), and run Core's acceptance checklist. Never install into the Core or template framework repos, and never point the scratch repo at a framework/deployment database. File issues against whichever framework repo violates the contract — the contract wins arguments; PRs change the contract.
5. Done when: the acceptance checklist passes on a live deployment, disable-level removal is verified (delete the registry line → Core builds, `/p/example_plugin` 404s, nav entry gone), and a second agent can produce a new working plugin from the template by following `CREATING_A_PLUGIN.md` without asking questions.

## House style, briefly

Small reviewable PRs mapped to a plan doc; explicit and boring over clever; comments explain constraints, not narration; docs are agent-agnostic (any agent or human must be able to work from repo files alone); every behavioral rule gets a validator assertion so it can't silently regress. Match Core's tone in all documents — calm, declarative, no marketing.
