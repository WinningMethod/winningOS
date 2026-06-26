import { NextResponse } from "next/server"
import { createClient } from "@/core/supabase/server"

function isSameOrigin(request: Request): boolean {
  const requestUrl = new URL(request.url)
  const origin = request.headers.get("origin")

  return origin !== null && origin === requestUrl.origin
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid sign-out origin" }, { status: 403 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: "Sign-out failed" }, { status: 500 })
  }

  return NextResponse.redirect(new URL("/sign-in", requestUrl.origin))
}
