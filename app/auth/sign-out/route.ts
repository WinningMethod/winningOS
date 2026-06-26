import { NextResponse } from "next/server"
import { createClient } from "@/core/supabase/server"

function appOrigin(request: Request): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (appUrl) {
    return new URL(appUrl).origin
  }

  if (process.env.NODE_ENV !== "production") {
    return new URL(request.url).origin
  }

  return null
}

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
  const expectedOrigin = appOrigin(request)
  const fallbackOrigin = expectedOrigin ?? new URL(request.url).origin

  if (!expectedOrigin || !isSameOrigin(request, expectedOrigin)) {
    return signInRedirect(fallbackOrigin, "signout-failed")
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return signInRedirect(expectedOrigin, "signout-failed")
  }

  return signInRedirect(expectedOrigin)
}
