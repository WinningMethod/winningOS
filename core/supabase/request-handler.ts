import { createSupabaseContext, withSupabase } from "@supabase/server"
import type { SupabaseContext, WithSupabaseConfig } from "@supabase/server"

export { createSupabaseContext, withSupabase }
export type { SupabaseContext, WithSupabaseConfig }

export type SupabaseRequestHandler<Database = unknown> = (
  request: Request,
  context: SupabaseContext<Database>,
) => Promise<Response>

export function withWinningOSUser<Database = unknown>(
  handler: SupabaseRequestHandler<Database>,
) {
  return withSupabase<Database>({ auth: "user" }, handler)
}

export function withWinningOSPublishable<Database = unknown>(
  handler: SupabaseRequestHandler<Database>,
) {
  return withSupabase<Database>({ auth: "publishable" }, handler)
}

export function withWinningOSSecret<Database = unknown>(
  handler: SupabaseRequestHandler<Database>,
) {
  return withSupabase<Database>({ auth: "secret" }, handler)
}

export function withWinningOSOpen<Database = unknown>(
  handler: SupabaseRequestHandler<Database>,
) {
  return withSupabase<Database>({ auth: "none" }, handler)
}
