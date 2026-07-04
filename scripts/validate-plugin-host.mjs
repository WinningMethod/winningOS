// Plugin host + installed-plugin contract validator (core-v0, COMPATIBILITY.md).
//
// Runs in two modes with the same assertions:
//   * Framework repo (this repo): plugins/ is absent and the registry is [] —
//     the host-invariant checks run, the per-plugin checks pass vacuously.
//   * Deployment repo (a clone of Core with plugins installed): every
//     registered plugin is checked against the contract.
//
// Like every Core validator this is executable documentation: string
// assertions that make contract rules impossible to silently regress.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

function fail(message) {
  console.error(`✗ ${message}`)
  process.exitCode = 1
}

function pass(message) {
  console.log(`✓ ${message}`)
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    fail(message)
    return
  }

  pass(message)
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8")
}

function stripSqlComments(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
}

// The registry documents the install line in a comment; parse code lines only.
function stripLineComments(source) {
  return source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
}

function collectSourceFiles(dir) {
  const files = []

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)

    if (statSync(fullPath).isDirectory()) {
      files.push(...collectSourceFiles(fullPath))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath)
    }
  }

  return files
}

// ---------------------------------------------------------------------------
// Host invariants (must hold in every repo, framework or deployment)
// ---------------------------------------------------------------------------

const manifestSource = read("core/plugins/manifest.ts")

assertIncludes(manifestSource, "export type WinningOSPluginManifest", "manifest module exports the core-v0 manifest type")
assertIncludes(manifestSource, 'compatibility: "core-v0"', "manifest type pins the core-v0 compatibility literal")

for (const field of ["permissions:", "navigation:", "routes: Record<string, React.ComponentType>", "tables:", "publicTables?:", "dependsOn?:"]) {
  assertIncludes(manifestSource, field, `manifest type declares ${field.replace(/[:?].*$/, "")}`)
}

assertIncludes(
  manifestSource,
  String.raw`/^plugin\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/`,
  "plugin permission key guard mirrors the 20260704200000 DB constraint",
)

const registrySource = read("config/plugins.ts")

assertIncludes(registrySource, "export const installedPlugins: WinningOSPluginManifest[]", "registry exports a typed installedPlugins array")

const hostRoutePath = "app/(app)/p/[plugin]/[[...segments]]/page.tsx"

if (!existsSync(join(root, hostRoutePath))) {
  fail(`plugin host route missing at ${hostRoutePath}`)
} else {
  pass(`plugin host route exists at ${hostRoutePath}`)
  const hostRouteSource = read(hostRoutePath)
  assertIncludes(hostRouteSource, "notFound()", "host route 404s unregistered plugins and unmatched paths")
  assertIncludes(hostRouteSource, "findInstalledPlugin", "host route resolves plugins through the registry")
}

const barrelSource = read("core/plugins/api.ts")

assertIncludes(barrelSource, 'import "server-only"', "API barrel is server-first (fails loudly from client modules)")

// The template's core-stub is canonical for this surface: every name plugin
// code may import must exist in the real barrel.
for (const exportedName of [
  "CoreRoleKey",
  "PluginPermissionKey",
  "CoreSession",
  "CoreSessionStatus",
  "WinningOSPluginManifest",
  "ensureCoreSession",
  "roleHasPluginPermission",
  "createClient",
  "createServiceRoleClient",
  "logCoreAuditEvent",
  "Button",
  "Card",
  "CardHeader",
  "CardTitle",
  "CardDescription",
  "CardContent",
  "Badge",
  "Input",
  "Label",
  "PageContainer",
  "PageHeader",
]) {
  if (new RegExp(`export (const|type|function)? ?\\{?[^}]*\\b${exportedName}\\b`).test(barrelSource)) {
    pass(`API barrel exports ${exportedName}`)
  } else {
    fail(`API barrel must export ${exportedName} (core-stub parity)`)
  }
}

assertIncludes(barrelSource, '"default" ? "md" : size', "API barrel Button accepts the stub's \"default\" size alias")

