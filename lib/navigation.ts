// Core nav entries mirror the plugin shape: serializable data with the icon
// carried as a name string (resolved client-side via lib/plugin-icons.ts).
// Both feed the unified per-user sidebar model in lib/nav-layout.ts, so every
// entry needs a stable string key that survives the server -> client boundary
// and can be persisted in core_nav_preferences. The href doubles as that key.
export type CoreNavItem = {
  label: string
  href: string
  iconName: string
  permission: string
}

export const coreNavItems: CoreNavItem[] = [
  { label: "Home", href: "/home", iconName: "Home", permission: "workspace.view" },
  { label: "Members", href: "/members", iconName: "Users", permission: "members.view" },
  { label: "Settings", href: "/settings", iconName: "Settings", permission: "settings.view" },
]

// Plugin nav entries are computed server-side (permission-filtered against the
// live grant map in core/plugins/navigation.ts) and passed to the client
// sidebar as serializable data — icon is a name string resolved client-side
// via lib/plugin-icons.ts, not a component reference.
export type PluginNavItem = {
  pluginId: string
  label: string
  href: string
  iconName: string
}

// One sidebar entry after core and plugin sources are merged. `key` is the
// identity persisted in per-user layouts; it equals the href because hrefs are
// unique across core routes and /p/{plugin} routes and stay stable across
// renames of the visible label.
export type SidebarNavItem = {
  key: string
  label: string
  href: string
  iconName: string
  source: "core" | "plugin"
}

export function toSidebarNavItems(
  core: CoreNavItem[],
  plugins: PluginNavItem[],
): SidebarNavItem[] {
  return [
    ...core.map((item) => ({
      key: item.href,
      label: item.label,
      href: item.href,
      iconName: item.iconName,
      source: "core" as const,
    })),
    ...plugins.map((item) => ({
      key: item.href,
      label: item.label,
      href: item.href,
      iconName: item.iconName,
      source: "plugin" as const,
    })),
  ]
}
