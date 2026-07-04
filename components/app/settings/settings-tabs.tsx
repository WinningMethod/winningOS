"use client"

import { useEffect, useState } from "react"
import { Palette, Puzzle, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { WorkspaceSection } from "@/components/app/settings/workspace-section"
import { RolesSection } from "@/components/app/settings/roles-section"
import { BrandingSection } from "@/components/app/settings/branding-section"
import type { CoreRolesOverview } from "@/core/permissions/data"
import type { CoreSettingsOverview } from "@/core/settings/data"

const tabs = [
  { key: "workspace", label: "Workspace", icon: SlidersHorizontal },
  { key: "roles", label: "Roles", icon: ShieldCheck },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "plugins", label: "Plugins", icon: Puzzle },
] as const

type TabKey = (typeof tabs)[number]["key"]

function isTabKey(value: string | undefined): value is TabKey {
  return tabs.some((tab) => tab.key === value)
}

export function SettingsTabs({
  rolesOverview,
  settingsOverview,
  pluginsPanel,
  initialTab,
}: {
  rolesOverview: CoreRolesOverview
  settingsOverview: CoreSettingsOverview
  // Server-rendered Settings → Plugins content (plugins-section.tsx). Passed
  // as a ReactNode because manifest settings panels may be server components.
  pluginsPanel: React.ReactNode
  initialTab?: string
}) {
  const [active, setActive] = useState<TabKey>(isTabKey(initialTab) ? initialTab : "workspace")

  // Sync when the server redirects back with a new ?tab= param. useState only
  // uses its initializer on mount; a soft-nav re-render (e.g. after a form
  // action redirect) delivers a new initialTab prop without unmounting the
  // component, so we need this effect to actually switch the panel.
  useEffect(() => {
    setActive(isTabKey(initialTab) ? initialTab : "workspace")
  }, [initialTab])

  return (
    <>
      {/* Tabs */}
      <div className="mt-6 border-b border-border">
        <div role="tablist" aria-label="Settings sections" className="-mb-px flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const selected = active === tab.key
            return (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`panel-${tab.key}`}
                onClick={() => setActive(tab.key)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        id={`panel-${active}`}
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        className="mt-6"
      >
        {active === "workspace" && (
          <WorkspaceSection
            workspace={settingsOverview.workspace}
            canManage={settingsOverview.canManageWorkspace}
          />
        )}
        {active === "roles" && <RolesSection overview={rolesOverview} />}
        {active === "branding" && (
          <BrandingSection
            branding={settingsOverview.branding}
            canManage={settingsOverview.canManageBranding}
          />
        )}
        {active === "plugins" && pluginsPanel}
      </div>
    </>
  )
}
