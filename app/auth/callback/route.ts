import { NextResponse } from "next/server"
import { resolveAppOriginFromRequest } from "@/core/auth/origin"
import { createClient } from "@/core/supabase/server"

type SupportedTokenHashType = "invite" | "magiclink"

type HashTokenSessionPayload = {
  access_token?: unknown
  refresh_token?: unknown
}

function isSupportedTokenHashType(value: string | null): value is SupportedTokenHashType {
  return value === "invite" || value === "magiclink"
}

function signInRedirect(origin: string, errorCode: "missing-code" | "invalid-callback-link" | "callback-failed") {
  return NextResponse.redirect(new URL(`/sign-in?error=${errorCode}`, origin))
}

function isSameOrigin(request: Request, expectedOrigin: string): boolean {
  const origin = request.headers.get("origin")
  return origin !== null && origin === expectedOrigin
}

function completeHashTokenSession(origin: string) {
  const homeUrl = JSON.stringify(new URL("/home", origin).toString())
  const missingCodeUrl = JSON.stringify(new URL("/sign-in?error=missing-code", origin).toString())
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

          window.location.replace(response.ok ? ${homeUrl} : ${failedUrl});
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
  const redirectTo = new URL("/home", origin)
  const supabase = await createClient()

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

    return NextResponse.redirect(redirectTo)
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
      return signInRedirect(origin, "callback-failed")
    }

    return NextResponse.redirect(redirectTo)
  }

  return completeHashTokenSession(origin)
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
