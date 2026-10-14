import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { BrandingSection } from "@/components/app/settings/branding-section"
import { PluginsSection } from "@/components/app/settings/plugins-section"
import { RolesSection } from "@/components/app/settings/roles-section"
import { SettingsTabs } from "@/components/app/settings/settings-tabs"
import { WorkspaceSection } from "@/components/app/settings/workspace-section"
import { getCoreRolesOverview } from "@/core/permissions/data"
import { getCoreSettingsOverview } from "@/core/settings/data"
import { cn } from "@/lib/utils"

const STATUS_NOTICE_META: Record<string, { message: string; isFailure: boolean }> = {
  "role-permission-updated": { message: "Role permission updated.", isFailure: false },
  "role-permission-failed": {
    message: "Role permission update failed. Only owners can edit grants, and owner and structural permissions are locked.",
    isFailure: true,
  },
  "workspace-updated": { message: "Workspace settings saved.", isFailure: false },
  "workspace-invalid": {
    message: "Workspace settings were not saved. Name is required (max 120 characters) and the slug must be lowercase letters, numbers, and hyphens.",
    isFailure: true,
  },
  "workspace-failed": {
    message: "Workspace settings update failed. Check permissions and try again.",
    isFailure: true,
  },
  "branding-updated": { message: "Branding saved.", isFailure: false },
  "branding-invalid": {
    message: "Branding was not saved. Brand name is required, the logo URL must be https://, and each theme color must be a #rrggbb hex value.",
    isFailure: true,
  },
  "branding-logo-invalid": {
    message: "Branding was not saved. Logo uploads must be an SVG, PNG, JPEG, or WebP up to 2 MB.",
    isFailure: true,
  },
  "branding-failed": {
    message: "Branding update failed. Check permissions and try again.",
    isFailure: true,
  },
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; status?: string }>
}) {
  const params = await searchParams
  const statusNotice = STATUS_NOTICE_META[params?.status ?? ""] ?? null

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Workspace configuration in one place. Workspace, roles, and branding are live Core data; each section saves on its own."
      />

      {statusNotice ? (
        <div
          role={statusNotice.isFailure ? "alert" : "status"}
          className={cn(
            "mt-5 rounded-md border px-3 py-2.5 text-sm",
            statusNotice.isFailure
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-muted/40 text-muted-foreground",
          )}
        >
          {statusNotice.message}
        </div>
      ) : null}

      <SettingsTabs
        workspacePanel={<Suspense fallback={<PanelSkeleton />}><WorkspacePanel /></Suspense>}
        rolesPanel={<Suspense fallback={<PanelSkeleton />}><RolesPanel /></Suspense>}
        brandingPanel={<Suspense fallback={<PanelSkeleton />}><BrandingPanel /></Suspense>}
        pluginsPanel={<Suspense fallback={<PanelSkeleton />}><PluginsSection /></Suspense>}
        initialTab={params?.tab}
      />
    </PageContainer>
  )
}

function PanelSkeleton() {
  return <div role="status" aria-label="Loading settings section" className="space-y-6 rounded-lg border border-border p-6">
    <span className="sr-only">Loading settings section…</span>
    <Skeleton className="h-5 w-40" /><Skeleton className="h-10 w-full max-w-xl" /><Skeleton className="h-10 w-full max-w-xl" /><Skeleton className="h-9 w-28" />
  </div>
}
async function WorkspacePanel() {
  const overview = await getCoreSettingsOverview()
  return <WorkspaceSection workspace={overview.workspace} canManage={overview.canManageWorkspace} />
}
async function BrandingPanel() {
  const overview = await getCoreSettingsOverview()
  return <BrandingSection branding={overview.branding} canManage={overview.canManageBranding} />
}
async function RolesPanel() {
  return <RolesSection overview={await getCoreRolesOverview()} />
}
