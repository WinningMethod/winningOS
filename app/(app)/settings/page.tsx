import { KeyRound, ShieldAlert } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { currentWorkspace } from "@/lib/mock-data"

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="General workspace configuration. Destructive actions are placeholders and do nothing in this wireframe."
        actions={<Button>Save changes</Button>}
      />

      <div className="mt-6 flex flex-col gap-6">
        {/* Workspace metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Name and slug identify this workspace across the deployment.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ws-name">Workspace name</Label>
                <Input id="ws-name" defaultValue={currentWorkspace.name} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ws-slug">Workspace slug</Label>
                <Input id="ws-slug" defaultValue={currentWorkspace.slug} className="font-mono text-xs" />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-3">
              <Meta label="Plan" value={currentWorkspace.plan} />
              <Meta label="Created" value={currentWorkspace.createdOn} />
              <Meta label="Workspace ID" value={currentWorkspace.id} mono />
            </dl>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Access controls. Authentication will be Supabase-backed in a later build.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <SettingRow
              icon={<KeyRound className="h-4 w-4" />}
              title="Require single sign-on"
              description="Members must authenticate through your identity provider."
            >
              <Switch label="Require single sign-on" />
            </SettingRow>
            <Separator />
            <SettingRow
              icon={<ShieldAlert className="h-4 w-4" />}
              title="Restrict invitations to admins"
              description="Only Owners and Admins can invite new members."
            >
              <Switch label="Restrict invitations to admins" defaultChecked />
            </SettingRow>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>Irreversible actions. Disabled in this wireframe.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Archive workspace</p>
                <p className="text-sm text-muted-foreground">
                  Make this workspace read-only for all members.
                </p>
              </div>
              <Button variant="outline" disabled>
                Archive
              </Button>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Delete workspace</p>
                <p className="text-sm text-muted-foreground">
                  Permanently remove the workspace and all data. Requires <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">workspace.delete</code>.
                </p>
              </div>
              <Button variant="destructive" disabled>
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={mono ? "mt-1 font-mono text-xs" : "mt-1 text-sm font-medium"}>{value}</dd>
    </div>
  )
}

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}
