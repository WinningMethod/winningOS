import "server-only"

import { createClient } from "@/core/supabase/server"
import { isCoreRoleKey, CORE_ROLE_KEYS, type CoreRoleKey } from "@/core/permissions/catalog"
import type { PermissionNamespaceOverview } from "@/core/permissions/data"
import { isPluginPermissionKey, type PluginPermissionKey } from "./manifest"
import { getInstalledPlugins } from "./registry"

// Plugin permission checks mirror the DB-side resolver
// (private.core_role_has_permission): owner always holds everything, every
// other role holds exactly what core_role_permissions grants it. Core's
// catalog helpers (roleHasLivePermission) deliberately filter to catalog keys,
// so plugin keys get their own path here — same live table, no catalog filter.

type PluginGrantRow = {
  role_key: string | null
  permission_key: string | null
}

/**
 * Whether a role holds a plugin permission per the LIVE grant map
 * (core_role_permissions). Owners always hold everything; unknown keys deny;
 * read failures deny.
 */
export async function roleHasPluginPermission(
  roleKey: string | null | undefined,
  permission: PluginPermissionKey,
): Promise<boolean> {
  if (!isCoreRoleKey(roleKey ?? null) || !isPluginPermissionKey(permission)) {
    return false
  }

  if (roleKey === "owner") {
    return true
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("core_role_permissions")
    .select("permission_key")
    .eq("role_key", roleKey)
    .eq("permission_key", permission)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Failed to read plugin permission grant; denying", {
      permission,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return false
  }

  return data !== null
}

/**
 * All plugin permission keys a role holds, resolved once for nav/settings
 * filtering (one query instead of one per entry). Owner gets every key
 * registered by installed plugins; read failures deny (empty set).
 */
export async function getPluginGrantsForRole(roleKey: string | null | undefined): Promise<Set<string>> {
  const plugins = getInstalledPlugins()

  if (plugins.length === 0 || !isCoreRoleKey(roleKey ?? null)) {
    return new Set()
  }

  if (roleKey === "owner") {
    return new Set(plugins.flatMap((plugin) => plugin.permissions.map((permission) => permission.key)))
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("core_role_permissions")
    .select("permission_key")
    .eq("role_key", roleKey)
    .like("permission_key", "plugin.%")

  if (error) {
    console.error("Failed to read plugin permission grants; denying", {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return new Set()
  }

  return new Set(
    ((data ?? []) as { permission_key: string | null }[])
      .map((row) => row.permission_key)
      .filter((key): key is string => typeof key === "string"),
  )
}

/**
 * The Roles-grid "Plugins" group: every permission registered by installed
 * plugins with its live per-role grants. Empty registry → no group. On read
 * failure the grid falls back to the manifests' defaultRoles and reports
 * live: false so the editor disables (same degradation as the Core catalog).
 */
export async function getPluginPermissionNamespaces(): Promise<{
  namespaces: PermissionNamespaceOverview[]
  live: boolean
}> {
  const plugins = getInstalledPlugins()

  if (plugins.length === 0) {
    return { namespaces: [], live: true }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("core_role_permissions")
    .select("role_key, permission_key")
    .like("permission_key", "plugin.%")

  const live = !error

  if (error) {
    console.error("Failed to read plugin role permissions; showing manifest defaults", {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
  }

  const grantedByRole: Record<CoreRoleKey, Set<string>> = {
    owner: new Set(),
    admin: new Set(),
    member: new Set(),
    viewer: new Set(),
  }

  for (const row of ((data ?? []) as PluginGrantRow[])) {
    if (isCoreRoleKey(row.role_key) && row.permission_key) {
      grantedByRole[row.role_key].add(row.permission_key)
    }
  }

  const permissions = plugins.flatMap((plugin) =>
    plugin.permissions.map((permission) => ({
      key: permission.key,
      name: `${plugin.name}: ${permission.name}`,
      description: permission.description,
      grants: Object.fromEntries(
        CORE_ROLE_KEYS.map((roleKey) => [
          roleKey,
          roleKey === "owner"
            || (live
              ? grantedByRole[roleKey].has(permission.key)
              : permission.defaultRoles.includes(roleKey)),
        ]),
      ) as Record<CoreRoleKey, boolean>,
      // Owner is immutable; no plugin permission is structurally locked.
      editable: { owner: false, admin: true, member: true, viewer: true } as Record<CoreRoleKey, boolean>,
    })),
  )

  return {
    namespaces: [
      {
        namespace: "plugin",
        label: "Plugins",
        description: "Live grants registered by installed plugins. Owner always holds every plugin permission.",
        permissions,
      },
    ],
    live,
  }
}
