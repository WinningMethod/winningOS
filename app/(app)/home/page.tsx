import Link from "next/link"
import { ArrowRight, Activity, Check, Circle } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getCoreMembers } from "@/core/members/data"
import { getCoreSettingsOverview, getRecentAuditEvents, type CoreAuditEventOverview } from "@/core/settings/data"

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "workspace.updated": "updated workspace settings",
  "branding.updated": "updated branding",
  "member.invited": "invited a member",
  "member.role_changed": "changed a member's role",
  "member.disabled": "disabled a member",
  "member.removed": "removed a member",
  "role_permission.changed": "changed a role permission",
}

function formatCreated(value: string | null): string {
  if (!value) {
    return "Unknown"
  }

  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(value))
}

function formatRelativeTime(value: string): string {
  const then = new Date(value).getTime()
  const minutes = Math.round((Date.now() - then) / 60000)

  if (!Number.isFinite(minutes) || minutes < 1) {
    return "just now"
  }

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.round(minutes / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.round(hours / 24)

  if (days < 30) {
    return `${days}d ago`
  }

  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value))
}

export default async function HomePage() {
  const [settings, memberData, audit] = await Promise.all([
    getCoreSettingsOverview(),
    getCoreMembers(),
    getRecentAuditEvents(),
  ])

  const workspaceName = settings.workspace?.name ?? "Workspace"
  const activeMembers = memberData.members.filter((m) => m.status === "active").length
  const waitingMembers = memberData.members.filter(
    (m) => m.status === "invited" || m.status === "pending_access",
  ).length

  const brandingConfigured = Boolean(settings.branding?.primaryColor || settings.branding?.logoUrl)
  const checklist = [
    { id: "c_1", label: "Create workspace", done: true },
    { id: "c_2", label: "Sign in and claim ownership", done: true },
    { id: "c_3", label: "Configure branding", done: brandingConfigured },
    { id: "c_4", label: "Invite members", done: memberData.members.length > 1 },
    { id: "c_5", label: "Review plugin readiness", done: false },
  ]
  const completed = checklist.filter((c) => c.done).length

  return (
    <PageContainer>
      <PageHeader
        title={workspaceName}
        description="A calm starting point for your workspace, backed by live Core data."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Workspace overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workspace overview</CardTitle>
            <CardDescription>The essentials for {workspaceName}.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Edition" value="Core v0.1" />
              <Stat
                label="Members"
                value={`${activeMembers} active`}
                hint={waitingMembers > 0 ? `${waitingMembers} waiting` : undefined}
              />
              <Stat label="Created" value={formatCreated(settings.workspace?.createdAt ?? null)} />
            </dl>
            <Link
              href="/members"
              className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View members
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        {/* Setup checklist */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Get set up</CardTitle>
              <span className="text-sm font-medium text-muted-foreground">
                {completed}/{checklist.length}
              </span>
            </div>
            <CardDescription>A short path to an operational baseline.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-md px-1 py-1.5">
                <span
                  className={
                    item.done
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      : "flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground"
                  }
                >
                  {item.done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2 fill-current" />}
                </span>
                <span className={item.done ? "text-sm text-muted-foreground line-through" : "text-sm"}>
                  {item.label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity (audit trail, visible with workspace.manage) */}
      {audit.canViewAudit && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Privileged actions recorded in the Core audit trail. Visible to workspace managers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {audit.events.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                No recorded activity yet. Workspace, branding, member, and role changes will appear here.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {audit.events.map((event) => (
                  <AuditRow key={event.id} event={event} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}

function AuditRow({ event }: { event: CoreAuditEventOverview }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span>
        <span className="font-medium">{event.actorName ?? "System"}</span>{" "}
        <span className="text-muted-foreground">{AUDIT_ACTION_LABELS[event.action] ?? event.action}</span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(event.createdAt)}</span>
    </li>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tracking-tight">{value}</dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  )
}
