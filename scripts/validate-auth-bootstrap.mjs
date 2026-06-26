import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }

  console.log(`✓ ${message}`)
}

function read(path) {
  assert(existsSync(path), `exists: ${path}`)
  return readFileSync(path, "utf8")
}

const migrationsDir = "supabase/migrations"
const migrationFiles = [
  "20260625231000_create_core_schema.sql",
  "20260625232000_seed_core_defaults.sql",
  "20260626162000_add_auth_profile_bootstrap.sql",
]

for (const file of migrationFiles) {
  assert(existsSync(join(migrationsDir, file)), `found migration ${file}`)
}

const authMigration = read(join(migrationsDir, "20260626162000_add_auth_profile_bootstrap.sql"))

assert(
  authMigration.includes("public.core_bootstrap_current_user"),
  "defines core_bootstrap_current_user RPC",
)
assert(
  authMigration.includes("security definer") && authMigration.includes("set search_path = extensions, auth, private, public"),
  "bootstrap RPC is security definer with fixed search_path",
)
assert(
  authMigration.includes("auth.uid()") && authMigration.includes("raise exception 'core_bootstrap_current_user requires an authenticated user'"),
  "bootstrap RPC requires authenticated user id",
)
assert(
  authMigration.includes("for update") && authMigration.includes("count(*)"),
  "bootstrap RPC serializes first-owner membership creation",
)
assert(
  authMigration.includes("grant execute on function public.core_bootstrap_current_user(text) to authenticated"),
  "bootstrap RPC grants execute only to authenticated role",
)
assert(authMigration.includes("workspace_name text"), "auth callback returns workspace name")
assert(authMigration.includes("display_name text"), "bootstrap RPC returns stored display name")
assert(authMigration.includes("m.workspace_id = target_workspace_id") && authMigration.includes("for update"), "bootstrap RPC scopes first-owner count and lock")
assert(authMigration.includes("on conflict (workspace_id, profile_id) do nothing"), "bootstrap RPC does not promote inactive conflicting memberships")
assert(authMigration.includes("Preserve an existing display name"), "bootstrap RPC documents immutable display names")
assert(authMigration.includes("and display_name is null"), "bootstrap RPC avoids no-op profile writes")
assert(
  authMigration.includes("revoke all on function public.core_bootstrap_current_user(text) from public"),
  "bootstrap RPC revokes default public execute",
)

const authCore = read("core/auth/bootstrap.ts")
assert(authCore.includes("ensureCoreSession"), "exports ensureCoreSession helper")
assert(authCore.includes("core_bootstrap_current_user"), "helper calls bootstrap RPC")
assert(authCore.includes("hasActiveMembership"), "helper exposes active membership state")

const originUtility = read("core/auth/origin.ts")
assert(originUtility.includes("resolveAppOriginFromHeaders") && originUtility.includes("resolveAppOriginFromRequest"), "uses shared auth origin utility")
assert(originUtility.includes("NODE_ENV === \"production\""), "origin utility guards production fallback")

const signInPage = read("app/(auth)/sign-in/page.tsx")
assert(signInPage.includes("signInWithOtp"), "sign-in page submits Supabase email OTP")
assert(signInPage.includes("emailRedirectTo"), "sign-in page supplies auth callback redirect")
assert(signInPage.includes("resolveAppOriginFromHeaders"), "sign-in page uses shared origin resolver")
assert(originUtility.includes("NEXT_PUBLIC_APP_URL"), "origin utility avoids Supabase URL as app callback fallback")
assert(originUtility.includes("NEXT_PUBLIC_APP_URL is required"), "origin utility requires explicit production app URL")
assert(!signInPage.includes("x-forwarded-host"), "sign-in page does not trust forwarded host for auth redirect")
assert(!signInPage.includes("encodeURIComponent(email)"), "sign-in page does not reflect email from URL query")
assert(signInPage.includes('role="status"'), "sign-in page exposes successful OTP state as status")
assert(signInPage.includes('role="alert"'), "sign-in page alerts error state on initial render")

const callbackRoute = read("app/auth/callback/route.ts")
assert(callbackRoute.includes("exchangeCodeForSession"), "auth callback exchanges code for session")
assert(callbackRoute.includes("resolveAppOriginFromRequest"), "auth callback uses configured app origin")
assert(callbackRoute.includes("/home"), "auth callback redirects authenticated users home")

const appLayout = read("app/(app)/layout.tsx")
assert(appLayout.includes("ensureCoreSession"), "protected app layout requires Core session")
assert(appLayout.includes("/sign-in"), "protected app layout redirects unauthenticated users")
assert(appLayout.includes("/pending-access"), "protected app layout handles authenticated users without membership")

const appShell = read("components/app/app-shell.tsx")
assert(appShell.includes('role="menuitem"'), "app shell sign-out is exposed as a menu item")
assert(appShell.includes('form="core-sign-out-form"') && appShell.includes('id="core-sign-out-form"'), "app shell keeps sign-out form outside the ARIA menu")

const signOutRoute = read("app/auth/sign-out/route.ts")
assert(signOutRoute.includes("isSameOrigin"), "sign-out route guards same-origin POSTs")
assert(signOutRoute.includes("resolveAppOriginFromRequest"), "sign-out route uses configured app origin")
assert(signOutRoute.includes("origin !== null"), "sign-out route requires Origin header")
assert(signOutRoute.includes("signout-failed"), "sign-out route redirects failures instead of returning JSON")

const pendingAccess = read("app/pending-access/page.tsx")
assert(pendingAccess.includes("hasActiveMembership"), "pending access page reads membership state")

console.log("Auth bootstrap validation passed.")

const nextConfig = read("next.config.mjs")
assert(nextConfig.includes("X-Frame-Options") && nextConfig.includes("Referrer-Policy"), "auth routes have security headers")
