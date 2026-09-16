import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getPublicSupabaseEnv, publicSupabaseEnvProblems } from "@/core/supabase/env.public"

// Refresh before rendering so Server Components receive fresh cookies and the
// browser persists them. Permission and live-session checks remain in the DAL.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  if (publicSupabaseEnvProblems().length) return response
  const { url, anonKey } = getPublicSupabaseEnv()
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value))
      },
    },
  })
  // Claims refresh cookies; they are not a substitute for live authorization.
  await client.auth.getClaims()
  return response
}

export const config = {
  matcher: ["/((?!api/|auth/|core-preview/|_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
