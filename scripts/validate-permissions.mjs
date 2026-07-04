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
// (issue #40) and the owner-only hardening depend on. members.invite left this
// set in issue #60: it is admin-tier by default (owner-editable), and the
// admin-tier restriction (no admin invites by admins) is enforced in the
// invite action plus core_set_member_role.
const OWNER_ONLY_KEYS = ["workspace.delete", "members.remove", "roles.manage"]

// ---------------------------------------------------------------------------
// Code catalog: core/permissions/catalog.ts
// ---------------------------------------------------------------------------
const catalog = read("core/permissions/catalog.ts")
assert(catalog.includes("export const permissionCatalog"), "catalog exposes the grouped permissionCatalog")
assert(catalog.includes("export const CORE_ROLE_KEYS"), "catalog exposes CORE_ROLE_KEYS")
assert(catalog.includes('export type CoreRoleKey = "owner" | "admin" | "member" | "viewer"'), "catalog defines the four system role keys")

for (const key of PERMISSION_KEYS) {
  assert(catalog.includes(`"${key}"`), `catalog defines permission ${key}`)
}

// Bidirectional check: the catalog must have exactly the same count of permission
// definitions as PERMISSION_KEYS so that adding a key to the catalog without
// updating this script causes a failure (not a silent miss).
const catalogPermKeyCount = (catalog.match(/\bkey: "[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*"/g) ?? []).length
assert(
  catalogPermKeyCount === PERMISSION_KEYS.length,
  `catalog defines exactly ${PERMISSION_KEYS.length} permissions (found ${catalogPermKeyCount})`,
)

for (const key of OWNER_ONLY_KEYS) {
  const ownerOnly = new RegExp(`key: "${key.replace(".", "\\.")}",[^\\n]*roles: OWNER_ONLY`)
  assert(ownerOnly.test(catalog), `catalog grants ${key} to owner only`)
}

assert(/key: "members\.disable",[^\n]*roles: ADMIN_UP/.test(catalog), "catalog grants members.disable to owner/admin")
assert(/key: "members\.invite",[^\n]*roles: ADMIN_UP/.test(catalog), "catalog grants members.invite to owner/admin (issue #60)")

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

const tiersMigrationFile = migrationFiles.find((file) => file.endsWith("_admin_member_management_tiers.sql"))
assert(Boolean(tiersMigrationFile), "adds admin member-management tiers migration (issues #58/#60)")
const tiersMigration = read(join(migrationsDir, tiersMigrationFile))
assert(tiersMigration.includes("values ('admin', 'members.invite')"), "tiers migration seeds the admin members.invite default grant")
assert(tiersMigration.includes("('workspace.delete', 'members.remove', 'roles.manage')"), "tiers migration shrinks the locked set to the structural owner-only permissions")
assert(tiersMigration.includes("only owners can assign the admin role"), "set_member_role blocks non-owners from assigning admin")
assert(tiersMigration.includes("only owners can change an admin member"), "set_member_role blocks non-owners from changing an admin")
assert(tiersMigration.includes("actor_role_key := private.core_current_member_role_key(target_workspace_id)"), "set_member_role resolves the acting role server-side")

// ---------------------------------------------------------------------------
// Plugin permission readiness (COMPATIBILITY.md core-v0)
// ---------------------------------------------------------------------------
const pluginKeysMigrationFile = migrationFiles.find((file) => file.endsWith("_allow_plugin_permission_keys.sql"))
assert(Boolean(pluginKeysMigrationFile), "adds plugin permission key format migration")
const pluginKeysMigration = read(join(migrationsDir, pluginKeysMigrationFile))
assert(pluginKeysMigration.includes("^plugin\\.[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$"), "schema accepts plugin.{plugin_id}.{action} permission keys")
assert(pluginKeysMigration.includes("core_audit_events_action_format"), "schema accepts plugin.{plugin_id}.{event} audit actions")
assert(pluginKeysMigration.includes("deny-by-default"), "plugin key migration documents deny-by-default (no grants added)")
assert(!pluginKeysMigration.includes("insert into"), "plugin key migration only widens formats; it seeds nothing")

// ---------------------------------------------------------------------------
// Bug fix migration: 20260627193000_fix_member_action_status_ambiguity.sql
// ---------------------------------------------------------------------------
const fixMigrationFile = migrationFiles.find((file) => file.endsWith("_fix_member_action_status_ambiguity.sql"))
assert(Boolean(fixMigrationFile), "adds member-action status-ambiguity fix migration")
const fixMigration = read(join(migrationsDir, fixMigrationFile))
assert(fixMigration.includes("and public.core_memberships.status = 'active'"), "disable RPC qualifies the status column in its update guard")
assert(fixMigration.includes("and public.core_memberships.status in ('invited', 'disabled')"), "remove RPC qualifies the status column in its update guard")

