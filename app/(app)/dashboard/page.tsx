import Link from "next/link"
import {
  ArrowRight,
  Bot,
  Boxes,
  Check,
  Circle,
  Palette,
  Users,
} from "lucide-react"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import {
  activity,
  currentWorkspace,
  members,
  setupChecklist,
  statusMeta,
} from "@/lib/mock-data"

export default function DashboardPage() {
  const activeMembers = members.filter((m) => m.status === "active").length
  const invitedMembers = members.filter((m) => m.status === "invited").length
  const completed = setupChecklist.filter((c) => c.done).length

  return (
    <PageContainer>
      <PageHeader
        title={`${currentWorkspace.name}`}
        description="Workspace overview and system readiness for WinningOS Core. All data on this screen is mock data."
      />

      {/* Status summary */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          icon={<Users className="h-4 w-4" />}
          label="Members"
          value={`${activeMembers} active`}
          hint={`${invitedMembers} invited`}
        />
        <StatusCard
          icon={<Palette className="h-4 w-4" />}
          label="Branding"
          value="Configured"
          badge={<Badge tone="success">Ready</Badge>}
        />
        <StatusCard
          icon={<Bot className="h-4 w-4" />}
          label="Agent provider"
          value="Not configured"
          badge={<Badge tone="warning">Setup needed</Badge>}
        />
        <StatusCard
          icon={<Boxes className="h-4 w-4" />}
          label="Modules"
          value="None yet"
          badge={<Badge tone="muted">Later</Badge>}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Setup checklist */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Setup checklist</CardTitle>
                <CardDescription>Bring your workspace to an operational baseline.</CardDescription>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {completed}/{setupChecklist.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {setupChecklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
              >
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

        {/* Members summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Members</CardTitle>
              <Link
                href="/members"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {members.slice(0, 4).map((m) => {
              const meta = statusMeta[m.status]
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent admin activity</CardTitle>
          <CardDescription>Placeholder audit feed. Real activity logging is not wired in this wireframe.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col">
            {activity.map((entry, i) => (
              <li
                key={entry.id}
                className={
                  i < activity.length - 1
                    ? "flex items-center gap-3 border-b border-border py-3"
                    : "flex items-center gap-3 py-3"
                }
              >
                <Avatar name={entry.actor} size="sm" />
                <p className="flex-1 text-sm">
                  <span className="font-medium">{entry.actor}</span>{" "}
                  <span className="text-muted-foreground">{entry.action}</span>{" "}
                  <span className="font-medium">{entry.target}</span>
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">{entry.at}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

function StatusCard({
  icon,
  label,
  value,
  hint,
  badge,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  badge?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
            {icon}
          </span>
          {badge}
        </div>
        <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-lg font-semibold tracking-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
