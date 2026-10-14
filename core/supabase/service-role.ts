import { timedSupabaseFetch } from "./timed-fetch"
import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getPublicSupabaseEnv } from "./env.public"
import { requireEnv } from "./env.server"

function getServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function createServiceRoleClient() {
  const { url } = getPublicSupabaseEnv()
  const serviceRoleKey = getServiceRoleKey()

  return createSupabaseClient(url, serviceRoleKey, {
    global: { fetch: timedSupabaseFetch },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
