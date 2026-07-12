import "server-only"

import type { PluginNavItem } from "@/lib/navigation"
import { rollupPluginNavItems } from "./nav-rollup"
import { getPluginGrantsForRole } from "./permissions"
import { getInstalledPlugins } from "./registry"

/**
 * The permission-gated plugin sidebar entries, in registry order. Each
 * manifest nav entry renders only when the viewer's role holds its declared
 * permission in the live grant map (owner always does). Plugins declaring
 * `navRollup` contribute their entries as dropdown children of the target
 * plugin's primary entry instead of top-level entries (core/plugins/
 * nav-rollup.ts), so a function served by one App plus several Viewers/
 * Bridges stays a single sidebar entry. Empty registry — the permanent state
 * of the framework repos — costs no query and renders no group.
 */
export async function getPluginNavItems(roleKey: string | null | undefined): Promise<PluginNavItem[]> {
  const plugins = getInstalledPlugins()

  if (plugins.length === 0) {
    return []
  }

  const grants = await getPluginGrantsForRole(roleKey)

  return rollupPluginNavItems(
    plugins.map((plugin) => ({
      pluginId: plugin.id,
      rollupInto: plugin.navRollup?.into ?? null,
      entries: plugin.navigation
        .filter((entry) => grants.has(entry.permission))
        .map((entry) => ({
          pluginId: plugin.id,
          label: entry.label,
          href: `/p/${plugin.id}${entry.path}`,
          iconName: entry.icon,
        })),
    })),
  )
}
