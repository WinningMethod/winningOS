import "server-only"

import { createClient } from "@/core/supabase/server"
import {
  CORE_ROLE_KEYS,
  allPermissions,
  permissionsForRole,
  isCoreRoleKey,
  isPermissionKey,
  type CoreRoleKey,
  type PermissionKey,
} from "./catalog"

export type RoleGrantMap = Record<CoreRoleKey, Set<PermissionKey>>

type RoleGrantRow = {
  role_key: CoreRoleKey | null
  permission_key: PermissionKey | null
}

function emptyGrantMap(): RoleGrantMap {
  return { owner: new Set(), admin: new Set(), member: new Set(), viewer: new Set() }
}

/** Catalog-seeded defaults, used when the live grant map cannot be read. */
function catalogDefaults(): RoleGrantMap {
  const map = emptyGrantMap()

  for (const roleKey of CORE_ROLE_KEYS) {
    map[roleKey] = new Set(permissionsForRole(roleKey))
  }

  return map
}

/** Owner is immutable and always holds every permission (mirrors core_role_has_permission). */
function withOwnerAlwaysFull(map: RoleGrantMap): RoleGrantMap {
  map.owner = new Set(allPermissions.map((permission) => permission.key))
  return map
}

/**
 * The live role → permission grant map from core_role_permissions, which is now
 * the editable source of truth (issue #42). Owner is always returned with every
 * permission. Degrades to the catalog defaults (never throws) so Settings and the
 * Members page keep rendering if the grant table can't be read.
 */
export async function getRoleGrantMap(): Promise<{ grants: RoleGrantMap; live: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("core_role_permissions").select("role_key, permission_key")

  if (error) {
    console.error("Failed to read Core role permissions; falling back to catalog defaults", {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return { grants: withOwnerAlwaysFull(catalogDefaults()), live: false }
  }

  const map = emptyGrantMap()

  for (const row of (data ?? []) as RoleGrantRow[]) {
    if (isCoreRoleKey(row.role_key) && row.permission_key && isPermissionKey(row.permission_key)) {
      map[row.role_key].add(row.permission_key)
    }
  }

  return { grants: withOwnerAlwaysFull(map), live: true }
}

/**
 * Whether a role holds a permission according to the live grant map. Use for
 * app-layer gating that must reflect owner edits; the Supabase RPCs re-enforce
 * the same grants server-side.
 */
export async function roleHasLivePermission(
  roleKey: string | null | undefined,
  permissionKey: PermissionKey,
): Promise<boolean> {
  if (!isCoreRoleKey(roleKey ?? null)) {
    return false
  }

  const { grants } = await getRoleGrantMap()
  return grants[roleKey as CoreRoleKey].has(permissionKey)
}
