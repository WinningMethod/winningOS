import Link from "next/link"
import { ArrowRight, Hexagon, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/app/theme-toggle"

export default function AuthEntryPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Hexagon className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-semibold tracking-tight">WinningOS</span>
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Core
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              The operating layer for your company
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              WinningOS Core is a workspace-first foundation for custom company operating systems. Calm,
              source-owned, and agent-agnostic.
            </p>
          </div>

          <Card className="p-6">
            <h2 className="text-sm font-semibold">Sign in to your workspace</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Authentication will be Supabase-backed in a later build.
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              <Button size="lg" className="w-full" disabled>
                Continue with email
              </Button>
              <Button variant="outline" size="lg" className="w-full" disabled>
                Continue with single sign-on
              </Button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Wireframe</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Link
              href="/dashboard"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary px-6 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Enter demo workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Sign-in is not wired in this wireframe. The buttons above are placeholders. Use{" "}
              <span className="font-medium text-foreground">Enter demo workspace</span> to explore the Core UI.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-5 py-6 text-center text-xs text-muted-foreground lg:px-8">
        WinningOS Core — static wireframe. No backend, auth, or provider integrations.
      </footer>
    </div>
  )
}
