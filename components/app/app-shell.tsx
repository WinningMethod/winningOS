"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, ChevronsUpDown, LogOut, Menu, Plus, UserRound, X } from "lucide-react"
import { SidebarContent } from "@/components/app/sidebar"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/dropdown"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { workspaces, currentWorkspace, currentProfile } from "@/lib/mock-data"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeWorkspace, setActiveWorkspace] = useState(currentWorkspace.id)

  const workspace = workspaces.find((w) => w.id === activeWorkspace) ?? currentWorkspace

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile drawer */}
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
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
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

          {/* Workspace switcher */}
          <Dropdown
            menuLabel="Switch workspace"
            trigger={({ open }) => (
              <span
                className={cn(
                  "flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-accent",
                  open && "bg-accent",
                )}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[11px] font-semibold text-primary-foreground">
                  {workspace.name.slice(0, 1)}
                </span>
                <span className="hidden font-medium sm:inline">{workspace.name}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}
          >
            <DropdownLabel>Workspaces</DropdownLabel>
            {workspaces.map((w) => (
              <DropdownItem
                key={w.id}
                active={w.id === activeWorkspace}
                onClick={() => setActiveWorkspace(w.id)}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-secondary text-[11px] font-semibold text-secondary-foreground">
                  {w.name.slice(0, 1)}
                </span>
                <span className="flex-1">
                  <span className="block text-sm">{w.name}</span>
                  <span className="block text-xs text-muted-foreground">{w.slug}</span>
                </span>
                {w.id === activeWorkspace && <Check className="h-4 w-4 text-primary" />}
              </DropdownItem>
            ))}
            <DropdownSeparator />
            <DropdownItem className="text-muted-foreground" disabled>
              <Plus className="h-4 w-4" />
              New workspace
            </DropdownItem>
          </Dropdown>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />

            {/* Profile menu */}
            <Dropdown
              align="end"
              menuLabel="Account menu"
              trigger={({ open }) => (
                <span className={cn("rounded-full p-0.5 transition-colors hover:bg-accent", open && "bg-accent")}>
                  <Avatar name={currentProfile.name} size="sm" />
                </span>
              )}
            >
              <div className="px-2.5 py-2">
                <p className="text-sm font-medium">{currentProfile.name}</p>
                <p className="text-xs text-muted-foreground">{currentProfile.email}</p>
                <p className="mt-1 text-[11px] font-medium text-primary">{currentProfile.role}</p>
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
              <DropdownItem disabled className="text-muted-foreground">
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownItem>
            </Dropdown>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
