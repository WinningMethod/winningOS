import { Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateWorkspaceSettings } from "@/core/settings/actions"
import type { CoreWorkspaceOverview } from "@/core/settings/data"

function formatCreated(value: string | null): string {
  if (!value) {
    return "Unknown"
  }

  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(value))
}

export function WorkspaceSection({
  workspace,
  canManage,
}: {
  workspace: CoreWorkspaceOverview | null
  canManage: boolean
}) {
  if (!workspace) {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Workspace data could not be loaded. Refresh the page to try again.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Workspace metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>
            {canManage
              ? "Name and slug identify this workspace across the deployment. Changes save immediately and are recorded in the audit trail."
              : "Name and slug identify this workspace across the deployment. You need the workspace.manage permission to edit them."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form action={updateWorkspaceSettings} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ws-name">Workspace name</Label>
                <Input
                  id="ws-name"
                  name="name"
                  defaultValue={workspace.name}
                  required
                  maxLength={120}
                  disabled={!canManage}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ws-slug">Workspace slug</Label>
                <Input
                  id="ws-slug"
                  name="slug"
                  defaultValue={workspace.slug}
                  required
                  maxLength={60}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Lowercase letters, numbers, and hyphens"
                  aria-describedby="ws-slug-hint"
                  className="font-mono text-xs"
                  disabled={!canManage}
                />
                <p id="ws-slug-hint" className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and hyphens. A machine-readable label for exports and
                  future integrations — nothing in Core resolves by it, so it is safe to change.
                </p>
              </div>
            </div>
            {canManage && (
              <div>
                <Button type="submit">
                  <Save className="h-4 w-4" />
                  Save workspace
                </Button>
              </div>
            )}
          </form>
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-3">
            <Meta label="Edition" value="Core v0.1" />
            <Meta label="Created" value={formatCreated(workspace.createdAt)} />
            <Meta label="Workspace ID" value={workspace.id} mono />
          </dl>
        </CardContent>
      </Card>

      {/* Destructive actions, deferred */}
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Destructive actions such as archiving or deleting a workspace arrive in a later build, once the underlying
        behavior exists. Invitation and access rules live in Settings → Roles.
      </p>
    </div>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={mono ? "mt-1 break-all font-mono text-xs" : "mt-1 text-sm font-medium"}>{value}</dd>
    </div>
  )
}
