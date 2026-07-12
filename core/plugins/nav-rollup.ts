// Pure nav-rollup resolution: collapse satellite plugins' nav entries into
// dropdown children of their host plugin's primary nav entry (manifest
// `navRollup`). Separated from the server-only navigation module so the
// resolution rules are testable without a registry or a grant map.

import type { PluginNavItem } from "@/lib/navigation"

export type PluginNavSource = {
  pluginId: string
  /** Manifest navRollup target, if declared. */
  rollupInto: string | null
  /** This plugin's nav entries, already permission-filtered for the viewer. */
  entries: PluginNavItem[]
}

// Follow navRollup chains to the root host. A satellite may target a plugin
// that is itself a satellite (Viewer -> App is typical, but a Bridge could
// target a Viewer); the whole constellation lands under the one real host.
// Cycles and uninstalled targets resolve to null (caller falls back to
// top-level entries).
function resolveRootHost(source: PluginNavSource, byId: Map<string, PluginNavSource>): PluginNavSource | null {
  const seen = new Set<string>([source.pluginId])
  let current = source

  while (current.rollupInto) {
    const target = byId.get(current.rollupInto)

    if (!target || seen.has(target.pluginId)) {
      return null
    }

    seen.add(target.pluginId)
    current = target
  }

  return current === source ? null : current
}

/**
 * Flatten per-plugin nav sources (registry order) into the sidebar's plugin
 * nav list, honoring navRollup declarations. Guarantees:
 * - a host's first visible entry carries every satellite's entries as children
 * - satellites keep registry order among themselves, manifest order within
 * - a satellite whose host resolves to nothing visible (not installed, cycle,
 *   all entries permission-filtered) keeps its top-level entries — rollup can
 *   reduce noise but never hide something the viewer is entitled to see
 */
export function rollupPluginNavItems(sources: PluginNavSource[]): PluginNavItem[] {
  const byId = new Map(sources.map((source) => [source.pluginId, source]))

  // Attachment points must exist before satellites are processed because a
  // satellite may precede its host in registry order.
  const hostFirstEntry = new Map<string, PluginNavItem>()

  for (const source of sources) {
    if (!source.rollupInto && source.entries.length > 0) {
      hostFirstEntry.set(source.pluginId, { ...source.entries[0] })
    }
  }

  const topLevel: PluginNavItem[] = []

  for (const source of sources) {
    if (!source.rollupInto) {
      const [first, ...rest] = source.entries

      if (first) {
        topLevel.push(hostFirstEntry.get(source.pluginId) ?? first, ...rest)
      }

      continue
    }

    const root = resolveRootHost(source, byId)
    const attachPoint = root ? hostFirstEntry.get(root.pluginId) : undefined

    if (!attachPoint) {
      topLevel.push(...source.entries)
      continue
    }

    attachPoint.children = [...(attachPoint.children ?? []), ...source.entries]
  }

  return topLevel
}
