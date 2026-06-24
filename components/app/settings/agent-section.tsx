import { Bot, ChevronDown, Send } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { providers } from "@/lib/mock-data"

const previewMessages = [
  { role: "user" as const, content: "Summarize what changed in the workspace this week." },
  {
    role: "assistant" as const,
    content:
      "This is a static preview. Once a provider adapter is configured, responses stream here through a provider-neutral chat contract.",
  },
]

export function AgentSection() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="flex flex-col gap-6 lg:col-span-3">
        {/* Concept */}
        <Card>
          <CardHeader>
            <CardTitle>Provider-neutral agent</CardTitle>
            <CardDescription>
              WinningOS talks to a minimal chat contract. Any provider can implement an adapter — none is hardcoded or
              required. Configuration arrives in a later build.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                <Bot className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">No provider configured</p>
                <p className="text-xs text-muted-foreground">The agent is conceptual in this wireframe.</p>
              </div>
              <Badge tone="warning">Not configured</Badge>
            </div>

            {/* Disabled provider selector */}
            <div className="mt-5 flex max-w-sm flex-col gap-2">
              <Label htmlFor="agent-provider">Provider</Label>
              <div className="relative">
                <select
                  id="agent-provider"
                  disabled
                  defaultValue={providers[0].id}
                  className="h-9 w-full cursor-not-allowed appearance-none rounded-md border border-border bg-muted/40 px-3 pr-9 text-sm text-muted-foreground"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.kind}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Selection is disabled in the wireframe.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Static chat preview */}
      <div className="lg:col-span-2">
        <Card className="sticky top-20 flex h-[28rem] flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Chat preview</CardTitle>
              <Badge tone="muted">Static</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex-1 overflow-y-auto px-5">
              <div className="flex flex-col gap-3 py-2">
                {previewMessages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        m.role === "user"
                          ? "max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground"
                          : "max-w-[80%] rounded-lg border border-border bg-muted px-3 py-2 text-sm leading-relaxed text-foreground"
                      }
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
              <p className="mt-2 text-[11px] text-muted-foreground">Input is disabled. No real API calls are made.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
