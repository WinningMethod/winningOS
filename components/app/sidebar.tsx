"use client"

import { useMemo, useState } from "react"
import { WorkspaceLink as Link } from "@/components/app/workspace-navigation"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, EyeOff, SlidersHorizontal } from "lucide-react"
import { BrandMark } from "@/components/app/brand-mark"
import { NavCustomizer } from "@/components/app/nav-customizer"
import type { SidebarNavItem } from "@/lib/navigation"
import { buildSidebarNav, type NavLayout } from "@/lib/nav-layout"
import { resolvePluginNavIcon } from "@/lib/plugin-icons"
import { cn } from "@/lib/utils"

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/")
}

// A nav entry with a dropdown: intrinsic children (plugin rollups) render
// first, then children the member nested via their personal layout. Expanded
// state auto-follows the active route until the member toggles it by hand.
function NavEntry({
  item,
  layoutChildren = [],
  pathname,
  onNavigate,
}: {
  item: SidebarNavItem
  layoutChildren?: SidebarNavItem[]
  pathname: string
  onNavigate?: () => void
}) {
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null)
  const dropdown = [...(item.children ?? []), ...layoutChildren]

  if (dropdown.length === 0) {
    return <NavLink item={item} active={isActivePath(pathname, item.href)} onNavigate={onNavigate} />
  }

  const childActive = dropdown.some((child) => isActivePath(pathname, child.href))
  const expanded = expandedOverride ?? childActive
  const ToggleIcon = expanded ? ChevronDown : ChevronRight

  return (
    <>
      <div className="flex items-center">
        <div className="min-w-0 flex-1">
          <NavLink item={item} active={isActivePath(pathname, item.href)} onNavigate={onNavigate} />
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label} submenu`}
          onClick={() => setExpandedOverride(!expanded)}
          className="mr-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ToggleIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && (
        <ul className="flex flex-col gap-0.5 pt-0.5">
          {dropdown.map((child) => (
            <li key={child.key}>
              <NavLink item={child} active={isActivePath(pathname, child.href)} nested onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function NavLink({
  item,
  active,
  nested = false,
  muted = false,
  onNavigate,
}: {
  item: SidebarNavItem
  active: boolean
  nested?: boolean
  muted?: boolean
  onNavigate?: () => void
}) {
  const Icon = resolvePluginNavIcon(item.iconName)

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
        nested && "ml-6",
        active
          ? "bg-primary/10 font-medium text-primary"
          : muted
            ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export function SidebarContent({
  brandLogoUrl = null,
  brandName = null,
  navItems = [],
  navLayout = null,
  onNavigate,
}: {
  brandLogoUrl?: string | null
  brandName?: string | null
  navItems?: SidebarNavItem[]
  navLayout?: NavLayout | null
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const [customizing, setCustomizing] = useState(false)
  const [hiddenOpen, setHiddenOpen] = useState(false)

  const nav = useMemo(() => buildSidebarNav(navItems, navLayout), [navItems, navLayout])

  if (customizing) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
          <BrandMark logoUrl={brandLogoUrl} />
          <span className="truncate text-sm font-semibold tracking-tight">{brandName ?? "WinningOS"}</span>
          <span className="rounded border border-sidebar-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Core
          </span>
        </div>
        <NavCustomizer items={navItems} layout={navLayout} onClose={() => setCustomizing(false)} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
        <BrandMark logoUrl={brandLogoUrl} />
        <span className="truncate text-sm font-semibold tracking-tight">{brandName ?? "WinningOS"}</span>
        <span className="rounded border border-sidebar-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Core
        </span>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {nav.nodes.map((node, index) => {
            if (node.kind === "group") {
              return (
                <li key={`group-${index}-${node.label}`} className={cn(index > 0 && "pt-4")}>
                  <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {node.label}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {node.children.map((item) => (
                      <li key={item.key}>
                        <NavEntry item={item} pathname={pathname} onNavigate={onNavigate} />
                      </li>
                    ))}
                  </ul>
                </li>
              )
            }

            return (
              <li key={node.item.key}>
                <NavEntry item={node.item} layoutChildren={node.children} pathname={pathname} onNavigate={onNavigate} />
              </li>
            )
          })}
        </ul>

        {nav.hidden.length > 0 && (
          <div className="mt-4 border-t border-sidebar-border pt-3">
            <button
              type="button"
              aria-expanded={hiddenOpen}
              onClick={() => setHiddenOpen((open) => !open)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <EyeOff className="h-3 w-3" />
              <span className="flex-1 text-left">Hidden ({nav.hidden.length})</span>
              {hiddenOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {hiddenOpen && (
              <ul className="flex flex-col gap-0.5 pt-1">
                {nav.hidden.map((item) => (
                  <li key={item.key}>
                    <NavLink item={item} active={isActivePath(pathname, item.href)} muted onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={() => setCustomizing(true)}
          className="mb-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Customize navigation
        </button>
        <p className="rounded-md bg-muted px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          WinningOS Core — auth, members, roles, and settings run on live workspace data.
        </p>
      </div>
    </div>
  )
}
