import { Lock, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { permissionGroups, roles } from "@/lib/mock-data"

export function RolesSection() {
  return (
    <div className="flex flex-col gap-6">
      {/* System roles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {roles.map((role) => (
          <Card key={role.name}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <Badge tone="muted">System</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold">{role.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{role.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {role.memberCount} {role.memberCount === 1 ? "member" : "members"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grouped permission summary */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            Permissions are explicit action strings grouped by namespace. A full per-role editor arrives once
            permissions are real.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {permissionGroups.map((group) => (
            <div key={group.group} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:gap-6">
              <div className="sm:w-48 sm:shrink-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {group.group}
                  {group.group === "Plugins" && <Badge tone="muted">Later</Badge>}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{group.description}</p>
              </div>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {group.permissions.map((perm) => (
                  <code
                    key={perm.key}
                    className="rounded border border-border bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground"
                  >
                    {perm.key}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Coming-later framing */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
          <Lock className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium">Custom roles are read-only for now</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Core ships with four system roles. UI visibility is never the security boundary — server-side checks and
            row-level policies enforce access.
          </p>
        </div>
      </div>
    </div>
  )
}
