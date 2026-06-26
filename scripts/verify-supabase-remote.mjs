import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const envPath = ".env.local"
const requiredKeys = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_DB_PASSWORD",
]

function parseEnvFile(path) {
  const values = {}
  const text = readFileSync(path, "utf8")

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue
    }

    const [key, ...valueParts] = trimmed.split("=")
    const rawValue = valueParts.join("=").trim()
    values[key] = rawValue.replace(/^['"]|['"]$/g, "")
  }

  return values
}

function requireValue(values, key) {
  const value = values[key]?.trim()

  if (!value) {
    throw new Error(`Missing required local Supabase value: ${key}`)
  }

  return value
}

function makeDbUrl(values) {
  if (values.SUPABASE_DB_URL?.trim()) {
    return values.SUPABASE_DB_URL.trim()
  }

  const projectRef = requireValue(values, "SUPABASE_PROJECT_REF")
  const password = encodeURIComponent(requireValue(values, "SUPABASE_DB_PASSWORD"))

  return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`
}

function extractJson(stdout) {
  const start = stdout.indexOf("[")

  if (start === -1) {
    throw new Error("Supabase CLI output did not include JSON output")
  }

  return JSON.parse(stdout.slice(start))
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const values = parseEnvFile(envPath)

for (const key of requiredKeys) {
  requireValue(values, key)
}

const supabaseUrl = new URL(requireValue(values, "SUPABASE_URL"))
const configuredJwksUrl = values.SUPABASE_JWKS_URL?.trim()

if (configuredJwksUrl) {
  const jwksUrl = new URL(configuredJwksUrl)
  assert(
    jwksUrl.origin === supabaseUrl.origin,
    "SUPABASE_JWKS_URL origin must match SUPABASE_URL",
  )
}

const query = `
select jsonb_build_object(
  'tables', (
    select jsonb_agg(jsonb_build_object('table', tablename, 'rls', rowsecurity) order by tablename)
    from pg_tables
    where schemaname = 'public'
      and tablename in ('core_profiles','core_workspaces','core_roles','core_memberships','core_brand_settings')
  ),
  'workspace_count', (select count(*) from public.core_workspaces where slug = 'winningos'),
  'active_workspace_count', (select count(*) from public.core_workspaces where slug = 'winningos' and deleted_at is null),
  'role_keys', (select jsonb_agg(key order by key) from public.core_roles),
  'system_role_count', (select count(*) from public.core_roles where is_system),
  'brand_settings_count', (select count(*) from public.core_brand_settings),
  'migration_versions', (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
  'indexes', (
    select jsonb_agg(indexname order by indexname)
    from pg_indexes
    where schemaname = 'public'
      and indexname in ('core_workspaces_single_active_workspace','core_memberships_role_id_idx','core_workspaces_created_by_profile_id_idx')
  )
) as verification;
`

const stdout = execFileSync(
  "npx",
  ["supabase", "db", "query", "--db-url", makeDbUrl(values), "--output", "json", query],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
)
const [{ verification }] = extractJson(stdout)
const requiredTables = [
  "core_brand_settings",
  "core_memberships",
  "core_profiles",
  "core_roles",
  "core_workspaces",
]
const tableNames = verification.tables.map((table) => table.table)

assert(requiredTables.every((table) => tableNames.includes(table)), "Missing one or more Core tables")
assert(verification.tables.every((table) => table.rls === true), "One or more Core tables has RLS disabled")
assert(Number(verification.workspace_count) === 1, "Expected exactly one winningos workspace")
assert(Number(verification.active_workspace_count) === 1, "Expected exactly one active winningos workspace")
assert(
  JSON.stringify(verification.role_keys) === JSON.stringify(["admin", "member", "owner", "viewer"]),
  "Seeded role keys do not match expected Core defaults",
)
assert(Number(verification.system_role_count) === 4, "Expected four system roles")
assert(Number(verification.brand_settings_count) === 1, "Expected one brand settings row")
assert(
  ["20260625231000", "20260625232000"].every((version) =>
    verification.migration_versions.includes(version),
  ),
  "Missing expected Supabase migration history versions",
)
assert(
  [
    "core_memberships_role_id_idx",
    "core_workspaces_created_by_profile_id_idx",
    "core_workspaces_single_active_workspace",
  ].every((indexName) => verification.indexes.includes(indexName)),
  "Missing expected Core indexes",
)

console.log("Remote Supabase Core verification passed.")
console.log(
  JSON.stringify(
    {
      tables: verification.tables,
      workspaceCount: Number(verification.workspace_count),
      activeWorkspaceCount: Number(verification.active_workspace_count),
      roleKeys: verification.role_keys,
      systemRoleCount: Number(verification.system_role_count),
      brandSettingsCount: Number(verification.brand_settings_count),
      migrationVersions: verification.migration_versions,
      indexes: verification.indexes,
    },
    null,
    2,
  ),
)
