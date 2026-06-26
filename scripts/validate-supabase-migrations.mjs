import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, "../supabase/migrations")
const forbiddenPatterns = [
  /core_agent/i,
  /core_chat/i,
  /agent_provider/i,
  /provider_secret/i,
]

const requiredMigrations = [
  "20260625231000_create_core_schema.sql",
  "20260625232000_seed_core_defaults.sql",
  "20260626162000_add_auth_profile_bootstrap.sql",
]

const requiredTables = [
  "core_profiles",
  "core_workspaces",
  "core_roles",
  "core_memberships",
  "core_brand_settings",
]

const requiredRlsTables = requiredTables.map((table) => `public.${table}`)

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

function assertMatch(haystack, pattern, message) {
  if (!pattern.test(haystack)) {
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

if (process.exitCode) {
  process.exit(process.exitCode)
}

for (const file of migrationFiles) {
  if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(file)) {
    fail(`migration filename is not timestamped snake_case: ${file}`)
  }
}

const migrationText = migrationFiles
  .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
  .join("\n")

const seedText = readFileSync(join(migrationsDir, "20260625232000_seed_core_defaults.sql"), "utf8")
const roleSeedBlock = seedText.match(/insert into public\.core_roles[\s\S]*?on conflict \(workspace_id, key\)/i)?.[0] ?? ""

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

const roleSeedTuples = roleSeedBlock.split(/\n\s*\),/)

for (const roleKey of requiredSeedRoleKeys) {
  const roleName = `${roleKey[0].toUpperCase()}${roleKey.slice(1)}`
  const matchingTuple = roleSeedTuples.some((tuple) =>
    tuple.includes(`'${roleKey}'`) && tuple.includes(`'${roleName}'`),
  )

  if (matchingTuple) {
    pass(`seeds ${roleKey} role row`)
  } else {
    fail(`seeds ${roleKey} role row`)
  }
}

assertIncludes(
  migrationText,
  "create schema if not exists private;",
  "keeps RLS helper functions outside the public RPC schema",
)

assertIncludes(
  migrationText,
  "revoke all on schema private from authenticated;",
  "does not grant direct private schema usage to authenticated users",
)

assertIncludes(
  migrationText,
  "revoke execute on function public.core_touch_updated_at() from public;",
  "revokes default public execute from trigger helper",
)

for (const helperSignature of [
  "private.core_current_profile_id()",
  "private.core_is_active_member(uuid)",
  "private.core_is_active_member_of_any_workspace()",
  "private.core_profiles_share_active_workspace(uuid)",
]) {
  assertIncludes(
    migrationText,
    `revoke execute on function ${helperSignature} from public;`,
    `revokes default public execute from ${helperSignature}`,
  )
}

if (/grant\s+execute\s+on\s+function\s+private\.[^;]*\s+to\s+[^;]*(authenticated|anon|public)/i.test(migrationText)) {
  fail("private RLS helper functions should not be directly granted to browser-facing roles")
} else {
  pass("private RLS helpers are not directly granted to browser-facing roles")
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
  "create index if not exists core_memberships_role_id_idx",
  "indexes membership role foreign key",
)

assertIncludes(
  migrationText,
  "create index if not exists core_workspaces_created_by_profile_id_idx",
  "indexes workspace creator foreign key",
)

assertIncludes(
  migrationText,
  "private.core_is_active_member(target_workspace_id uuid)",
  "defines per-workspace active membership RLS helper",
)

assertIncludes(
  migrationText,
  "and w.deleted_at is null",
  "active membership helpers ignore soft-deleted workspaces",
)

assertIncludes(
  migrationText,
  "private.core_is_active_member_of_any_workspace",
  "defines any-workspace active membership helper for global role templates",
)

assertIncludes(
  migrationText,
  "private.core_current_profile_id",
  "defines current profile helper",
)

assertIncludes(
  migrationText,
  "private.core_profiles_share_active_workspace",
  "defines shared-workspace profile visibility helper",
)

