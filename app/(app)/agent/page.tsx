"use client"

import { useState } from "react"
import { Bot, Plug, Send, Sparkles } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/app/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/app/states"
import { cn } from "@/lib/utils"
import { providers } from "@/lib/mock-data"

const previewMessages = [
  { role: "user" as const, content: "Summarize what changed in the workspace this week." },
  {
    role: "assistant" as const,
    content:
      "This is a static preview. Once a provider adapter is configured, responses stream here through a provider-neutral chat contract.",
  },
]

export default function AgentPage() {
  const [selected, setSelected] = useState<string>("hermes")
  const active = providers.find((p) => p.id === selected) ?? providers[0]

  return (
    <PageContainer>
      <PageHeader
        title="Agent"
        description="Configure a provider-neutral agent for this workspace. Provider adapters are not implemented in this wireframe."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          {/* Provider status */}
          <Card>
            <CardHeader>
              <CardTitle>Provider status</CardTitle>
              <CardDescription>
                WinningOS talks to a minimal chat contract. Any provider can implement an adapter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                  <Bot className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{active.name}</p>
                  <p className="text-xs text-muted-foreground">{active.kind}</p>
                </div>
                <Badge tone="warning">Not configured</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Provider selection */}
          <Card>
            <CardHeader>
              <CardTitle>Provider</CardTitle>
              <CardDescription>
                Choose an adapter. Examples are illustrative — no provider is hardcoded or required.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={selected === p.id}
                  onClick={() => setSelected(p.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    selected === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">{p.kind}</span>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Configuration placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Placeholder fields. No credentials are stored or validated here.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="endpoint">Endpoint</Label>
                <Input id="endpoint" placeholder="https://provider.example/v1" disabled />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="api-key">API key</Label>
                <Input id="api-key" type="password" placeholder="Stored by your deployment, not this wireframe" disabled />
              </div>
              <div className="flex items-center gap-2">
                <Button disabled>
                  <Plug className="h-4 w-4" />
                  Connect provider
                </Button>
                <span className="text-xs text-muted-foreground">Disabled in wireframe.</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat preview */}
        <div className="lg:col-span-2">
          <Card className="sticky top-20 flex h-[32rem] flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Chat preview</CardTitle>
                <Badge tone="muted">Static</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <div className="flex-1 overflow-y-auto px-5">
                {active.status === "not_configured" ? (
                  <EmptyState
                    className="h-full border-0 bg-transparent"
                    icon={Bot}
                    title="Provider not configured"
                    description="Connect a provider to enable the agent. The preview below shows the intended chat surface."
                  />
                ) : null}
                <div className="flex flex-col gap-3 py-2">
                  {previewMessages.map((m, i) => (
                    <div
                      key={i}
                      className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-muted text-foreground",
                        )}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border p-3">
                <div className="flex items-center gap-2">
                  <Input placeholder="Message the agent" aria-label="Message the agent" disabled />
                  <Button size="icon" aria-label="Send message" disabled>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Input is disabled. No real API calls are made.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
