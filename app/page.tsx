import Link from "next/link"
import { ArrowRight, Info } from "lucide-react"
import { BrandMark } from "@/components/app/brand-mark"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { getCoreBrandTheme } from "@/core/branding/theme"

export default async function AuthEntryPage() {
  const brand = await getCoreBrandTheme()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-2.5">
          <BrandMark logoUrl={brand.logoUrl} />
          <span className="text-sm font-semibold tracking-tight">{brand.brandName ?? "WinningOS"}</span>
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
              source-owned, and plugin-ready.
            </p>
          </div>

          <Card className="p-6">
            <h2 className="text-sm font-semibold">Sign in to your workspace</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your email and password. The first account becomes the workspace owner.
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              <Link
                href="/sign-in"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary px-6 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Create an account
              </Link>
            </div>
          </Card>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Workspace pages are protected. Unauthenticated visitors are redirected back here, and new
              accounts wait for an owner or admin to grant access.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-5 py-6 text-center text-xs text-muted-foreground lg:px-8">
        WinningOS Core — Supabase-backed foundation with plugin-ready boundaries.
      </footer>
    </div>
  )
}
