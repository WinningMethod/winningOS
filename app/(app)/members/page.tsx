import { Search, UserCheck, UserMinus, UserPlus, UserX, Users } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/app/states"
import { cn } from "@/lib/utils"
import { inviteMember, activateMember, disableMember, removeMember } from "@/core/members/actions"
import { getCoreMembers, type CoreMember, type CoreMemberRoleKey, type CoreMemberStatus } from "@/core/members/data"

const filters: { key: CoreMemberStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_access", label: "Pending access" },
  { key: "invited", label: "Invited" },
  { key: "active", label: "Active" },
  { key: "disabled", label: "Disabled" },
]

const assignableRoles: { key: Exclude<CoreMemberRoleKey, "owner">; label: string }[] = [
  { key: "admin", label: "Admin" },
  { key: "member", label: "Member" },
  { key: "viewer", label: "Viewer" },
]

const statusMeta: Record<CoreMemberStatus, { label: string; tone: "success" | "warning" | "muted" }> = {
  active: { label: "Active", tone: "success" },
  invited: { label: "Invited", tone: "warning" },
  pending_access: { label: "Pending access", tone: "warning" },
  disabled: { label: "Disabled", tone: "muted" },
}

const STATUS_NOTICE_META: Record<string, { message: string; isFailure: boolean }> = {
  updated: { message: "Member access updated.", isFailure: false },
  removed: { message: "Member access removed.", isFailure: false },
  "member-added": {
    message: "Existing auth user added to this workspace. Ask them to sign in with a magic link.",
    isFailure: false,
  },
  invited: { message: "Member invite sent. They will appear as active after signing in.", isFailure: false },
  "invite-rate-limited": {
    message: "Invite email rate limit reached. Invite email was not sent and the user was not added. Wait a minute, then try again.",
    isFailure: true,
  },
  "invite-failed": {
    message: "Member invite failed. The email provider could not create or send the invite; try again in a moment.",
    isFailure: true,
  },
  "invite-removed": {
    message: "This person was removed from this workspace and can't be re-invited from the Members page.",
    isFailure: true,
  },
  failed: { message: "Member access update failed. Check permissions and try again.", isFailure: true },
}

