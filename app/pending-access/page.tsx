import { redirect } from "next/navigation"
import { LockKeyhole } from "lucide-react"
import { BrandMark } from "@/components/app/brand-mark"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { getCoreBrandTheme } from "@/core/branding/theme"

export default async function PendingAccessPage() {
  const session = await ensureCoreSession()
  const brand = await getCoreBrandTheme()

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
          <BrandMark logoUrl={brand.logoUrl} />
          <span className="text-sm font-semibold tracking-tight">{brand.brandName ?? "WinningOS"}</span>
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
            Your Core profile exists, but this workspace already has an owner. Ask an owner or admin to open
            Members and activate your access.
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
