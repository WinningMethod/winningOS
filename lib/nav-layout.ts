// Per-user sidebar layout model. Pure and client-safe: the same code sanitizes
// layouts read from core_nav_preferences (server), reconciles them against the
// nav items the viewer is currently allowed to see, and drives the in-sidebar
// customizer (client).
//
// A layout is a shallow tree, capped at two levels:
// - top-level "item" nodes, optionally carrying child item keys rendered as an
//   expandable dropdown under the parent
// - "group" nodes: a user-named category header with child item keys
// - a flat "hidden" list rendered as the collapsed section at the bottom
//
// Keys reference nav items by href (see lib/navigation.ts). Keys that do not
// resolve to a currently visible item are skipped at render time but preserved
// in storage, so an item whose plugin is reinstalled (or whose permission is
// restored) reappears exactly where the user left it.

import type { SidebarNavItem } from "@/lib/navigation"

export const NAV_LAYOUT_VERSION = 1

export type NavLayoutNode =
  | { type: "item"; key: string; children?: string[] }
  | { type: "group"; label: string; children: string[] }

export type NavLayout = {
  version: typeof NAV_LAYOUT_VERSION
  nodes: NavLayoutNode[]
  hidden: string[]
}

// Resolved tree the sidebar renders after reconciling a layout against the
// viewer's visible items. An item node's `children` are LAYOUT children (the
// user nested them); items may additionally carry intrinsic `children` of
// their own (plugin nav rollups — see lib/navigation.ts). Rendering shows
// intrinsic children first, then layout children; the customizer edits only
// the latter.
export type SidebarNavNode =
  | { kind: "item"; item: SidebarNavItem; children: SidebarNavItem[] }
  | { kind: "group"; label: string; children: SidebarNavItem[] }

export type SidebarNav = {
  nodes: SidebarNavNode[]
  hidden: SidebarNavItem[]
}

const MAX_NODES = 200
const MAX_CHILDREN = 100
const MAX_HIDDEN = 200
const MAX_KEY_LENGTH = 300
export const MAX_GROUP_LABEL_LENGTH = 60

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Every key may appear at most once across nodes, children, and hidden;
// duplicates keep their first occurrence so a corrupted layout degrades to
// something sensible instead of rendering an item twice.
function readKeys(value: unknown, seen: Set<string>, max: number): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const keys: string[] = []

  for (const entry of value) {
    if (keys.length >= max) {
      break
    }

    if (typeof entry !== "string" || !entry || entry.length > MAX_KEY_LENGTH || seen.has(entry)) {
      continue
    }

    seen.add(entry)
    keys.push(entry)
  }

  return keys
}

/**
 * Parse untrusted JSON (from the database or a client submission) into a
 * well-formed NavLayout, or null when it isn't one. Unknown fields, duplicate
 * keys, malformed nodes, and over-limit collections are dropped rather than
 * rejected wholesale.
 */
export function sanitizeNavLayout(value: unknown): NavLayout | null {
  if (!isRecord(value) || value.version !== NAV_LAYOUT_VERSION || !Array.isArray(value.nodes)) {
    return null
  }

  const seen = new Set<string>()
  const nodes: NavLayoutNode[] = []

  for (const rawNode of value.nodes) {
    if (nodes.length >= MAX_NODES || !isRecord(rawNode)) {
      continue
    }

    if (rawNode.type === "item") {
      const key = rawNode.key

      if (typeof key !== "string" || !key || key.length > MAX_KEY_LENGTH || seen.has(key)) {
        continue
      }

      seen.add(key)
      const children = readKeys(rawNode.children, seen, MAX_CHILDREN)
      nodes.push(children.length > 0 ? { type: "item", key, children } : { type: "item", key })
      continue
    }

    if (rawNode.type === "group") {
      const label = typeof rawNode.label === "string" ? rawNode.label.trim().slice(0, MAX_GROUP_LABEL_LENGTH) : ""
      const children = readKeys(rawNode.children, seen, MAX_CHILDREN)

      // A group with no label or no members carries no information worth
      // persisting.
      if (label && children.length > 0) {
        nodes.push({ type: "group", label, children })
      }
    }
  }

  return {
    version: NAV_LAYOUT_VERSION,
    nodes,
    hidden: readKeys(value.hidden, seen, MAX_HIDDEN),
  }
}

/**
 * The layout an uncustomized member sees: the classic "Workspace" group for
 * core items and a "Plugins" group for plugin items. Also the starting point
 * the customizer edits from, so customization begins at the familiar shape.
 */
export function defaultNavLayout(items: SidebarNavItem[]): NavLayout {
  const coreKeys = items.filter((item) => item.source === "core").map((item) => item.key)
  const pluginKeys = items.filter((item) => item.source === "plugin").map((item) => item.key)

  const nodes: NavLayoutNode[] = []

  if (coreKeys.length > 0) {
    nodes.push({ type: "group", label: "Workspace", children: coreKeys })
  }

  if (pluginKeys.length > 0) {
    nodes.push({ type: "group", label: "Plugins", children: pluginKeys })
  }

  return { version: NAV_LAYOUT_VERSION, nodes, hidden: [] }
}

/**
 * Reconcile a stored layout against the items the viewer can currently see.
 * Keys without a visible item are skipped (not deleted — see module comment);
 * visible items the layout never mentions (newly installed plugins, newly
 * granted permissions) are appended as top-level entries in default order so
 * nothing a user is entitled to can silently disappear.
 */
export function buildSidebarNav(items: SidebarNavItem[], layout: NavLayout | null): SidebarNav {
  const effective = layout ?? defaultNavLayout(items)
  const byKey = new Map(items.map((item) => [item.key, item]))
  const placed = new Set<string>()

  // Groups may contain rollup clusters (they still render their dropdown
  // there), but an item's dropdown may not: a cluster nested inside another
  // item's dropdown would put the cluster's own children at an unreachable
  // depth. A disallowed cluster is left unplaced and falls through to a
  // top-level append, so a layout saved before the item became a rollup host
  // degrades safely.
  const resolveChildren = (keys: string[] | undefined, allowClusters: boolean): SidebarNavItem[] => {
    const children: SidebarNavItem[] = []

    for (const key of keys ?? []) {
      const item = byKey.get(key)

      if (item && !placed.has(key) && (allowClusters || !item.children?.length)) {
        placed.add(key)
        children.push(item)
      }
    }

    return children
  }

  const nodes: SidebarNavNode[] = []

  for (const node of effective.nodes) {
    if (node.type === "item") {
      const item = byKey.get(node.key)

      if (item && !placed.has(node.key)) {
        placed.add(node.key)
        nodes.push({ kind: "item", item, children: resolveChildren(node.children, false) })
      } else {
        // Parent is invisible but its children may still be: promote them so
        // losing access to a parent never hides its children too.
        for (const child of resolveChildren(node.children, true)) {
          nodes.push({ kind: "item", item: child, children: [] })
        }
      }

      continue
    }

    const children = resolveChildren(node.children, true)

    if (children.length > 0) {
      nodes.push({ kind: "group", label: node.label, children })
    }
  }

  const hidden: SidebarNavItem[] = []

  for (const key of effective.hidden) {
    const item = byKey.get(key)

    if (item && !placed.has(key)) {
      placed.add(key)
      hidden.push(item)
    }
  }

  for (const item of items) {
    if (!placed.has(item.key)) {
      nodes.push({ kind: "item", item, children: [] })
    }
  }

  return { nodes, hidden }
}
