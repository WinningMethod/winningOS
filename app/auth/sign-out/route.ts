import { NextResponse } from "next/server"
import { createClient } from "@/core/supabase/server"

function appOrigin(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  return appUrl ? new URL(appUrl).origin : null
}

function isSameOrigin(request: Request, expectedOrigin: string): boolean {
  const origin = request.headers.get("origin")

  return origin !== null && origin === expectedOrigin
}

export async function POST(request: Request) {
  const expectedOrigin = appOrigin()

  if (!expectedOrigin || !isSameOrigin(request, expectedOrigin)) {
    return NextResponse.json({ error: "Invalid sign-out origin" }, { status: 403 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: "Sign-out failed" }, { status: 500 })
  }

  return NextResponse.redirect(new URL("/sign-in", expectedOrigin))
}