// Host integration points: nav group, settings tab, Roles-grid group, grant editor.
assertIncludes(read("app/(app)/layout.tsx"), "getPluginNavItems", "app layout computes the plugin nav group server-side")
assertIncludes(read("components/app/sidebar.tsx"), "pluginNavItems", "sidebar renders the plugin nav group")
assertIncludes(read("lib/plugin-icons.ts"), "?? Puzzle", "unknown manifest icon names fall back to the Puzzle icon")
assertIncludes(read("components/app/settings/settings-tabs.tsx"), '"plugins"', "settings has a Plugins tab")
assertIncludes(read("core/permissions/data.ts"), "getPluginPermissionNamespaces", "Roles grid includes installed plugin permissions")
assertIncludes(read("core/permissions/actions.ts"), "isRegisteredPluginPermission", "grant editor accepts only registered plugin keys")
assertIncludes(read("core/plugins/permissions.ts"), 'roleKey === "owner"', "plugin permission checks keep owner always-allowed")

// ---------------------------------------------------------------------------
// Installed plugins (deployment repos; vacuous while the registry is empty)
// ---------------------------------------------------------------------------

// Registry order = install order. Ids are read from the registry's manifest
// imports, e.g.: import examplePlugin from "@/plugins/example_plugin/manifest"
const registeredIds = [...stripLineComments(registrySource).matchAll(/from\s+"@\/plugins\/([a-z][a-z0-9_]*)\/manifest"/g)].map(
  (match) => match[1],
)

if (registeredIds.length === 0) {
  pass("registry is empty (pristine framework repo) — per-plugin checks skipped")
} else {
  pass(`registry lists ${registeredIds.length} plugin(s): ${registeredIds.join(", ")}`)
}

const migrationsDir = join(root, "supabase/migrations")
const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql"))

