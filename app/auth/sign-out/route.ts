import { NextResponse } from "next/server"
import { resolveAppOriginFromRequest } from "@/core/auth/origin"
import { createClient } from "@/core/supabase/server"

function signInRedirect(origin: string, error?: string): NextResponse {
  const url = new URL("/sign-in", origin)

  if (error) {
    url.searchParams.set("error", error)
  }

  return NextResponse.redirect(url)
}

function isSameOrigin(request: Request, expectedOrigin: string): boolean {
  const origin = request.headers.get("origin")

  return origin !== null && origin === expectedOrigin
}

export async function POST(request: Request) {
  const expectedOrigin = resolveAppOriginFromRequest(request)

  if (!isSameOrigin(request, expectedOrigin)) {
    return signInRedirect(expectedOrigin, "signout-failed")
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return signInRedirect(expectedOrigin, "signout-failed")
  }

  return signInRedirect(expectedOrigin)
}
