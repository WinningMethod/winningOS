"use client"

import { useState } from "react"
import { Search, UserPlus, Users } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/app/states"
import { cn } from "@/lib/utils"
import { members, statusMeta, type MemberStatus } from "@/lib/mock-data"

const filters: { key: MemberStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "invited", label: "Invited" },
  { key: "disabled", label: "Disabled" },
  { key: "removed", label: "Removed" },
]

export default function MembersPage() {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<MemberStatus | "all">("all")

  const visible = members.filter((m) => {
    const matchesFilter = filter === "all" || m.status === filter
    const matchesQuery =
      query.trim() === "" ||
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase())
    return matchesFilter && matchesQuery
  })

  return (
    <PageContainer>
      <PageHeader
        title="Members"
        description="Profiles that belong to this workspace. Invite and lifecycle actions are placeholders in this wireframe."
        actions={
          <Button>
            <UserPlus className="h-4 w-4" />
            Invite member
          </Button>
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or email"
            aria-label="Search members"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                filter === f.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState
            className="border-0"
            icon={Users}
            title="No members match"
            description="No members invited yet for this filter. Adjust your search or invite someone to get started."
            action={
              <Button variant="outline">
                <UserPlus className="h-4 w-4" />
                Invite member
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Workspace members</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">Member</th>
                  <th scope="col" className="px-4 py-3 font-medium">Role</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => {
                  const meta = statusMeta[m.status]
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{m.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{m.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.joinedOn}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Showing {visible.length} of {members.length} members. Permission-aware controls are conceptual only.
      </p>
    </PageContainer>
  )
}
