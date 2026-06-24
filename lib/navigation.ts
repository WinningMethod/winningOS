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
