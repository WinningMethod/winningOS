"use client"

import { useRef, useState } from "react"
import { Palette, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WorkspaceSection } from "@/components/app/settings/workspace-section"
import { RolesSection } from "@/components/app/settings/roles-section"
import { BrandingSection } from "@/components/app/settings/branding-section"

const tabs = [
  { key: "workspace", label: "Workspace", icon: SlidersHorizontal },
  { key: "roles", label: "Roles", icon: ShieldCheck },
  { key: "branding", label: "Branding", icon: Palette },
] as const

type TabKey = (typeof tabs)[number]["key"]

export default function SettingsPage() {
  const [active, setActive] = useState<TabKey>("workspace")
  const tabRefs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({})

  // Roving-tabindex keyboard nav for the WAI-ARIA tabs pattern.
  function onTabKeyDown(e: React.KeyboardEvent) {
    const current = tabs.findIndex((t) => t.key === active)
    let nextIndex = current
    if (e.key === "ArrowRight") nextIndex = (current + 1) % tabs.length
    else if (e.key === "ArrowLeft") nextIndex = (current - 1 + tabs.length) % tabs.length
    else if (e.key === "Home") nextIndex = 0
    else if (e.key === "End") nextIndex = tabs.length - 1
    else return
    e.preventDefault()
    const nextKey = tabs[nextIndex].key
    setActive(nextKey)
    tabRefs.current[nextKey]?.focus()
  }

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Workspace configuration in one place. Everything here is a static wireframe — changes are not saved."
        actions={<Button>Save changes</Button>}
      />

      {/* Tabs */}
      <div className="mt-6 border-b border-border">
        <div role="tablist" aria-label="Settings sections" className="-mb-px flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const selected = active === tab.key
            return (
              <button
                key={tab.key}
                id={`settings-tab-${tab.key}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`settings-panel-${tab.key}`}
                tabIndex={selected ? 0 : -1}
                ref={(el) => {
                  tabRefs.current[tab.key] = el
                }}
                onClick={() => setActive(tab.key)}
                onKeyDown={onTabKeyDown}
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
        role="tabpanel"
        id={`settings-panel-${active}`}
        aria-labelledby={`settings-tab-${active}`}
        tabIndex={0}
        className="mt-6 focus-visible:outline-none"
      >
        {active === "workspace" && <WorkspaceSection />}
        {active === "roles" && <RolesSection />}
        {active === "branding" && <BrandingSection />}
      </div>
    </PageContainer>
  )
}
