"use client"

import { useState } from "react"
import Link from "next/link"
import { LogOut, Menu, UserRound, X } from "lucide-react"
import { SidebarContent } from "@/components/app/sidebar"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AppShellProps = {
  children: React.ReactNode
  workspaceName: string
  brandLogoUrl: string | null
  brandName: string | null
  profileName: string
  profileEmail: string | null
  roleKey: string
}

export function AppShell({ children, workspaceName, brandLogoUrl, brandName, profileName, profileEmail, roleKey }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent brandLogoUrl={brandLogoUrl} brandName={brandName} />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-sidebar-border bg-sidebar shadow-xl">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarContent brandLogoUrl={brandLogoUrl} brandName={brandName} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm">
            {brandLogoUrl ? (
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded border border-border bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote logo host is workspace-configured, not build-time known */}
                <img src={brandLogoUrl} alt="" aria-hidden="true" className="h-full w-full object-contain" />
              </span>
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[11px] font-semibold text-primary-foreground">
                {workspaceName.slice(0, 1)}
              </span>
            )}
            <span className="hidden font-medium sm:inline">{workspaceName}</span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />

            <Dropdown
              align="end"
              menuLabel="Account menu"
              trigger={({ open }) => (
                <span className={cn("rounded-full p-0.5 transition-colors hover:bg-accent", open && "bg-accent")}>
                  <Avatar name={profileName} size="sm" />
                </span>
              )}
            >
              <div className="px-2.5 py-2">
                <p className="text-sm font-medium">{profileName}</p>
                <p className="text-xs text-muted-foreground">{profileEmail ?? "Authenticated user"}</p>
                <p className="mt-1 text-[11px] font-medium uppercase text-primary">{roleKey}</p>
              </div>
              <DropdownSeparator />
              <DropdownItem disabled>
                <UserRound className="h-4 w-4" />
                Profile
              </DropdownItem>
              <Link href="/settings">
                <DropdownItem>
                  <UserRound className="h-4 w-4" />
                  Workspace settings
                </DropdownItem>
              </Link>
              <DropdownSeparator />
              <button
                type="submit"
                form="core-sign-out-form"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </Dropdown>
            <form id="core-sign-out-form" action="/auth/sign-out" method="post" className="hidden" />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
