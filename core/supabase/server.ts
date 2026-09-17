import { timedSupabaseFetch } from "./timed-fetch"
import "server-only"
import { cache } from "react"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getPublicSupabaseEnv } from "./env.public"

// One cookie-aware client per server render; never shared between users.
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getPublicSupabaseEnv()

  return createServerClient(url, anonKey, {
    global: { fetch: timedSupabaseFetch },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot set cookies. Middleware or Server Actions
          // should refresh sessions when cookie mutation is required.
        }
      },
    },
  })
})
