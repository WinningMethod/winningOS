"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getPublicSupabaseEnv } from "./env.public"

let client: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (client) {
    return client
  }

  const { url, anonKey } = getPublicSupabaseEnv()
  client = createBrowserClient(url, anonKey)

  return client
}
