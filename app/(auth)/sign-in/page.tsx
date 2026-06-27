import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Hexagon, Info, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { getCoreAuthBrand } from "@/core/auth/brand"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { resolveAppOriginFromHeaders } from "@/core/auth/origin"
import { createClient } from "@/core/supabase/server"

// `missing-email` is produced before calling Supabase. Callback/sign-out routes also land here with their own safe codes.
const SIGN_IN_ERROR_CODES = [
  "missing-email",
  "rate-limited",
  "email-provider",
  "auth-failed",
  "missing-code",
  "invalid-callback-link",
  "callback-failed",
  "signout-failed",
] as const
type SignInErrorCode = typeof SIGN_IN_ERROR_CODES[number]

type SupabaseOtpError = {
  status?: number
  code?: string
  name?: string
  message?: string
}

function classifyOtpError(error: SupabaseOtpError): SignInErrorCode {
  const message = error.message?.toLowerCase() ?? ""
  const code = error.code?.toLowerCase() ?? ""

  if (
    error.status === 429
    || code.includes("rate")
    // Message matching is advisory fallback for hosted GoTrue wording; status/code are preferred above.
    || message.includes("request this once every")
    || message.includes("email delivery rate")
  ) {
    return "rate-limited"
  }

  if (
    code === "smtp_error"
    || code === "email_provider_error"
    || code.includes("smtp")
    || message.includes("email provider")
    || message.includes("smtp")
  ) {
    return "email-provider"
  }

  return "auth-failed"
}

function isSignInErrorCode(value: string | undefined): value is SignInErrorCode {
  return SIGN_IN_ERROR_CODES.includes(value as SignInErrorCode)
}

function signInErrorMessage(errorCode: SignInErrorCode | undefined): { title: string; message: string } | null {
  if (!errorCode) {
    return null
  }

  switch (errorCode) {
    case "missing-email":
      return {
        title: "Email required",
        message: "Enter your email address before requesting a magic link.",
      }
    case "rate-limited":
      return {
        title: "Too many magic-link requests",
        message: "Wait a minute, then request a new link.",
      }
    case "email-provider":
      return {
        title: "Email provider unavailable",
        message: "We couldn't send the link right now. Our email service may be briefly unavailable.",
      }
    case "auth-failed":
      return {
        title: "Sign-in failed",
        message: "We couldn't send the magic link. Try again in a moment.",
      }
    case "missing-code":
      return {
        title: "Sign-in link is incomplete",
        message: "Request a fresh invite or magic link, then open the newest email link.",
      }
    case "invalid-callback-link":
      return {
        title: "Sign-in link is invalid",
        message: "This email link type is not supported. Request a fresh invite or magic link.",
      }
    case "callback-failed":
      return {
        title: "Sign-in link could not be verified",
        message: "Request a fresh magic link and try again.",
      }
    case "signout-failed":
      return {
        title: "Sign-out failed",
        message: "Refresh the page and try signing out again.",
      }
    default: {
      const exhaustive: never = errorCode
      throw new Error(`Unhandled sign-in error code: ${exhaustive as string}`)
    }
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ sent?: string; error?: string }>
}) {
  const params = await searchParams
  const errorParam = params?.error
  const errorCode = isSignInErrorCode(errorParam) ? errorParam : errorParam ? "auth-failed" : undefined
  const errorMessage = signInErrorMessage(errorCode)
  const sent = params?.sent === "1" && !errorCode
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
    const origin = resolveAppOriginFromHeaders(headerStore)
    const authBrand = await getCoreAuthBrand()
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          brand_name: authBrand.name,
        },
      },
    })

    if (error) {
      const otpErrorCode = classifyOtpError(error)
      console.warn("Supabase OTP sign-in failed", {
        status: error.status,
        code: error.code,
        name: error.name,
        bucket: otpErrorCode,
      })
      redirect(`/sign-in?error=${otpErrorCode}`)
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

            <div className="mt-4 min-h-12">
              {sent && (
                <div role="status" aria-live="polite" className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Check your email</p>
                  <p className="mt-1">Magic link sent. Use it to finish signing in.</p>
                </div>
              )}

              {errorMessage && (
                <div role="alert" aria-live="assertive" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <p className="font-medium">{errorMessage.title}</p>
                  <p className="mt-1">{errorMessage.message}</p>
                </div>
              )}
            </div>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Core v0.1</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Workspace pages unlock after you complete email sign-in.
            </p>
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
