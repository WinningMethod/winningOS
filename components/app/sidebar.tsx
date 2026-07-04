"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BrandMark } from "@/components/app/brand-mark"
import { navItems, type PluginNavItem } from "@/lib/navigation"
import { resolvePluginNavIcon } from "@/lib/plugin-icons"
import { cn } from "@/lib/utils"

export function SidebarContent({
  brandLogoUrl = null,
  brandName = null,
  pluginNavItems = [],
  onNavigate,
}: {
  brandLogoUrl?: string | null
  brandName?: string | null
  pluginNavItems?: PluginNavItem[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()

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
        <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon

            if (item.disabled) {
              return (
                <li key={item.href}>
                  <span
                    aria-disabled="true"
                    className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="rounded border border-sidebar-border px-1.5 py-0.5 text-[10px] font-medium">
                        {item.badge}
                      </span>
                    )}
                  </span>
                </li>
              )
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {pluginNavItems.length > 0 && (
          <>
            <p className="px-3 pb-2 pt-5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Plugins
            </p>
            <ul className="flex flex-col gap-0.5">
              {pluginNavItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/")
                const Icon = resolvePluginNavIcon(item.iconName)

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                        active
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <p className="rounded-md bg-muted px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          WinningOS Core — auth, members, roles, and settings run on live workspace data.
        </p>
      </div>
    </div>
  )
}
