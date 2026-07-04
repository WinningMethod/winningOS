import "server-only"

import type { PluginNavItem } from "@/lib/navigation"
import { getPluginGrantsForRole } from "./permissions"
import { getInstalledPlugins } from "./registry"

/**
 * The permission-gated "Plugins" sidebar group, in registry order. Each
 * manifest nav entry renders only when the viewer's role holds its declared
 * permission in the live grant map (owner always does). Empty registry — the
 * permanent state of the framework repos — costs no query and renders no group.
 */
export async function getPluginNavItems(roleKey: string | null | undefined): Promise<PluginNavItem[]> {
  const plugins = getInstalledPlugins()

  if (plugins.length === 0) {
    return []
  }

  const grants = await getPluginGrantsForRole(roleKey)

  return plugins.flatMap((plugin) =>
    plugin.navigation
      .filter((entry) => grants.has(entry.permission))
      .map((entry) => ({
        pluginId: plugin.id,
        label: entry.label,
        href: `/p/${plugin.id}${entry.path}`,
        iconName: entry.icon,
      })),
  )
}
