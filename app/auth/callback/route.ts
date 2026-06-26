import { NextResponse } from "next/server"
import { createClient } from "@/core/supabase/server"

function appOrigin(request: Request): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (appUrl) {
    return new URL(appUrl).origin
  }

  return new URL(request.url).origin
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const origin = appOrigin(request)
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
