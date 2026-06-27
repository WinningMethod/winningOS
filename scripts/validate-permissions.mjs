import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }

  console.log(`✓ ${message}`)
}

function read(path) {
  assert(existsSync(path), `exists: ${path}`)
  return readFileSync(path, "utf8")
}

// Canonical permission catalog (must match core/permissions/catalog.ts and the
// 20260627194000_add_core_permissions.sql seed). Keep this list in lockstep.
const PERMISSION_KEYS = [
  "workspace.view",
  "workspace.manage",
  "workspace.delete",
  "members.view",
  "members.invite",
  "members.disable",
  "members.remove",
  "roles.view",
  "roles.assign",
  "roles.manage",
  "branding.view",
  "branding.manage",
  "settings.view",
  "settings.manage",
  "plugins.view",
  "plugins.manage",
]

// Permissions that must be owner-only — these are the boundaries the Members bug
// (issue #40) and the owner-only hardening depend on.
const OWNER_ONLY_KEYS = ["workspace.delete", "members.invite", "members.remove", "roles.manage"]

// ---------------------------------------------------------------------------
// Code catalog: core/permissions/catalog.ts
// ---------------------------------------------------------------------------
const catalog = read("core/permissions/catalog.ts")
assert(catalog.includes("export function roleHasPermission"), "catalog exposes roleHasPermission helper")
assert(catalog.includes("export const permissionCatalog"), "catalog exposes the grouped permissionCatalog")
assert(catalog.includes("export const CORE_ROLE_KEYS"), "catalog exposes CORE_ROLE_KEYS")
assert(catalog.includes('export type CoreRoleKey = "owner" | "admin" | "member" | "viewer"'), "catalog defines the four system role keys")

for (const key of PERMISSION_KEYS) {
  assert(catalog.includes(`"${key}"`), `catalog defines permission ${key}`)
}

for (const key of OWNER_ONLY_KEYS) {
  const ownerOnly = new RegExp(`key: "${key.replace(".", "\\.")}",[^\\n]*roles: OWNER_ONLY`)
  assert(ownerOnly.test(catalog), `catalog grants ${key} to owner only`)
}

assert(/key: "members\.disable",[^\n]*roles: ADMIN_UP/.test(catalog), "catalog grants members.disable to owner/admin")

// ---------------------------------------------------------------------------
// Permission tables migration: 20260627194000_add_core_permissions.sql
// ---------------------------------------------------------------------------
const migrationsDir = "supabase/migrations"
const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql"))

const permissionsMigrationFile = migrationFiles.find((file) => file.endsWith("_add_core_permissions.sql"))
assert(Boolean(permissionsMigrationFile), "adds core permissions migration")
const permissionsMigration = read(join(migrationsDir, permissionsMigrationFile))

assert(permissionsMigration.includes("create table if not exists public.core_permissions"), "migration creates core_permissions table")
assert(permissionsMigration.includes("create table if not exists public.core_role_permissions"), "migration creates core_role_permissions table")
assert(permissionsMigration.includes("alter table public.core_permissions enable row level security"), "migration enables RLS on core_permissions")
assert(permissionsMigration.includes("alter table public.core_role_permissions enable row level security"), "migration enables RLS on core_role_permissions")
assert(permissionsMigration.includes("key like namespace || '.%'"), "migration constrains namespace to the key prefix")

for (const key of PERMISSION_KEYS) {
  assert(permissionsMigration.includes(`'${key}'`), `migration seeds permission ${key}`)
}

for (const key of OWNER_ONLY_KEYS) {
  assert(permissionsMigration.includes(`('${key}', array['owner'])`), `migration grants ${key} to owner only`)
}

assert(permissionsMigration.includes("('members.disable', array['owner', 'admin'])"), "migration grants members.disable to owner/admin")

// ---------------------------------------------------------------------------
// Bug fix migration: 20260627193000_fix_member_action_status_ambiguity.sql
// ---------------------------------------------------------------------------
const fixMigrationFile = migrationFiles.find((file) => file.endsWith("_fix_member_action_status_ambiguity.sql"))
assert(Boolean(fixMigrationFile), "adds member-action status-ambiguity fix migration")
const fixMigration = read(join(migrationsDir, fixMigrationFile))
assert(fixMigration.includes("and public.core_memberships.status = 'active'"), "disable RPC qualifies the status column in its update guard")
assert(fixMigration.includes("and public.core_memberships.status in ('invited', 'disabled')"), "remove RPC qualifies the status column in its update guard")

// ---------------------------------------------------------------------------
// App-layer gating is catalog-driven
// ---------------------------------------------------------------------------
const actions = read("core/members/actions.ts")
assert(actions.includes('from "@/core/permissions/catalog"'), "member actions import the permission catalog")
assert(actions.includes('currentMemberHasPermission("members.invite")'), "invite action gates on members.invite")
assert(actions.includes('currentMemberHasPermission("members.disable")'), "disable action gates on members.disable")
assert(actions.includes('currentMemberHasPermission("members.remove")'), "remove action gates on members.remove")
assert(!actions.includes("ensureCanManageMembers"), "dead ensureCanManageMembers helper is removed")

const membersData = read("core/members/data.ts")
assert(membersData.includes('roleHasPermission(roleKey, "members.disable")'), "member list derives canManageMembers from the catalog")
assert(membersData.includes('roleHasPermission(roleKey, "members.invite")'), "member list derives canInviteMembers from the catalog")
assert(membersData.includes('roleHasPermission(roleKey, "members.remove")'), "member list derives canRemoveMembers from the catalog")

// ---------------------------------------------------------------------------
// Settings → Roles is wired to real data
// ---------------------------------------------------------------------------
const permissionsData = read("core/permissions/data.ts")
assert(permissionsData.includes("export async function getCoreRolesOverview"), "permissions data exposes getCoreRolesOverview")
assert(permissionsData.includes("core_list_workspace_members"), "roles overview sources live member counts")

const settingsPage = read("app/(app)/settings/page.tsx")
assert(!settingsPage.includes('"use client"'), "settings page is a server component")
assert(settingsPage.includes("getCoreRolesOverview"), "settings page loads the real roles overview")
assert(settingsPage.includes("SettingsTabs"), "settings page renders the client tabs shell")

const rolesSection = read("components/app/settings/roles-section.tsx")
assert(!rolesSection.includes("@/lib/mock-data"), "roles section no longer reads mock permission data")
assert(rolesSection.includes("CoreRolesOverview"), "roles section renders the real overview prop")
assert(rolesSection.includes("CORE_ROLE_KEYS"), "roles section renders a per-role permission grid")

console.log("Permission catalog validation passed.")
