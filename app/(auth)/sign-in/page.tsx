import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ArrowRight, Hexagon, Info, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { createClient } from "@/core/supabase/server"

function appOriginFromHeaders(headerStore: Headers): string {
  const explicitAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (explicitAppUrl) {
    return explicitAppUrl.replace(/\/$/, "")
  }

  const origin = headerStore.get("origin")

  if (origin) {
    return origin
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")

  if (host) {
    const proto = headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
    return `${proto}://${host}`
  }

  return "http://localhost:3000"
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ sent?: string; error?: string; email?: string }>
}) {
  const params = await searchParams
  const session = await ensureCoreSession()

  if (session.hasActiveMembership) {
    redirect("/home")
  }

  if (session.status === "pending_access") {
    redirect("/pending-access")
  }

  async function signInWithOtp(formData: FormData) {
    "use server"

    const email = String(formData.get("email") ?? "").trim().toLowerCase()

    if (!email) {
      redirect("/sign-in?error=missing-email")
    }

    const headerStore = await headers()
    const origin = appOriginFromHeaders(headerStore)
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })

    if (error) {
      redirect("/sign-in?error=auth-failed")
    }

    redirect("/sign-in?sent=1")
  }

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
              Sign in to WinningOS Core
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              Use your email to create or access the first Core profile for this workspace.
            </p>
          </div>

          <Card className="p-6">
            <h2 className="text-sm font-semibold">Continue with email</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll send a Supabase magic link to complete sign-in.
            </p>

            <form action={signInWithOtp} className="mt-5 flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="you@example.com" />
              </div>
              <Button type="submit" size="lg" className="w-full">
                <Mail className="h-4 w-4" />
                Send magic link
              </Button>
            </form>

            {params?.sent && (
              <div
                role="alert"
                className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground"
              >
                Magic link sent. Check your email to continue.
              </div>
            )}

            {params?.error && (
              <div
                role="alert"
                className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                We couldn&apos;t send the magic link. Check the email and try again.
              </div>
            )}

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Core v0.1</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Link
              href="/home"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary px-6 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Go to protected workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              The first authenticated user becomes owner of the seeded WinningOS workspace. Later users will
              wait here until membership management is added.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
