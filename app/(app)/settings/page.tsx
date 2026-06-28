import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { SettingsTabs } from "@/components/app/settings/settings-tabs"
import { getCoreRolesOverview } from "@/core/permissions/data"

export default async function SettingsPage() {
  const rolesOverview = await getCoreRolesOverview()

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Workspace configuration in one place. Roles and permissions are live, read-only Core data; Workspace and Branding are still wireframe."
        actions={<Button>Save changes</Button>}
      />

      <SettingsTabs rolesOverview={rolesOverview} />
    </PageContainer>
  )
}
