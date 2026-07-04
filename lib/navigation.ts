import { Home, Users, Settings, type LucideIcon } from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  permission: string
  disabled?: boolean
  badge?: string
}

export const navItems: NavItem[] = [
  { label: "Home", href: "/home", icon: Home, permission: "workspace.view" },
  { label: "Members", href: "/members", icon: Users, permission: "members.view" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings.view" },
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
