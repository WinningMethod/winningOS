import Link from "next/link"
import { redirect } from "next/navigation"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthErrorNotice, AuthStatusNotice } from "@/components/app/auth-notice"
import { signUpWithPassword } from "@/core/auth/actions"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { authErrorMessage, toAuthErrorCode } from "@/core/auth/errors"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ sent?: string; error?: string }>
}) {
  const params = await searchParams
  const errorMessage = authErrorMessage(toAuthErrorCode(params?.error))
  const sent = params?.sent === "1" && !errorMessage
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
          Create your Core account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          The first account becomes the workspace owner. Everyone after that waits for
          an owner or admin to grant access.
        </p>
      </div>

      <Card className="p-6">
        <form action={signUpWithPassword} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              maxLength={120}
              placeholder="Your name (optional)"
            />
          </div>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <Button type="submit" size="lg" className="w-full">
            <UserPlus className="h-4 w-4" />
            Create account
          </Button>
        </form>

        <div className="mt-4 min-h-12">
          {sent && (
            <AuthStatusNotice
              title="Check your email"
              message="If this address is new, a confirmation link is on its way. Open it to finish creating your account."
            />
          )}
          <AuthErrorNotice error={errorMessage} />
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Core v0.1</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </>
  )
}
