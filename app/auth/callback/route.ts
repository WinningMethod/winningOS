import { NextResponse } from "next/server"
import { resolveAppOriginFromRequest } from "@/core/auth/origin"
import { createClient } from "@/core/supabase/server"

// invite/recovery land on set-password; magiclink/signup go straight to the app.
// magiclink stays supported so links emailed before the password rework still work.
const SUPPORTED_TOKEN_HASH_TYPES = ["invite", "magiclink", "recovery", "signup"] as const
type SupportedTokenHashType = (typeof SUPPORTED_TOKEN_HASH_TYPES)[number]

type HashTokenSessionPayload = {
  access_token?: unknown
  refresh_token?: unknown
}

function isSupportedTokenHashType(value: string | null): value is SupportedTokenHashType {
  return SUPPORTED_TOKEN_HASH_TYPES.includes(value as SupportedTokenHashType)
}

function signInRedirect(
  origin: string,
  errorCode: "missing-code" | "invalid-callback-link" | "callback-failed" | "link-expired",
) {
  return NextResponse.redirect(new URL(`/sign-in?error=${errorCode}`, origin))
}

// Only same-app relative paths may be used as post-auth destinations.
function sanitizeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null
  }

  return value
}

function destinationForTokenType(tokenType: SupportedTokenHashType, nextPath: string | null): string {
  if (nextPath) {
    return nextPath
  }

  return tokenType === "invite" || tokenType === "recovery" ? "/set-password" : "/home"
}

function isSameOrigin(request: Request, expectedOrigin: string): boolean {
  const origin = request.headers.get("origin")
  return origin !== null && origin === expectedOrigin
}

function completeHashTokenSession(origin: string, nextPath: string | null) {
  const successUrl = JSON.stringify(new URL(nextPath ?? "/home", origin).toString())
  const recoveryUrl = JSON.stringify(new URL("/set-password", origin).toString())
  const missingCodeUrl = JSON.stringify(new URL("/sign-in?error=missing-code", origin).toString())
  const expiredUrl = JSON.stringify(new URL("/sign-in?error=link-expired", origin).toString())
  const failedUrl = JSON.stringify(new URL("/sign-in?error=callback-failed", origin).toString())

  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Completing sign-in…</title>
    <noscript><meta http-equiv="refresh" content="0;url=/sign-in?error=missing-code" /></noscript>
  </head>
  <body>
    <p>Completing sign-in…</p>
    <script>
      (async function completeHashTokenSession() {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        const link_type = hash.get("type");

        if (hash.get("error_code") === "otp_expired") {
          window.location.replace(${expiredUrl});
          return;
        }

        if (!access_token || !refresh_token) {
          window.location.replace(${missingCodeUrl});
          return;
        }

        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);

        try {
          const response = await fetch(window.location.pathname, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ access_token, refresh_token }),
          });

          if (!response.ok) {
            window.location.replace(${failedUrl});
            return;
          }

          const needsPassword = link_type === "invite" || link_type === "recovery";
          window.location.replace(needsPassword ? ${recoveryUrl} : ${successUrl});
        } catch {
          window.location.replace(${failedUrl});
        }
      })();
    </script>
  </body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  )
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const origin = resolveAppOriginFromRequest(request)
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const tokenType = requestUrl.searchParams.get("type")
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"))
  const errorCode = requestUrl.searchParams.get("error_code")
  const supabase = await createClient()

  // Supabase redirects expired/used links back with error params instead of a code.
  if (errorCode) {
    console.warn("Supabase auth callback reported an error", { errorCode })
    return signInRedirect(origin, errorCode === "otp_expired" ? "link-expired" : "callback-failed")
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.warn("Supabase auth code callback failed", {
        status: error.status,
        code: error.code,
        name: error.name,
      })
      return signInRedirect(origin, "callback-failed")
    }

    return NextResponse.redirect(new URL(nextPath ?? "/home", origin))
  }

  if (tokenHash) {
    if (!isSupportedTokenHashType(tokenType)) {
      console.warn("Supabase token-hash callback used unsupported type", {
        type: tokenType,
      })
      return signInRedirect(origin, "invalid-callback-link")
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tokenType,
    })

    if (error) {
      console.warn("Supabase token-hash callback failed", {
        status: error.status,
        code: error.code,
        name: error.name,
        type: tokenType,
      })
      return signInRedirect(origin, error.code === "otp_expired" ? "link-expired" : "callback-failed")
    }

    return NextResponse.redirect(new URL(destinationForTokenType(tokenType, nextPath), origin))
  }

  return completeHashTokenSession(origin, nextPath)
}

export async function POST(request: Request) {
  const expectedOrigin = resolveAppOriginFromRequest(request)

  if (!isSameOrigin(request, expectedOrigin)) {
    return NextResponse.json({ error: "callback-failed" }, { status: 400 })
  }

  const body = await request.json().catch(() => null) as HashTokenSessionPayload | null
  const accessToken = typeof body?.access_token === "string" ? body.access_token : ""
  const refreshToken = typeof body?.refresh_token === "string" ? body.refresh_token : ""

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "missing-token-session" }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error) {
    console.warn("Supabase hash-token session callback failed", {
      status: error.status,
      code: error.code,
      name: error.name,
    })
    return NextResponse.json({ error: "callback-failed" }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
