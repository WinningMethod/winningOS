import "server-only"

import { ensureCoreSession } from "@/core/auth/bootstrap"
import { getPluginPermissionNamespaces } from "@/core/plugins/permissions"
import { createClient } from "@/core/supabase/server"
import {
  coreRoles,
  permissionCatalog,
  isEditableGrant,
  type CoreRoleKey,
  type PermissionKey,
  CORE_ROLE_KEYS,
} from "./catalog"
import { getRoleGrantMap } from "./grants"

export type RoleOverview = {
  key: CoreRoleKey
  name: string
  description: string
  isSystem: boolean
  memberCount: number
}

export type PermissionOverview = {
  key: string
  name: string
  description: string
  grants: Record<CoreRoleKey, boolean>
  // Which (role) cells for this permission may be toggled from the editor.
  // Owner is never editable; structural owner-only permissions are locked for all.
  editable: Record<CoreRoleKey, boolean>
}

export type PermissionNamespaceOverview = {
  namespace: string
  label: string
  description: string
  permissions: PermissionOverview[]
}

export type CoreRolesOverview = {
  roles: RoleOverview[]
  namespaces: PermissionNamespaceOverview[]
  // Whether the active-member counts reflect live data (false when the viewer
  // has no active membership or the member list could not be read).
  countsAvailable: boolean
  // Whether the current viewer may edit role permissions (owner-only). When
  // false the grid renders read-only.
  canManageRoles: boolean
  // Whether the grant grid reflects the live core_role_permissions table rather
  // than catalog defaults (false when the table could not be read).
  grantsLive: boolean
}

type MemberRoleCountRow = {
  role_key: CoreRoleKey | null
  status: string | null
}

function emptyCounts(): Record<CoreRoleKey, number> {
  return { owner: 0, admin: 0, member: 0, viewer: 0 }
}

async function getActiveMemberCounts(): Promise<{ counts: Record<CoreRoleKey, number>; available: boolean }> {
  const session = await ensureCoreSession()

  if (!session.hasActiveMembership) {
    return { counts: emptyCounts(), available: false }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("core_list_workspace_members")

  if (error) {
    console.error("Failed to count Core members by role", {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return { counts: emptyCounts(), available: false }
  }

  const counts = emptyCounts()

  for (const row of (data ?? []) as MemberRoleCountRow[]) {
    if (row.status === "active" && row.role_key && CORE_ROLE_KEYS.includes(row.role_key)) {
      counts[row.role_key] += 1
    }
  }

  return { counts, available: true }
}

/**
 * Real data for the Settings → Roles view: the system roles with live active
 * member counts, and the permission catalog expressed as a per-role grant grid.
 * Never throws — degrades to zeroed counts so Settings always renders.
 */
export async function getCoreRolesOverview(): Promise<CoreRolesOverview> {
  const { counts, available } = await getActiveMemberCounts()
  const { grants: grantMap, live: grantsLive } = await getRoleGrantMap()
  // Installed plugins contribute a "Plugins" group of editable grants (empty
  // registry — the framework-repo state — contributes nothing and no query).
  const pluginOverview = await getPluginPermissionNamespaces()

  // Only owners (who hold the owner-only roles.manage grant) may edit the grid.
  const session = await ensureCoreSession()
  const viewerRoleKey = session.membership?.roleKey ?? null
  const canManageRoles = CORE_ROLE_KEYS.includes(viewerRoleKey as CoreRoleKey)
    && grantMap[viewerRoleKey as CoreRoleKey].has("roles.manage")

  const roles: RoleOverview[] = coreRoles.map((role) => ({
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    memberCount: counts[role.key],
  }))

  const grantsFor = (permissionKey: PermissionKey): Record<CoreRoleKey, boolean> => ({
    owner: grantMap.owner.has(permissionKey),
    admin: grantMap.admin.has(permissionKey),
    member: grantMap.member.has(permissionKey),
    viewer: grantMap.viewer.has(permissionKey),
  })

  const editableFor = (permissionKey: PermissionKey): Record<CoreRoleKey, boolean> => ({
    owner: isEditableGrant("owner", permissionKey),
    admin: isEditableGrant("admin", permissionKey),
    member: isEditableGrant("member", permissionKey),
    viewer: isEditableGrant("viewer", permissionKey),
  })

  const namespaces: PermissionNamespaceOverview[] = permissionCatalog.map((group) => ({
    namespace: group.namespace,
    label: group.label,
    description: group.description,
    permissions: group.permissions.map((permission) => ({
      key: permission.key,
      name: permission.name,
      description: permission.description,
      grants: grantsFor(permission.key),
      editable: editableFor(permission.key),
    })),
  }))

  return {
    roles,
    namespaces: [...namespaces, ...pluginOverview.namespaces],
    countsAvailable: available,
    canManageRoles,
    grantsLive: grantsLive && pluginOverview.live,
  }
}
