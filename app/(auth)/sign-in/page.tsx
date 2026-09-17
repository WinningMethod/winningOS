import Link from "next/link"
import { redirect } from "next/navigation"
import { LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthErrorNotice } from "@/components/app/auth-notice"
import { signInWithPassword } from "@/core/auth/actions"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { authErrorMessage, toAuthErrorCode } from "@/core/auth/errors"

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const errorMessage = authErrorMessage(toAuthErrorCode(params?.error))
  const session = await ensureCoreSession()

  if (session.hasActiveMembership) {
    redirect("/home")
  }

  if (session.status === "pending_access") {
    redirect("/pending-access")
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Sign in to WinningOS Core
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Use your email and password to access this workspace.
        </p>
      </div>

      <Card className="p-6">
        <form action={signInWithPassword} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link prefetch={false}
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" size="lg" className="w-full">
            <LogIn className="h-4 w-4" />
            Sign in
          </Button>
        </form>

        <div className="mt-4 min-h-12">
          <AuthErrorNotice error={errorMessage} />
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Core v0.1</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link prefetch={false} href="/sign-up" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </Card>

      <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        Signed up before passwords existed? Use{" "}
        <Link prefetch={false} href="/forgot-password" className="font-medium text-foreground hover:underline">
          Forgot password
        </Link>{" "}
        once to set a password for your existing account.
      </p>
    </>
  )
}
