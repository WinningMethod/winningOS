// Shared auth error vocabulary (issue #26).
//
// Every auth flow (sign-in, sign-up, password reset, set-password, callback,
// sign-out) reports failures as one of these safe, kebab-case codes carried in
// a query parameter. Pages render the matching title/message; nothing
// user-supplied or vendor-internal is ever reflected. This module is pure so
// both server actions and pages can share it.

export const AUTH_ERROR_CODES = [
  // form validation
  "missing-email",
  "missing-password",
  "password-mismatch",
  // password sign-in / sign-up
  "invalid-credentials",
  "email-not-confirmed",
  "weak-password",
  "same-password",
  // delivery and throttling
  "rate-limited",
  "email-provider",
  // callback / link handling
  "missing-code",
  "invalid-callback-link",
  "link-expired",
  "callback-failed",
  // session
  "session-expired",
  "signout-failed",
  // generic fallback
  "auth-failed",
] as const

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number]

function isAuthErrorCode(value: string | undefined): value is AuthErrorCode {
  return AUTH_ERROR_CODES.includes(value as AuthErrorCode)
}

/** Coerce an arbitrary query value to a renderable code (unknown → generic). */
export function toAuthErrorCode(value: string | undefined): AuthErrorCode | undefined {
  if (!value) {
    return undefined
  }

  return isAuthErrorCode(value) ? value : "auth-failed"
}

export type AuthErrorMessage = {
  title: string
  message: string
}

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, AuthErrorMessage> = {
  "missing-email": {
    title: "Email required",
    message: "Enter your email address to continue.",
  },
  "missing-password": {
    title: "Password required",
    message: "Enter your password to continue.",
  },
  "password-mismatch": {
    title: "Passwords do not match",
    message: "Both password fields must match exactly. Re-enter them and try again.",
  },
  "invalid-credentials": {
    title: "Incorrect email or password",
    message:
      "Check both fields and try again. If your account was created with an email link, use “Forgot password?” to set a password first.",
  },
  "email-not-confirmed": {
    title: "Email not confirmed yet",
    message: "Open the confirmation link we emailed you, then sign in again.",
  },
  "weak-password": {
    title: "Password is too weak",
    message: "Use at least 8 characters. Longer passphrases are stronger.",
  },
  "same-password": {
    title: "Password unchanged",
    message: "The new password must be different from your current one.",
  },
  "rate-limited": {
    title: "Too many attempts",
    message: "Wait a minute, then try again.",
  },
  "email-provider": {
    title: "Email could not be sent",
    message: "Our email service may be briefly unavailable. Try again in a few minutes.",
  },
  "missing-code": {
    title: "Sign-in link is incomplete",
    message: "Request a fresh link, then open the newest email.",
  },
  "invalid-callback-link": {
    title: "Sign-in link is invalid",
    message: "This email link type is not supported. Request a fresh link.",
  },
  "link-expired": {
    title: "Link expired",
    message: "This email link has expired or was already used. Request a fresh one.",
  },
  "callback-failed": {
    title: "Sign-in link could not be verified",
    message: "Request a fresh link and try again.",
  },
  "session-expired": {
    title: "Session expired",
    message: "Sign in again to continue.",
  },
  "signout-failed": {
    title: "Sign-out failed",
    message: "Refresh the page and try signing out again.",
  },
  "auth-failed": {
    title: "Something went wrong",
    message: "We couldn't complete that. Try again in a moment.",
  },
}

export function authErrorMessage(code: AuthErrorCode | undefined): AuthErrorMessage | null {
  return code ? AUTH_ERROR_MESSAGES[code] : null
}

type SupabaseAuthErrorShape = {
  status?: number
  code?: string
  name?: string
  message?: string
}

/**
 * Map a Supabase auth error to a safe code. Prefers the structured `code` and
 * HTTP status; message matching is only an advisory fallback for hosted GoTrue
 * wording drift. Never reflect `error.message` to users — it can echo input.
 */
export function classifyAuthError(error: SupabaseAuthErrorShape): AuthErrorCode {
  const code = error.code?.toLowerCase() ?? ""
  const message = error.message?.toLowerCase() ?? ""

  if (error.status === 429 || code.includes("rate") || message.includes("rate limit")) {
    return "rate-limited"
  }

  switch (code) {
    case "invalid_credentials":
      return "invalid-credentials"
    case "email_not_confirmed":
      return "email-not-confirmed"
    case "weak_password":
      return "weak-password"
    case "same_password":
      return "same-password"
    case "otp_expired":
      return "link-expired"
    case "smtp_error":
    case "email_provider_error":
      return "email-provider"
    default:
      break
  }

  if (code.includes("smtp") || message.includes("email provider") || message.includes("smtp")) {
    return "email-provider"
  }

  if (message.includes("invalid login credentials")) {
    return "invalid-credentials"
  }

  return "auth-failed"
}
