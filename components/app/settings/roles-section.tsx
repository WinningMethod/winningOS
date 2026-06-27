import { Check, Lock, Minus, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CoreRolesOverview } from "@/core/permissions/data"
import { CORE_ROLE_KEYS, type CoreRoleKey } from "@/core/permissions/catalog"

const roleColumnLabels: Record<CoreRoleKey, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
}

export function RolesSection({ overview }: { overview: CoreRolesOverview }) {
  const { roles, namespaces, countsAvailable } = overview

  return (
    <div className="flex flex-col gap-6">
      {/* System roles with live member counts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {roles.map((role) => (
          <Card key={role.key}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                {role.isSystem && <Badge tone="muted">System</Badge>}
              </div>
              <p className="mt-3 text-sm font-semibold">{role.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{role.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {countsAvailable
                  ? `${role.memberCount} active ${role.memberCount === 1 ? "member" : "members"}`
                  : "Member count unavailable"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Real per-role permission grid */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            Explicit action strings grouped by namespace, and the system roles that hold each one. This is the live
            Core permission catalog — the same grants the server enforces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pr-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Permission
                  </th>
                  {CORE_ROLE_KEYS.map((roleKey) => (
                    <th
                      key={roleKey}
                      scope="col"
                      className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {roleColumnLabels[roleKey]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {namespaces.map((group) => (
                  <NamespaceRows key={group.namespace} group={group} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Security framing */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
          <Lock className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium">Custom roles arrive later</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Core ships with four read-only system roles. UI visibility is never the security boundary — server-side RPC
            checks and row-level policies enforce these grants.
          </p>
        </div>
      </div>
    </div>
  )
}

function NamespaceRows({ group }: { group: CoreRolesOverview["namespaces"][number] }) {
  return (
    <>
      <tr className="border-b border-border bg-muted/30">
        <th
          colSpan={1 + CORE_ROLE_KEYS.length}
          className="py-2 pr-4 text-left text-xs font-semibold text-foreground"
        >
          {group.label}
          <span className="ml-2 font-normal text-muted-foreground">{group.description}</span>
        </th>
      </tr>
      {group.permissions.map((permission) => (
        <tr key={permission.key} className="border-b border-border last:border-0">
          <th scope="row" className="py-2.5 pr-4 text-left align-top font-normal">
            <code className="font-mono text-xs text-foreground">{permission.key}</code>
            <span className="mt-0.5 block text-xs text-muted-foreground">{permission.name}</span>
          </th>
          {CORE_ROLE_KEYS.map((roleKey) => (
            <td key={roleKey} className="px-3 py-2.5 text-center align-top">
              <GrantCell granted={permission.grants[roleKey]} role={roleColumnLabels[roleKey]} permission={permission.key} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function GrantCell({ granted, role, permission }: { granted: boolean; role: string; permission: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center",
        granted ? "text-[var(--color-success)]" : "text-muted-foreground/40",
      )}
    >
      {granted ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      <span className="sr-only">
        {role} {granted ? "has" : "does not have"} {permission}
      </span>
    </span>
  )
}
