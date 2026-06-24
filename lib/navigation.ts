import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Palette,
  Bot,
  Settings,
  Boxes,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  permission: string
  disabled?: boolean
  badge?: string
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "workspace.view" },
  { label: "Members", href: "/members", icon: Users, permission: "members.view" },
  { label: "Roles & Permissions", href: "/roles", icon: ShieldCheck, permission: "roles.view" },
  { label: "Branding", href: "/branding", icon: Palette, permission: "branding.view" },
  { label: "Agent", href: "/agent", icon: Bot, permission: "agent.view" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings.view" },
  { label: "Modules", href: "/modules", icon: Boxes, permission: "modules.view", disabled: true, badge: "Later" },
]
