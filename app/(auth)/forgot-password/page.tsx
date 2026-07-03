import Link from "next/link"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthErrorNotice, AuthStatusNotice } from "@/components/app/auth-notice"
import { requestPasswordReset } from "@/core/auth/actions"
import { authErrorMessage, toAuthErrorCode } from "@/core/auth/errors"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ sent?: string; error?: string }>
}) {
  const params = await searchParams
  const errorMessage = authErrorMessage(toAuthErrorCode(params?.error))
  const sent = params?.sent === "1" && !errorMessage

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Reset your password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          We&apos;ll email you a link to set a new password. This also works for
          accounts that never had one.
        </p>
      </div>

      <Card className="p-6">
        <form action={requestPasswordReset} className="flex flex-col gap-3">
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
          <Button type="submit" size="lg" className="w-full">
            <Mail className="h-4 w-4" />
            Send reset link
          </Button>
        </form>

        <div className="mt-4 min-h-12">
          {sent && (
            <AuthStatusNotice
              title="Check your email"
              message="If an account exists for that address, a password reset link is on its way."
            />
          )}
          <AuthErrorNotice error={errorMessage} />
        </div>

        <p className="mt-2 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </>
  )
}
