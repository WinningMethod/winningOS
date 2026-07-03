import { redirect } from "next/navigation"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthErrorNotice } from "@/components/app/auth-notice"
import { updatePassword } from "@/core/auth/actions"
import { authErrorMessage, toAuthErrorCode } from "@/core/auth/errors"
import { createClient } from "@/core/supabase/server"

// Shared landing page for password recovery links and invite acceptance: the
// user arrives here already authenticated by the email link and chooses a
// password before entering the workspace.
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const errorMessage = authErrorMessage(toAuthErrorCode(params?.error))

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in?error=session-expired")
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Set your password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Choose the password you&apos;ll use to sign in to this workspace from now on.
        </p>
      </div>

      <Card className="p-6">
        <form action={updatePassword} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
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
            <KeyRound className="h-4 w-4" />
            Save password and continue
          </Button>
        </form>

        <div className="mt-4 min-h-12">
          <AuthErrorNotice error={errorMessage} />
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Signed in as {user.email ?? "an authenticated user"}.
        </p>
      </Card>
    </>
  )
}