function roleLabel(roleKey: CoreMemberRoleKey | null, roleName: string | null): string {
  return roleName ?? (roleKey ? `${roleKey[0].toUpperCase()}${roleKey.slice(1)}` : "No role")
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Pending"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

function filterMembers(members: CoreMember[], filter: CoreMemberStatus | "all", query: string): CoreMember[] {
  const normalizedQuery = query.trim().toLowerCase()

  return members.filter((member) => {
    const matchesFilter = filter === "all" || member.status === filter
    const matchesQuery =
      normalizedQuery === ""
      || member.displayName.toLowerCase().includes(normalizedQuery)
      || (member.email ?? "").toLowerCase().includes(normalizedQuery)
    return matchesFilter && matchesQuery
  })
}

function UpdateRoleForm({ member, canManageMembers }: { member: CoreMember; canManageMembers: boolean }) {
  if (!canManageMembers || member.roleKey === "owner") {
    return null
  }

  return (
    <form action={activateMember} className="flex items-center gap-2">
      <input type="hidden" name="profileId" value={member.profileId} />
      <label className="sr-only" htmlFor={`role-${member.profileId}`}>Role for {member.displayName}</label>
      <select
        id={`role-${member.profileId}`}
        name="roleKey"
        defaultValue={member.roleKey ?? "member"}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {assignableRoles.map((role) => (
          <option key={role.key} value={role.key}>{role.label}</option>
        ))}
      </select>
      <Button size="sm" type="submit" variant={member.status === "pending_access" ? "primary" : "outline"}>
        <UserCheck className="h-3.5 w-3.5" />
        {member.status === "pending_access" ? "Activate" : "Update"}
      </Button>
    </form>
  )
}

function MemberActionForm({
  member,
  action,
  icon: Icon,
  label,
  ariaLabel,
}: {
  member: CoreMember
  action: (formData: FormData) => Promise<never>
  icon: typeof UserMinus
  label: string
  ariaLabel: string
}) {
  if (!member.membershipId) {
    return null
  }

  return (
    <form action={action}>
      <input type="hidden" name="membershipId" value={member.membershipId} />
      <Button size="sm" type="submit" variant="destructive" aria-label={ariaLabel}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Button>
    </form>
  )
}

function DisableMemberForm({ member, canManageMembers }: { member: CoreMember; canManageMembers: boolean }) {
  if (!canManageMembers || member.roleKey === "owner" || member.status !== "active") {
    return null
  }

  return (
    <MemberActionForm
      member={member}
      action={disableMember}
      icon={UserMinus}
      label="Disable"
      ariaLabel={`Disable ${member.displayName}`}
    />
  )
}

function RemoveMemberForm({ member, canManageMembers }: { member: CoreMember; canManageMembers: boolean }) {
  if (!canManageMembers || member.roleKey === "owner" || (member.status !== "invited" && member.status !== "disabled")) {
    return null
  }

  const label = member.status === "invited" ? "Remove invite" : "Remove"

  return (
    <MemberActionForm
      member={member}
      action={removeMember}
      icon={UserX}
      label={label}
      ariaLabel={`${label} for ${member.displayName}`}
    />
  )
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string; filter?: string; status?: string }>
}) {
  const params = await searchParams
  const query = params?.query ?? ""
  const requestedFilter = params?.filter
  const filter = filters.some((item) => item.key === requestedFilter)
    ? requestedFilter as CoreMemberStatus | "all"
    : "all"
  const { members, canManageMembers } = await getCoreMembers()
  const visible = filterMembers(members, filter, query)
  const statusNotice = STATUS_NOTICE_META[params?.status ?? ""] ?? null
  const statusMessage = statusNotice?.message ?? null
  const isFailureStatus = statusNotice?.isFailure ?? false

  return (
    <PageContainer>
      <PageHeader
        title="Members"
        description="Profiles that belong to this workspace. Owners and admins can activate pending profiles and manage basic roles."
        actions={
          <Button form="core-invite-member-form" type="submit" disabled={!canManageMembers} title={canManageMembers ? undefined : "Owner/admin only"}>
            <UserPlus className="h-4 w-4" />
            Invite member
          </Button>
        }
      />

      {statusMessage ? (
        <div
          role={isFailureStatus ? "alert" : "status"}
          className={cn(
            "mt-5 rounded-md border px-3 py-2.5 text-sm",
            isFailureStatus
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-muted/40 text-muted-foreground",
          )}
        >
          {statusMessage}
        </div>
      ) : null}

      <Card className="mt-5 p-4">
        <form id="core-invite-member-form" action={inviteMember} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_10rem_auto] lg:items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="invite-email">Email</label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder="teammate@example.com"
              required
              disabled={!canManageMembers}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="invite-display-name">Display name</label>
            <Input
              id="invite-display-name"
              name="displayName"
              placeholder="Optional"
              disabled={!canManageMembers}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              name="roleKey"
              defaultValue="member"
              disabled={!canManageMembers}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {assignableRoles.map((role) => (
                <option key={role.key} value={role.key}>{role.label}</option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={!canManageMembers} className="w-full lg:w-auto">
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Invite member sends a Supabase invite email, then stages the selected Core role only after the email is accepted by Supabase.
        </p>
      </Card>

      <Card className="mt-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form className="flex w-full flex-col gap-2 sm:max-w-lg sm:flex-row" action="/members">
            <input type="hidden" name="filter" value={filter} />
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                name="query"
                placeholder="Search by name or email"
                aria-label="Search members"
                defaultValue={query}
                className="pl-9"
              />
            </div>
            <Button variant="outline" type="submit">Search</Button>
          </form>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
            {filters.map((item) => (
              <a
                key={item.key}
                href={`/members?filter=${item.key}${query ? `&query=${encodeURIComponent(query)}` : ""}`}
                aria-current={filter === item.key ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  filter === item.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState
            className="border-0"
            icon={Users}
            title="No members match"
            description="No profiles match this filter yet. Pending access appears here after a user signs in for the first time."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Workspace members and pending access profiles</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">Member</th>
                  <th scope="col" className="px-4 py-3 font-medium">Role</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                  <th scope="col" className="px-4 py-3 font-medium">Access</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((member) => {
                  const meta = statusMeta[member.status]
                  return (
                    <tr key={member.profileId} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={member.displayName} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{member.displayName}</p>
                            <p className="truncate text-xs text-muted-foreground">{member.email ?? "No email"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{roleLabel(member.roleKey, member.roleName)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(member.joinedAt ?? member.profileCreatedAt)}</td>
                      <td className="px-4 py-3">
                        {canManageMembers ? (
                          <div className="flex flex-wrap gap-2">
                            <UpdateRoleForm member={member} canManageMembers={canManageMembers} />
                            <DisableMemberForm member={member} canManageMembers={canManageMembers} />
                            <RemoveMemberForm member={member} canManageMembers={canManageMembers} />
                            {member.roleKey === "owner" ? <span className="text-xs text-muted-foreground">Owner protected</span> : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Owner/admin only</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Showing {visible.length} of {members.length} profiles. Invite member sends email access; pending access still appears when someone signs in before being invited.
      </p>
    </PageContainer>
  )
}
