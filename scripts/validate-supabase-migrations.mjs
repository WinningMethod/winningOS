import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const migrationsDir = "supabase/migrations"
const forbiddenPatterns = [
  /core_agent/i,
  /core_chat/i,
  /agent_provider/i,
  /provider_secret/i,
]

const requiredMigrations = [
  "20260625231000_create_core_schema.sql",
  "20260625232000_seed_core_defaults.sql",
]

const requiredTables = [
  "core_profiles",
  "core_workspaces",
  "core_roles",
  "core_memberships",
  "core_brand_settings",
]

const requiredRlsTables = [
  "public.core_profiles",
  "public.core_workspaces",
  "public.core_roles",
  "public.core_memberships",
  "public.core_brand_settings",
]

const requiredSeedRoleKeys = ["owner", "admin", "member", "viewer"]

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

const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort()

for (const requiredMigration of requiredMigrations) {
  if (!migrationFiles.includes(requiredMigration)) {
    fail(`missing migration ${requiredMigration}`)
  } else {
    pass(`found migration ${requiredMigration}`)
  }
}

for (const file of migrationFiles) {
  if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(file)) {
    fail(`migration filename is not timestamped snake_case: ${file}`)
  }
}

const migrationText = migrationFiles
  .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
  .join("\n")

for (const pattern of forbiddenPatterns) {
  if (pattern.test(migrationText)) {
    fail(`forbidden plugin/agent pattern appears in migrations: ${pattern}`)
  }
}

for (const table of requiredTables) {
  assertIncludes(
    migrationText,
    `create table if not exists public.${table}`,
    `creates ${table}`,
  )
}

for (const table of requiredRlsTables) {
  assertIncludes(
    migrationText,
    `alter table ${table} enable row level security;`,
    `enables RLS on ${table}`,
  )
}

for (const roleKey of requiredSeedRoleKeys) {
  assertIncludes(migrationText, `'${roleKey}'`, `seeds ${roleKey} role`)
}

assertIncludes(
  migrationText,
  "'00000000-0000-4000-8000-000000000001'",
  "seeds deterministic default workspace id",
)

assertIncludes(
  migrationText,
  "constraint core_brand_settings_workspace_id_key unique (workspace_id)",
  "enforces one branding row per workspace",
)

assertIncludes(
  migrationText,
  "constraint core_memberships_workspace_profile_key unique (workspace_id, profile_id)",
  "enforces one membership per profile per workspace",
)

assertIncludes(
  migrationText,
  "public.core_is_active_member",
  "defines active membership RLS helper",
)

assertIncludes(
  migrationText,
  "public.core_current_profile_id",
  "defines current profile helper",
)

assertIncludes(
  migrationText,
  "workspace_id is null",
  "keeps global role template uniqueness path explicit",
)

if (process.exitCode) {
  process.exit(process.exitCode)
}

console.log("Supabase migration contract validation passed.")
