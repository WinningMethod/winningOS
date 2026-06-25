import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getPublicSupabaseEnv, requireEnv } from "./env"

function getServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function createServiceRoleClient() {
  const { url } = getPublicSupabaseEnv()
  const serviceRoleKey = getServiceRoleKey()

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
