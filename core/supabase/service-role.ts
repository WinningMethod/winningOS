import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getPublicSupabaseEnv } from "./env"

function getServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!value) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY")
  }

  return value
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
