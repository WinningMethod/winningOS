import { ShieldAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { currentWorkspace } from "@/lib/mock-data"

export function WorkspaceSection() {
  return (
    <div className="flex flex-col gap-6">
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
          <CardDescription>Access controls. Authentication will be Supabase-backed in a later build.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <SettingRow
            icon={<ShieldAlert className="h-4 w-4" />}
            title="Restrict invitations to admins"
            description="Only Owners and Admins can invite new members."
          >
            <Switch label="Restrict invitations to admins" defaultChecked />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Destructive actions, deferred */}
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Destructive actions such as archiving or deleting a workspace arrive in a later build, once the underlying
        behavior exists.
      </p>
    </div>
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
