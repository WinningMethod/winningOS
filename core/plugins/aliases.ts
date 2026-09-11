import type { PluginRouteAlias, WinningOSPluginManifest } from "./manifest"

// Pure resolver: the app layout owns session checks; the plugin retains its
// feature authorization and RLS. Never resolve from a folder or dynamic import.
export function resolvePluginAlias(
  plugins: readonly WinningOSPluginManifest[],
  aliases: readonly PluginRouteAlias[],
  segments: readonly string[],
) {
  for (const alias of aliases) {
    const parts = alias.path.slice(1).split("/")
    if (parts.length !== segments.length) continue
    const params: Record<string, string> = {}
    const matches = parts.every((part, index) => {
      const parameter = /^\[([a-zA-Z][a-zA-Z0-9_]*)\]$/.exec(part)
      if (parameter) { params[parameter[1]] = segments[index]; return true }
      return part === segments[index]
    })
    if (!matches) continue
    const plugin = plugins.find(item => item.id === alias.pluginId)
    if (!plugin || !Object.hasOwn(plugin.routes, alias.route)) return null
    return { pluginId: plugin.id, component: plugin.routes[alias.route], params }
  }
  return null
}
