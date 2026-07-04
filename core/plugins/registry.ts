import "server-only"

import { installedPlugins } from "@/config/plugins"
import { isPluginPermissionKey, type WinningOSPluginManifest } from "./manifest"

/** Installed plugins in registry (= install) order. Empty in the framework repos. */
export function getInstalledPlugins(): readonly WinningOSPluginManifest[] {
  return installedPlugins
}

export function findInstalledPlugin(pluginId: string): WinningOSPluginManifest | null {
  return installedPlugins.find((plugin) => plugin.id === pluginId) ?? null
}

export type PluginRouteMatch = {
  component: React.ComponentType
  /** `[name]` bindings from the matched route key, Next-page style. */
  params: Record<string, string>
}

/**
 * Resolve a request path under /p/{plugin_id} to a manifest route component.
 * Route keys are plugin-relative ("", "/new", "/items/[id]"); exact matches win
 * over dynamic `[param]` segments. Returns null (host 404s) when nothing matches.
 */
export function matchPluginRoute(
  manifest: WinningOSPluginManifest,
  segments: readonly string[],
): PluginRouteMatch | null {
  const requestPath = segments.length > 0 ? `/${segments.join("/")}` : ""

  if (Object.prototype.hasOwnProperty.call(manifest.routes, requestPath)) {
    return { component: manifest.routes[requestPath], params: {} }
  }

  for (const [routePath, component] of Object.entries(manifest.routes)) {
    if (!routePath.includes("[")) {
      continue
    }

    const routeSegments = routePath.split("/").filter(Boolean)

    if (routeSegments.length !== segments.length) {
      continue
    }

    const params: Record<string, string> = {}
    let matches = true

    for (let index = 0; index < routeSegments.length; index += 1) {
      const routeSegment = routeSegments[index]

      if (routeSegment.startsWith("[") && routeSegment.endsWith("]")) {
        params[routeSegment.slice(1, -1)] = segments[index]
      } else if (routeSegment !== segments[index]) {
        matches = false
        break
      }
    }

    if (matches) {
      return { component, params }
    }
  }

  return null
}

/**
 * Whether a permission key is declared by an installed plugin's manifest. The
 * grant editor only accepts registered plugin keys — the database would store
 * any well-formed plugin.* key, but grants for uninstalled plugins are noise
 * this check keeps out.
 */
export function isRegisteredPluginPermission(permissionKey: string): boolean {
  if (!isPluginPermissionKey(permissionKey)) {
    return false
  }

  return installedPlugins.some((plugin) =>
    plugin.permissions.some((permission) => permission.key === permissionKey),
  )
}