assertIncludes(
  migrationText,
  "workspace_id is null",
  "keeps global role template uniqueness path explicit",
)

assertIncludes(
  migrationText,
  "and private.core_is_active_member_of_any_workspace()",
  "gates global role template reads behind active membership",
)

assertIncludes(
  migrationText,
  "workspace_id is not null",
  "guards workspace-scoped role checks from implicit null membership calls",
)

assertIncludes(
  migrationText,
  "and status = 'active'",
  "membership read policy exposes only active target membership rows",
)

assertIncludes(
  migrationText,
  "set search_path = public",
  "sets search_path on trigger function",
)

assertIncludes(
  migrationText,
  "set search_path = auth, public",
  "sets auth-first search_path on private RLS helpers",
)

assertIncludes(
  migrationText,
  `create policy "Users can create their own profile"`,
  "allows authenticated users to create their own profile",
)

assertIncludes(
  migrationText,
  "with check (user_id = auth.uid())",
  "guards profile inserts by authenticated user id",
)

assertIncludes(
  migrationText,
  "create unique index if not exists core_workspaces_single_active_workspace",
  "enforces one active workspace structurally",
)

assertIncludes(
  migrationText,
  "create or replace trigger core_profiles_touch_updated_at",
  "uses replaceable updated_at triggers for local replay",
)

assertIncludes(
  seedText,
  "on conflict (slug) do update",
  "upserts the default workspace by slug",
)

assertIncludes(
  seedText,
  "conflict updates preserve the surviving primary keys",
  "documents deterministic seed id behavior on non-fresh databases",
)

assertIncludes(
  seedText,
  "(select id from public.core_workspaces where slug = 'winningos')",
  "links seed rows to the surviving workspace id by slug",
)

assertMatch(
  seedText,
  /deleted_at\s*=\s*null/i,
  "default workspace conflict resolution clears deleted_at",
)

assertIncludes(
  seedText,
  "logo_url = coalesce(public.core_brand_settings.logo_url, excluded.logo_url)",
  "brand settings seed preserves existing logo_url on reset",
)

if (migrationText.includes("deleted_at is null and private.core_is_active_member(id)")) {
  fail("workspace RLS has redundant inline deleted_at check; core_is_active_member already handles it")
} else {
  pass("workspace RLS avoids duplicate deleted_at helper logic")
}

if (process.exitCode) {
  process.exit(process.exitCode)
}

assertIncludes(
  migrationText,
  "public.core_bootstrap_current_user(profile_display_name text default null)",
  "defines authenticated profile bootstrap RPC",
)

assertIncludes(
  migrationText,
  "set search_path = extensions, auth, private, public",
  "bootstrap RPC hardens security definer search path",
)

assertIncludes(
  migrationText,
  "workspace_name text",
  "bootstrap RPC returns workspace display name",
)

assertIncludes(
  migrationText,
  "display_name text",
  "bootstrap RPC returns profile display name",
)

assertIncludes(
  migrationText,
  "raise exception 'core_bootstrap_current_user requires an authenticated user'",
  "bootstrap RPC rejects unauthenticated calls",
)

assertIncludes(
  migrationText,
  "for update",
  "bootstrap RPC locks default workspace during first-owner decision",
)

assertIncludes(
  migrationText,
  "m.workspace_id = target_workspace_id",
  "bootstrap RPC scopes first-owner membership count",
)

assertIncludes(
  migrationText,
  "on conflict (workspace_id, profile_id) do nothing",
  "bootstrap RPC avoids promoting inactive memberships",
)

assertIncludes(
  migrationText,
  "and display_name is null",
  "bootstrap RPC avoids no-op profile updates",
)

assertIncludes(
  migrationText,
  "grant execute on function public.core_bootstrap_current_user(text) to authenticated;",
  "bootstrap RPC is executable by authenticated users",
)

assertIncludes(
  migrationText,
  "revoke all on function public.core_bootstrap_current_user(text) from public;",
  "bootstrap RPC revokes default public execute",
)

console.log("Supabase migration contract validation passed.")
