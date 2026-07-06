function requirePublicEnv(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value.trim()
}

export function getPublicSupabaseEnv() {
  return {
    url: requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  }
}

function describeEnvProblem(name: string, rawValue: string | undefined, mustBeHttpsUrl: boolean): string | null {
  const value = rawValue?.trim()

  if (!value) {
    return `${name} is not set`
  }

  // Quotes belong to .env.local dotenv syntax; pasted into a hosting
  // provider's dashboard they become part of the value and break the client.
  if (value.startsWith('"') || value.startsWith("'")) {
    return `${name} is wrapped in quotes — paste the raw value without quotes`
  }

  if (mustBeHttpsUrl && !value.startsWith("https://")) {
    return `${name} must be the project URL starting with https://`
  }

  return null
}

/**
 * Non-throwing preflight for unauthenticated surfaces: human-readable
 * problems with the required public Supabase variables. Lets the auth layout
 * render an actionable setup notice instead of crashing into the masked
 * production error page when a fresh deployment is missing runtime env
 * (AcmeCo issue #3). Server-side only — client bundles cannot read env
 * dynamically.
 */
export function publicSupabaseEnvProblems(): string[] {
  return [
    describeEnvProblem("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL, true),
    describeEnvProblem("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, false),
  ].filter((problem): problem is string => problem !== null)
}
