import { redirect } from "next/navigation"
import { Hexagon, LockKeyhole } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { ensureCoreSession } from "@/core/auth/bootstrap"

export default async function PendingAccessPage() {
  const session = await ensureCoreSession()

  if (session.status === "unauthenticated") {
    redirect("/sign-in")
  }

  if (session.hasActiveMembership) {
    redirect("/home")
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
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Waiting for workspace access</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your Core profile exists, but this workspace already has an owner. Member management is coming in a
            later Core slice, so new users wait here until they are added.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Signed in as {session.user?.email ?? "an authenticated user"}.
          </p>
          <form action="/auth/sign-out" method="post" className="mt-5">
            <button className="text-sm font-medium text-primary hover:underline" type="submit">
              Sign out
            </button>
          </form>
        </Card>
      </main>
    </div>
  )
}
