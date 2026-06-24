import Link from "next/link"
import { ArrowRight, Check, Circle, Info } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { currentWorkspace, members, setupChecklist } from "@/lib/mock-data"

export default function HomePage() {
  const activeMembers = members.filter((m) => m.status === "active").length
  const invitedMembers = members.filter((m) => m.status === "invited").length
  const completed = setupChecklist.filter((c) => c.done).length

  return (
    <PageContainer>
      <PageHeader
        title={currentWorkspace.name}
        description="A calm starting point for your workspace. This is a static wireframe — nothing here is wired to a backend yet."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Workspace overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workspace overview</CardTitle>
            <CardDescription>The essentials for {currentWorkspace.name}.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Plan" value={currentWorkspace.plan} />
              <Stat label="Members" value={`${activeMembers} active`} hint={`${invitedMembers} invited`} />
              <Stat label="Created" value={currentWorkspace.createdOn} />
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
                {completed}/{setupChecklist.length}
              </span>
            </div>
            <CardDescription>A short path to an operational baseline.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {setupChecklist.map((item) => (
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

      {/* What's not wired yet */}
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Not wired yet</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Authentication, member invitations, and the agent provider are placeholders in this Core wireframe.
            Workspace configuration lives under{" "}
            <Link href="/settings" className="font-medium text-foreground hover:underline">
              Settings
            </Link>
            .
          </p>
        </div>
      </div>
    </PageContainer>
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
