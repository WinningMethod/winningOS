import { NextResponse } from "next/server"
import { createClient } from "@/core/supabase/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const redirectTo = new URL("/home", requestUrl.origin)

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=missing-code", requestUrl.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL("/sign-in?error=callback-failed", requestUrl.origin))
  }

  return NextResponse.redirect(redirectTo)
}
