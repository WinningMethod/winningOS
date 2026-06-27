import { NextResponse } from "next/server"
import { resolveAppOriginFromRequest } from "@/core/auth/origin"
import { createClient } from "@/core/supabase/server"

type SupportedTokenHashType = "invite" | "magiclink"

function isSupportedTokenHashType(value: string | null): value is SupportedTokenHashType {
  return value === "invite" || value === "magiclink"
}

function signInRedirect(origin: string, errorCode: "missing-code" | "invalid-callback-link" | "callback-failed") {
  return NextResponse.redirect(new URL(`/sign-in?error=${errorCode}`, origin))
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

  return signInRedirect(origin, "missing-code")
}
