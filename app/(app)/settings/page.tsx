import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { SettingsTabs } from "@/components/app/settings/settings-tabs"
import { getCoreRolesOverview } from "@/core/permissions/data"
import { cn } from "@/lib/utils"

const STATUS_NOTICE_META: Record<string, { message: string; isFailure: boolean }> = {
  "role-permission-updated": { message: "Role permission updated.", isFailure: false },
  "role-permission-failed": {
    message: "Role permission update failed. Only owners can edit grants, and owner and structural permissions are locked.",
    isFailure: true,
  },
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; status?: string }>
}) {
  const params = await searchParams
  const rolesOverview = await getCoreRolesOverview()
  const statusNotice = STATUS_NOTICE_META[params?.status ?? ""] ?? null

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Workspace configuration in one place. Roles and permissions are live Core data; owners can edit role grants. Workspace and Branding are still wireframe."
        actions={<Button>Save changes</Button>}
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

      <SettingsTabs rolesOverview={rolesOverview} initialTab={params?.tab} />
    </PageContainer>
  )
}
