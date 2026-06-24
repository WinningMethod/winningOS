import { Check, Lock, Minus, ShieldCheck } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { permissionGroups, roles, type RoleName } from "@/lib/mock-data"

const roleOrder: RoleName[] = ["Owner", "Admin", "Member", "Viewer"]

export default function RolesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Roles & Permissions"
        description="System roles map to explicit permission strings. Permissions are intentionally plain and predictable."
      />

      {/* System roles */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {/* Coming-later framing */}
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
          <Lock className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium">Custom roles are read-only for now</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Core ships with four system roles. Deep role customization and a permission editor are planned for a
            later build. UI visibility is never the security boundary — server-side checks and row-level policies
            enforce access.
          </p>
        </div>
      </div>

      {/* Permission matrix */}
      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle>Permission matrix</CardTitle>
          <CardDescription>
            Each permission is an explicit action string grouped by namespace. This view is read-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Permissions granted to each system role</caption>
              <thead>
                <tr className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">Permission</th>
                  {roleOrder.map((r) => (
                    <th key={r} scope="col" className="px-4 py-3 text-center font-medium">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionGroups.map((group) => (
                  <GroupRows key={group.group} group={group} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

function GroupRows({ group }: { group: (typeof permissionGroups)[number] }) {
  return (
    <>
      <tr className="bg-muted/20">
        <th
          scope="colgroup"
          colSpan={5}
          className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground"
        >
          <span className="flex items-center gap-2">
            {group.group}
            {group.group === "Modules" && <Badge tone="muted">Later</Badge>}
          </span>
        </th>
      </tr>
      {group.permissions.map((perm) => (
        <tr key={perm.key} className="border-b border-border last:border-0 hover:bg-muted/30">
          <td className="px-4 py-3">
            <span className="block font-medium">{perm.label}</span>
            <code className="font-mono text-xs text-muted-foreground">{perm.key}</code>
          </td>
          {roleOrder.map((r) => (
            <td key={r} className="px-4 py-3 text-center">
              {perm.grants[r] ? (
                <span className="inline-flex items-center justify-center text-primary" aria-label="Granted">
                  <Check className="h-4 w-4" />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center text-muted-foreground/40" aria-label="Not granted">
                  <Minus className="h-4 w-4" />
                </span>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
