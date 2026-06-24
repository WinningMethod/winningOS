"use client"

import { useState } from "react"
import { Bot, Palette, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WorkspaceSection } from "@/components/app/settings/workspace-section"
import { RolesSection } from "@/components/app/settings/roles-section"
import { BrandingSection } from "@/components/app/settings/branding-section"
import { AgentSection } from "@/components/app/settings/agent-section"

const tabs = [
  { key: "workspace", label: "Workspace", icon: SlidersHorizontal },
  { key: "roles", label: "Roles", icon: ShieldCheck },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "agent", label: "Agent", icon: Bot },
] as const

type TabKey = (typeof tabs)[number]["key"]

export default function SettingsPage() {
  const [active, setActive] = useState<TabKey>("workspace")

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
                role="tab"
                type="button"
                aria-selected={selected}
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

      <div className="mt-6">
        {active === "workspace" && <WorkspaceSection />}
        {active === "roles" && <RolesSection />}
        {active === "branding" && <BrandingSection />}
        {active === "agent" && <AgentSection />}
      </div>
    </PageContainer>
  )
}
