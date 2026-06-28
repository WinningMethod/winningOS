import { Check, Lock, Minus, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CoreRolesOverview } from "@/core/permissions/data"
import { setRolePermission } from "@/core/permissions/actions"
import { CORE_ROLE_KEYS, type CoreRoleKey } from "@/core/permissions/catalog"

const roleColumnLabels: Record<CoreRoleKey, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
}

export function RolesSection({ overview }: { overview: CoreRolesOverview }) {
  const { roles, namespaces, countsAvailable, canManageRoles, grantsLive } = overview

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
            {canManageRoles
              ? "Toggle a grant to change what Admin, Member, and Viewer can do — each change saves immediately. Owner always holds every permission, and the structural owner-only permissions (workspace deletion, member invite/remove, role management) are locked. Every change is enforced server-side."
              : "Explicit action strings grouped by namespace, and the system roles that hold each one. This is the live Core permission catalog — the same grants the server enforces. Only owners can edit these."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!grantsLive && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400"
            >
              Permission data could not be refreshed — showing catalog defaults. Edits are disabled until the database is reachable.
            </div>
          )}
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
                  <NamespaceRows key={group.namespace} group={group} canManageRoles={canManageRoles && grantsLive} />
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
          <p className="text-sm font-medium">Editing the four system roles</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Owners can adjust Admin, Member, and Viewer grants here; Owner and the structural owner-only permissions stay
            fixed so no one can lock the workspace out. Custom roles arrive later. UI visibility is never the security
            boundary — server-side RPC checks and row-level policies enforce every grant.
          </p>
        </div>
      </div>
    </div>
  )
}

function NamespaceRows({
  group,
  canManageRoles,
}: {
  group: CoreRolesOverview["namespaces"][number]
  canManageRoles: boolean
}) {
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
              <GrantCell
                roleKey={roleKey}
                roleLabel={roleColumnLabels[roleKey]}
                permissionKey={permission.key}
                granted={permission.grants[roleKey]}
                editable={canManageRoles && permission.editable[roleKey]}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function GrantCell({
  roleKey,
  roleLabel,
  permissionKey,
  granted,
  editable,
}: {
  roleKey: CoreRoleKey
  roleLabel: string
  permissionKey: string
  granted: boolean
  editable: boolean
}) {
  if (!editable) {
    return (
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center",
          granted ? "text-[var(--color-success)]" : "text-muted-foreground/40",
        )}
      >
        {granted ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        <span className="sr-only">
          {roleLabel} {granted ? "has" : "does not have"} {permissionKey}
        </span>
      </span>
    )
  }

  return (
    <form action={setRolePermission} className="inline-flex">
      <input type="hidden" name="roleKey" value={roleKey} />
      <input type="hidden" name="permissionKey" value={permissionKey} />
      <input type="hidden" name="granted" value={(!granted).toString()} />
      <button
        type="submit"
        aria-pressed={granted}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          granted
            ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20"
            : "border-border text-muted-foreground/50 hover:bg-accent hover:text-accent-foreground",
        )}
      >
        {granted ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        <span className="sr-only">
          {granted ? `Revoke ${permissionKey} from ${roleLabel}` : `Grant ${permissionKey} to ${roleLabel}`}
        </span>
      </button>
    </form>
  )
}
