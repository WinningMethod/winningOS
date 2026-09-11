# Plugin portability — Core 0.2.0

Core 0.2.0 adds opt-in host mechanisms to `core-v0`. Existing canonical plugin
routes and manifests remain supported. Plugins using the additions declare
`minCoreVersion: "0.2.0"`. This is a minimum **Core release**, separate from the
compatibility level and the plugin's own version. A future incompatible API
change still requires a new compatibility level and migration instructions.

The deployment installs reviewed source at build time. There is no runtime
installer, package fetcher, database migration runner, or plugin marketplace.
Core owns identity, grants, shell rendering and dispatch; business rules and
provider engines stay in plugins. The framework registry and aliases stay empty.

## Product URLs without direct imports

A deployment may add metadata to `config/plugin-routes.ts`:

```ts
export const pluginRouteAliases: PluginRouteAlias[] = [
  { path: "/sales/companies/[id]", pluginId: "crm", route: "/companies/[id]" },
]
```

The target is an exact manifest route key. The alias and target must declare the
same parameter names. Aliases cannot shadow Core/static route roots or overlap
another alias, including static/dynamic overlaps. Catch-all alias parameters are
not supported. The alias host inherits the authenticated membership layout and
forwards route parameters/search parameters; plugin actions and RLS still enforce
feature access. Aliases do not automatically become navigation entries.

Removing the plugin from the registry makes both canonical and alias routes
return 404 for authenticated users. Alias metadata may remain dormant after
source removal; it never imports or executes an absent plugin. Reinstalling the
same compatible plugin restores it. Metadata for an installed plugin with a
missing target route fails validation. Direct plugin imports from `app/`,
`components/`, `core/` or `lib/` fail portability validation.

Deployment-specific labels and grouping can still be configured by the company.
Do not encode its departments, account IDs or business models in shared Core.

## Scheduled jobs

A plugin may declare server-only engine entrypoints:

```ts
jobs: {
  sync: { secretEnv: "PLUGIN_MY_PLUGIN_CRON_SECRET", run: runScheduledSync },
},
```

`runScheduledSync(): Promise<void>` is a bounded, idempotent engine. Wrap a
provider's summary-returning function if necessary. It owns safe audit/logging,
locking, cooldowns, batch limits and its tables' invariants. Core does not add
retries or assume that two invocations cannot overlap. No caller payload is
forwarded to the engine.

A POST-capable scheduler calls `/api/plugins/my_plugin/jobs/sync` with
`Authorization: Bearer <secret>`. Configure the secret directly in the deployment
under the declared plugin-prefixed environment name; never in a manifest or
browser. The handler returns 404 for uninstalled/unknown jobs, 503 for missing
configuration, 401 for invalid authentication, 204 on success, and a generic 500
on engine failure. Credentials and provider error bodies are not returned.

The dispatcher is Node-only with a 300-second hosting ceiling. The engine should
stop earlier to leave time for cleanup. POST scheduling must be configured by
operators; this release does **not** generate Vercel GET cron configuration.
Interactive "Sync now" actions still require Core session and live plugin grants.

Registry removal stops machine dispatch too. Removing source leaves the generic
route buildable. Data and grants are never purged as part of disable/removal.
This is application dispatch isolation, not revocation of retained database grants.

## Public code and dependency versions

Each dependency declares `minVersion`; validation checks valid semver, installed
versions, and dependency order. Prereleases compare using semver. A plugin using
Core 0.2.0 additions must state a sufficient `minCoreVersion`.

Public tables remain the data interface. For genuinely shared code, an owner may
add `publicApi: ["public/server.ts", "public/types.ts"]` (or `public/client.tsx`).
Only explicitly listed `public/server`, `public/client`, and `public/types`
entrypoints are importable by declared dependents. Consumers may not deep-import
components or server files. Public server modules must use `server-only`; client
modules must not export server facilities. The normal Next server/client build
boundary remains mandatory, including transitive imports.

Public code signatures are versioned like public schemas: incompatible changes
require a major plugin release. A public helper never bypasses the owner's live
grants or database invariants. Use slots/modules for optional presentation
integrations; adding a dashboard panel should not automatically create a mandatory
code dependency on every installed product.

## Supported shared presentation API

The server-first barrel adds `ActionForm`, `FormActionResult`, `ConfirmForm`,
`SubmitButton`, `RecordTable`, `withQueryContext`, `QueryContext`,
`QueryContextFields`, and `roleHasCorePermission`. These are generic primitives
promoted from a deployment; no business queries or source identifiers move to Core.

- `ActionForm` preserves failed drafts, shows pending/result states, and refreshes
  on confirmed success. Callers return safe messages; server actions enforce access.
  `confirmMessage`, `resetLabel`, and `guardDraft` are optional. Draft protection
  covers unload and same-origin link clicks, not every programmatic router move.
- `ConfirmForm` supplies a native client-side confirmation, not a security gate.
  Without JavaScript it has the normal form behavior.
- `RecordTable` provides desktop rows and responsive labeled cards. Callers supply
  data, links, empty/error states and authorized actions.
- Query context carries only named, short scalar values. The caller chooses the
  destination; never use form context as an authorization decision.
- `roleHasCorePermission` checks the live Core catalog and denies unknown keys.

Client plugins still receive server-rendered UI/data from their parents. This
release does not create a client-safe Core barrel or expose service credentials.

## Validation and release proof

```bash
npm ci
npm run plugins:validate
npm run plugins:test
npm run typecheck
npm run build
npm run plugins:integration -- /path/to/WinningTemplate
```

The integration command creates an isolated temporary deployment, copies only
template plugin source, installs migration **files**, checks full template/API
type assignability, runs validators/typecheck, and builds Next with the plugin
installed and its source removed. It checks disable/reinstall as well. Neither
framework checkout is populated; no `.env`, database credentials or hosting state
is copied. The command never applies SQL. Core `node_modules` must exist first. Next may fetch its existing public Google
Fonts during builds; database/provider credentials are never supplied.

Record both exact commits and results. CI runs local contract/behavior/build
gates. The separate manual paired workflow requires a read-only token able to
checkout both private repos (`WINNING_REPO_READ_TOKEN`) and explicit commit SHAs;
it never pushes branches or invokes database/provider operations.

Release additionally requires a fresh isolated Supabase project, migrations,
owner/admin/member/viewer acceptance including direct RLS writes, actual HTTP
route/job removal, and any provider integration checks. Those are **pending live
acceptance**, not implied by a passing credential-free build. Do not share a framework or
production database for this proof. See `TESTING.md`.

## Upgrading an existing deployment

1. Adopt the reviewed Core release and reconcile local deltas; preserve applied SQL.
2. Replace direct product route imports with aliases (or plugin-owned composition).
3. Replace custom cron adapters with registered jobs and update the scheduler.
4. Publish narrow public code entrypoints where needed; declare dependencies and
   versions. Reject private deep imports rather than silently keeping them working.
5. Run the scratch proof, then the isolated live acceptance before release.

This change does not migrate any existing deployment or certify its plugins.

## Deployment integration refinements

The shared UI surface also includes `FilterOptions`, `SourceBrowser` and
`DetailDrawer`. `CardTitle` accepts `as: "h2" | "h3" | "h4"` (default `h3`).
These are presentation primitives; all data, destinations and permissions remain
with callers. TypeScript configuration permits explicit `.ts` import extensions
under `noEmit` so plugin contracts tested by Node and Next use the same source.
Production import validation excludes test/spec modules; their mock loaders are
not application entrypoints. Actual runtime modules retain the strict boundary.
