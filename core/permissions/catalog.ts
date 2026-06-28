// WinningOS Core permission catalog — the canonical, "explicit and boring"
// permission model (see CORE.md "Permission philosophy" and DATA_MODEL.md).
//
// This module is the single source of truth the application uses for permission
// gating. It is intentionally pure (no server-only imports, no Supabase) so both
// server code and UI can share its types and helpers. The Supabase migration
// 20260627194000_add_core_permissions.sql seeds core_permissions /
// core_role_permissions to match this catalog exactly, and
// scripts/validate-permissions.mjs asserts they stay in lockstep.
//
// UI hiding is never the security boundary — server-side RPC checks and RLS
// enforce access. This catalog is what makes those checks consistent and
// nameable across the app and the Settings → Roles view.

export type CoreRoleKey = "owner" | "admin" | "member" | "viewer"

export const CORE_ROLE_KEYS: readonly CoreRoleKey[] = ["owner", "admin", "member", "viewer"] as const

export type CoreRoleDef = {
  key: CoreRoleKey
  name: string
  description: string
  isSystem: boolean
}

export const coreRoles: CoreRoleDef[] = [
  { key: "owner", name: "Owner", description: "Full control of the workspace, including removals and deletion.", isSystem: true },
  { key: "admin", name: "Admin", description: "Manage members, roles, branding, and workspace settings.", isSystem: true },
  { key: "member", name: "Member", description: "Operate inside the workspace with standard access.", isSystem: true },
  { key: "viewer", name: "Viewer", description: "Read-only access to permitted areas.", isSystem: true },
]

export type PermissionKey =
  | "workspace.view"
  | "workspace.manage"
  | "workspace.delete"
  | "members.view"
  | "members.invite"
  | "members.disable"
  | "members.remove"
  | "roles.view"
  | "roles.assign"
  | "roles.manage"
  | "branding.view"
  | "branding.manage"
  | "settings.view"
  | "settings.manage"
  | "plugins.view"
  | "plugins.manage"

export type PermissionDef = {
  key: PermissionKey
  name: string
  description: string
  // System roles that hold this permission. Keep in lockstep with the migration.
  roles: CoreRoleKey[]
}

export type PermissionNamespace = {
  namespace: string
  label: string
  description: string
  permissions: PermissionDef[]
}

const ALL: CoreRoleKey[] = ["owner", "admin", "member", "viewer"]
const ADMIN_UP: CoreRoleKey[] = ["owner", "admin"]
const MEMBER_UP: CoreRoleKey[] = ["owner", "admin", "member"]
const OWNER_ONLY: CoreRoleKey[] = ["owner"]

export const permissionCatalog: PermissionNamespace[] = [
  {
    namespace: "workspace",
    label: "Workspace",
    description: "Visibility and high-level workspace control.",
    permissions: [
      { key: "workspace.view", name: "View workspace", description: "See the active workspace and its high-level metadata.", roles: ALL },
      { key: "workspace.manage", name: "Manage workspace", description: "Edit workspace name, slug, and configuration metadata.", roles: ADMIN_UP },
      { key: "workspace.delete", name: "Delete workspace", description: "Archive or delete the workspace.", roles: OWNER_ONLY },
    ],
  },
  {
    namespace: "members",
    label: "Members",
    description: "Membership lifecycle inside the workspace.",
    permissions: [
      { key: "members.view", name: "View members", description: "See the workspace member and pending-access list.", roles: MEMBER_UP },
      { key: "members.invite", name: "Invite members", description: "Send invitations and add members to the workspace.", roles: OWNER_ONLY },
      { key: "members.disable", name: "Disable members", description: "Disable an active member's access without removing them.", roles: ADMIN_UP },
      { key: "members.remove", name: "Remove members", description: "Revoke invites and remove non-owner memberships.", roles: OWNER_ONLY },
    ],
  },
  {
    namespace: "roles",
    label: "Roles",
    description: "Role assignment and permission bundles.",
    permissions: [
      { key: "roles.view", name: "View roles", description: "See workspace roles and their permission grants.", roles: MEMBER_UP },
      { key: "roles.assign", name: "Assign roles", description: "Change the role assigned to a non-owner member.", roles: ADMIN_UP },
      { key: "roles.manage", name: "Manage roles", description: "Create or edit custom roles and permission bundles.", roles: OWNER_ONLY },
    ],
  },
  {
    namespace: "branding",
    label: "Branding",
    description: "Theme tokens and workspace identity.",
    permissions: [
      { key: "branding.view", name: "View branding", description: "See workspace branding tokens and identity.", roles: ALL },
      { key: "branding.manage", name: "Manage branding", description: "Edit workspace branding tokens and identity.", roles: ADMIN_UP },
    ],
  },
  {
    namespace: "settings",
    label: "Settings",
    description: "Workspace configuration and security.",
    permissions: [
      { key: "settings.view", name: "View settings", description: "Open the workspace settings area.", roles: MEMBER_UP },
      { key: "settings.manage", name: "Manage settings", description: "Change workspace settings and security options.", roles: ADMIN_UP },
    ],
  },
  {
    namespace: "plugins",
    label: "Plugins",
    description: "Future build-time plugins. Not available in Core v0.1.",
    permissions: [
      { key: "plugins.view", name: "View plugins", description: "See installed and available Core plugins.", roles: MEMBER_UP },
      { key: "plugins.manage", name: "Manage plugins", description: "Install and configure Core plugins (future).", roles: ADMIN_UP },
    ],
  },
]

// Structural owner-only permissions. These stay locked to owner and are never
// editable from the Roles UI — they back the member-removal, invite, and
// workspace-deletion boundaries (kept in lockstep with the OWNER_ONLY set in
// scripts/validate-permissions.mjs and the core_set_role_permission guard).
export const LOCKED_PERMISSION_KEYS: readonly PermissionKey[] = [
  "workspace.delete",
  "members.invite",
  "members.remove",
  "roles.manage",
] as const

/**
 * Whether a (role, permission) grant may be toggled from the Roles editor.
 * Owner is immutable (always holds everything); the structural owner-only
 * permissions are locked for every role. The server re-enforces both rules in
 * core_set_role_permission — this helper only drives which cells the UI offers.
 */
export function isEditableGrant(roleKey: CoreRoleKey, permissionKey: PermissionKey): boolean {
  if (roleKey === "owner") {
    return false
  }

  return !LOCKED_PERMISSION_KEYS.includes(permissionKey)
}

export const allPermissions: PermissionDef[] = permissionCatalog.flatMap((group) => group.permissions)

export const permissionsByKey: Record<PermissionKey, PermissionDef> = Object.fromEntries(
  allPermissions.map((permission) => [permission.key, permission]),
) as Record<PermissionKey, PermissionDef>

function isCoreRoleKey(value: string | null | undefined): value is CoreRoleKey {
  return value === "owner" || value === "admin" || value === "member" || value === "viewer"
}

/** Whether a role holds a permission. Unknown/null roles hold nothing. */
export function roleHasPermission(roleKey: string | null | undefined, permissionKey: PermissionKey): boolean {
  if (!isCoreRoleKey(roleKey)) {
    return false
  }

  return permissionsByKey[permissionKey]?.roles.includes(roleKey) ?? false
}

/** All permission keys held by a role. */
export function permissionsForRole(roleKey: CoreRoleKey): PermissionKey[] {
  return allPermissions.filter((permission) => permission.roles.includes(roleKey)).map((permission) => permission.key)
}
