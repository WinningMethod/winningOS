import { NextResponse } from "next/server"
import { resolveAppOriginFromRequest } from "@/core/auth/origin"
import { createClient } from "@/core/supabase/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const origin = resolveAppOriginFromRequest(request)
  const code = requestUrl.searchParams.get("code")
  const redirectTo = new URL("/home", origin)

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=missing-code", origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL("/sign-in?error=callback-failed", origin))
  }

  return NextResponse.redirect(redirectTo)
}