// Plugin migrations may exist only for registered plugins... is too strict —
// disable-level removal keeps installed migrations in place by design. The
// reverse must hold: a registered plugin's declared tables exist in installed
// migrations with RLS enabled.
for (const pluginId of registeredIds) {
  const pluginDir = join(root, "plugins", pluginId)

  if (!existsSync(pluginDir)) {
    fail(`registered plugin ${pluginId} has no source at plugins/${pluginId}/`)
    continue
  }

  pass(`plugin ${pluginId} source present`)

  const sourceFiles = collectSourceFiles(pluginDir)
  const sourceText = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n")

  // Only the barrel: any other @/core, @/components, @/lib, @/app import is a
  // contract violation (Core internals may change without notice).
  for (const file of sourceFiles) {
    const text = readFileSync(file, "utf8")
    const coreImports = [...text.matchAll(/from\s+"(@\/(?:core|components|lib|app|config)[^"]*)"/g)].map(
      (match) => match[1],
    )

    for (const importPath of coreImports) {
      if (importPath !== "@/core/plugins/api") {
        fail(`plugin ${pluginId} imports Core internals (${importPath}) in ${file.slice(root.length + 1)} — only @/core/plugins/api is sanctioned`)
      }
    }
  }

  pass(`plugin ${pluginId} imports Core only via @/core/plugins/api`)

  // Namespace ownership: every plugin permission/table literal in the source
  // belongs to this plugin. (Literals are the contract: tables, publicTables,
  // dependsOn, and permission keys must be written as string literals so
  // validators can read them.)
  const permissionLiterals = new Set(sourceText.match(/plugin\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*/g) ?? [])

  for (const key of permissionLiterals) {
    if (!key.startsWith(`plugin.${pluginId}.`)) {
      fail(`plugin ${pluginId} references foreign permission key ${key}`)
    }
  }

  const manifestText = readFileSync(join(pluginDir, "manifest.ts"), "utf8")
  const declaredTables = new Set(manifestText.match(/plugin_[a-z][a-z0-9_]*/g) ?? [])
  const foreignTables = [...declaredTables].filter((table) => !table.startsWith(`plugin_${pluginId}_`))

  // Foreign table names in the manifest are legitimate only as dependency
  // documentation; foreign keys are checked against publicTables below.
  const pluginMigrations = migrationFiles.filter((file) => file.includes(`_plugin_${pluginId}_`))

  if (pluginMigrations.length === 0 && declaredTables.size > 0) {
    fail(`plugin ${pluginId} declares tables but has no installed migrations (supabase/migrations/*_plugin_${pluginId}_*.sql)`)
  }

  const pluginMigrationText = stripSqlComments(
    pluginMigrations.map((file) => readFileSync(join(migrationsDir, file), "utf8")).join("\n"),
  )

  for (const table of declaredTables) {
    if (!table.startsWith(`plugin_${pluginId}_`)) {
      continue
    }

    assertIncludes(
      pluginMigrationText,
      `create table if not exists public.${table}`,
      `plugin ${pluginId} migration creates ${table}`,
    )
    assertIncludes(
      pluginMigrationText,
      `alter table public.${table} enable row level security;`,
      `plugin ${pluginId} migration enables RLS on ${table}`,
    )
  }

  if (/\b(create|alter|drop)\s+table\s+(if\s+(not\s+)?exists\s+)?(public\.)?core_/i.test(pluginMigrationText)) {
    fail(`plugin ${pluginId} migrations contain core_ table DDL — plugins never alter Core tables`)
  } else {
    pass(`plugin ${pluginId} migrations leave core_ tables alone`)
  }

  if (/slug\s*=\s*'/.test(pluginMigrationText)) {
    fail(`plugin ${pluginId} migrations resolve the workspace by slug — resolve structurally (deleted_at is null, oldest)`)
  } else {
    pass(`plugin ${pluginId} migrations never resolve the workspace by slug`)
  }

  // Dependencies: every dependsOn target is registered EARLIER (install order),
  // and cross-plugin FKs hit the owner's declared publicTables only.
  const dependsOnIds = [...manifestText.matchAll(/pluginId:\s*"([a-z][a-z0-9_]*)"/g)]
    .map((match) => match[1])
    .filter((id, index, all) => all.indexOf(id) === index)

  for (const dependencyId of dependsOnIds) {
    const dependencyIndex = registeredIds.indexOf(dependencyId)

    if (dependencyIndex === -1) {
      fail(`plugin ${pluginId} depends on ${dependencyId}, which is not registered`)
    } else if (dependencyIndex >= registeredIds.indexOf(pluginId)) {
      fail(`plugin ${pluginId} depends on ${dependencyId}, which must appear EARLIER in config/plugins.ts (install order: dependencies first)`)
    } else {
      pass(`plugin ${pluginId} dependency ${dependencyId} is registered earlier`)
    }
  }

  const foreignKeyTargets = [...pluginMigrationText.matchAll(/references\s+public\.(plugin_[a-z][a-z0-9_]*)/gi)]
    .map((match) => match[1])
    .filter((table) => !table.startsWith(`plugin_${pluginId}_`))

  for (const targetTable of foreignKeyTargets) {
    const ownerId = registeredIds.find((id) => targetTable.startsWith(`plugin_${id}_`))

    if (!ownerId) {
      fail(`plugin ${pluginId} foreign-keys ${targetTable}, which belongs to no registered plugin`)
      continue
    }

    if (!dependsOnIds.includes(ownerId)) {
      fail(`plugin ${pluginId} foreign-keys ${targetTable} without declaring dependsOn ${ownerId}`)
    }

    const ownerManifest = readFileSync(join(root, "plugins", ownerId, "manifest.ts"), "utf8")
    const publicTablesBlock = ownerManifest.match(/publicTables\s*:\s*\[([^\]]*)\]/)?.[1] ?? ""

    if (publicTablesBlock.includes(`"${targetTable}"`)) {
      pass(`plugin ${pluginId} FK target ${targetTable} is in ${ownerId}'s publicTables`)
    } else {
      fail(`plugin ${pluginId} foreign-keys ${targetTable}, which ${ownerId} does not declare in publicTables`)
    }
  }

  if (foreignTables.length > 0 && dependsOnIds.length === 0) {
    fail(`plugin ${pluginId} references foreign plugin tables (${foreignTables.join(", ")}) without any dependsOn declaration`)
  }
}

if (process.exitCode) {
  process.exit(process.exitCode)
}

console.log("Plugin host contract validation passed.")