// ---------------------------------------------------------------------------
// App-layer gating reads the live grant map (issue #42 made grants editable)
// ---------------------------------------------------------------------------
const actions = read("core/members/actions.ts")
assert(actions.includes('from "@/core/permissions/catalog"'), "member actions import the permission catalog types")
assert(actions.includes("roleHasLivePermission"), "member actions gate on the live grant map")
assert(actions.includes('currentMemberHasPermission("members.invite")'), "invite action gates on members.invite")
assert(actions.includes('currentMemberHasPermission("roles.assign")'), "role activation/update action gates on roles.assign")
assert(actions.includes('currentMemberHasPermission("members.disable")'), "disable action gates on members.disable")
assert(actions.includes('currentMemberHasPermission("members.remove")'), "remove action gates on members.remove")
assert(!actions.includes("ensureCanManageMembers"), "dead ensureCanManageMembers helper is removed")

const membersData = read("core/members/data.ts")
assert(membersData.includes("getRoleGrantMap"), "member list derives permissions from the live grant map")
assert(membersData.includes('roleGrants.has("members.disable")'), "member list derives canManageMembers from live grants")
assert(membersData.includes('roleGrants.has("members.invite")'), "member list derives canInviteMembers from live grants")
assert(membersData.includes('roleGrants.has("members.remove")'), "member list derives canRemoveMembers from live grants")

// ---------------------------------------------------------------------------
// Editable role permissions (issue #42)
// ---------------------------------------------------------------------------
assert(catalog.includes("export const LOCKED_PERMISSION_KEYS"), "catalog exposes the locked permission set")
assert(catalog.includes("export function isEditableGrant"), "catalog exposes the isEditableGrant helper")
for (const key of OWNER_ONLY_KEYS) {
  assert(catalog.includes(`"${key}"`) && new RegExp(`LOCKED_PERMISSION_KEYS[\\s\\S]*"${key.replace(".", "\\.")}"`).test(catalog), `locked set includes owner-only ${key}`)
}

const grants = read("core/permissions/grants.ts")
assert(grants.includes("export async function getRoleGrantMap"), "grants module exposes getRoleGrantMap")
assert(grants.includes("export async function roleHasLivePermission"), "grants module exposes roleHasLivePermission")
assert(grants.includes("core_role_permissions"), "grants module reads the live core_role_permissions table")
assert(grants.includes('map.owner = new Set(allPermissions.map'), "grants module keeps owner holding every permission")

const permissionsActions = read("core/permissions/actions.ts")
assert(permissionsActions.includes("export async function setRolePermission"), "permissions actions expose setRolePermission")
assert(permissionsActions.includes("core_set_role_permission"), "setRolePermission calls the owner-only grant RPC")
assert(permissionsActions.includes('roleHasLivePermission(session.membership?.roleKey, "roles.manage")'), "setRolePermission gates on roles.manage (owner-only)")

const editMigrationFile = migrationFiles.find((file) => file.endsWith("_editable_role_permissions.sql"))
assert(Boolean(editMigrationFile), "adds editable-role-permissions migration")
const editMigration = read(join(migrationsDir, editMigrationFile))
assert(editMigration.includes("function private.core_role_has_permission"), "migration adds the live permission resolver")
assert(editMigration.includes("p_role_key = 'owner'"), "permission resolver treats owner as holding everything")
assert(editMigration.includes("function public.core_set_role_permission"), "migration adds the owner-only grant editor RPC")
assert(editMigration.includes("requires the roles.manage permission"), "grant editor requires roles.manage (owner-only)")
assert(editMigration.includes("can only edit admin, member, or viewer roles"), "grant editor keeps owner immutable")
assert(editMigration.includes("('workspace.delete', 'members.invite', 'members.remove', 'roles.manage')"), "grant editor locks the structural owner-only permissions")
assert(editMigration.includes("core_current_member_has_permission(target_workspace_id, 'roles.assign')"), "set_member_role now gates on the live roles.assign grant")
assert(editMigration.includes("core_current_member_has_permission(target_workspace_id, 'members.disable')"), "disable_member now gates on the live members.disable grant")
assert(editMigration.includes("grant execute on function public.core_set_role_permission(text, text, boolean) to authenticated"), "grants the grant editor RPC to authenticated")

const rolesActionsBoundary = read("components/app/settings/roles-section.tsx")
assert(rolesActionsBoundary.includes("setRolePermission"), "roles section wires the grant toggle action")
assert(rolesActionsBoundary.includes("canManageRoles"), "roles section gates editing on canManageRoles")

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
