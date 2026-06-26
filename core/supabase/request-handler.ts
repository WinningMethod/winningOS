import "server-only"

import { withSupabase } from "@supabase/server"
import type { SupabaseContext, SupabaseEnv } from "@supabase/server"

export type { SupabaseContext }

export type SupabaseRequestHandler<Database = unknown> = (
  request: Request,
  context: SupabaseContext<Database>,
) => Promise<Response>

function requireServerEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required Supabase server environment variable: ${name}`)
  }

  return value
}

function getSupabaseServerEnv(): Partial<SupabaseEnv> {
  const url = requireServerEnv("SUPABASE_URL")
  const publishableKey = requireServerEnv("SUPABASE_PUBLISHABLE_KEY")
  const secretKey = requireServerEnv("SUPABASE_SECRET_KEY")
  const configuredJwksUrl = process.env.SUPABASE_JWKS_URL?.trim()
  const derivedJwksUrl = new URL("/auth/v1/.well-known/jwks.json", url)

  if (configuredJwksUrl) {
    const parsedJwksUrl = new URL(configuredJwksUrl)
    const parsedSupabaseUrl = new URL(url)

    if (parsedJwksUrl.origin !== parsedSupabaseUrl.origin) {
      throw new Error("SUPABASE_JWKS_URL origin must match SUPABASE_URL")
    }
  }

  return {
    url,
    publishableKeys: { default: publishableKey },
    secretKeys: { default: secretKey },
    jwks: configuredJwksUrl ? new URL(configuredJwksUrl) : derivedJwksUrl,
  }
}

export function withWinningOSUser<Database = unknown>(
  handler: SupabaseRequestHandler<Database>,
) {
  return withSupabase<Database>({ auth: "user", env: getSupabaseServerEnv() }, handler)
}

export function withWinningOSPublishable<Database = unknown>(
  handler: SupabaseRequestHandler<Database>,
) {
  return withSupabase<Database>({ auth: "publishable", env: getSupabaseServerEnv() }, handler)
}

export function withWinningOSSecret<Database = unknown>(
  handler: SupabaseRequestHandler<Database>,
) {
  return withSupabase<Database>({ auth: "secret", env: getSupabaseServerEnv() }, handler)
}

/**
 * @remarks Use only for explicitly public endpoints. Supabase Edge Functions
 * using this mode require a matching `verify_jwt = false` block in
 * `supabase/config.toml`.
 */
export function withWinningOSOpen<Database = unknown>(
  handler: SupabaseRequestHandler<Database>,
) {
  return withSupabase<Database>({ auth: "none", env: getSupabaseServerEnv() }, handler)
}
