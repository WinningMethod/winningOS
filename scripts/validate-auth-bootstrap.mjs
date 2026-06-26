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
  authMigration.includes("security definer") && authMigration.includes("set search_path = public, private, auth, extensions"),
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
assert(authMigration.includes("m.workspace_id = target_workspace_id") && authMigration.includes("for update"), "bootstrap RPC scopes first-owner count and lock")
assert(
  authMigration.includes("revoke all on function public.core_bootstrap_current_user(text) from public"),
  "bootstrap RPC revokes default public execute",
)

const authCore = read("core/auth/bootstrap.ts")
assert(authCore.includes("ensureCoreSession"), "exports ensureCoreSession helper")
assert(authCore.includes("core_bootstrap_current_user"), "helper calls bootstrap RPC")
assert(authCore.includes("hasActiveMembership"), "helper exposes active membership state")

const signInPage = read("app/(auth)/sign-in/page.tsx")
assert(signInPage.includes("signInWithOtp"), "sign-in page submits Supabase email OTP")
assert(signInPage.includes("emailRedirectTo"), "sign-in page supplies auth callback redirect")
assert(signInPage.includes("NEXT_PUBLIC_APP_URL"), "sign-in page avoids Supabase URL as app callback fallback")
assert(!signInPage.includes("encodeURIComponent(email)"), "sign-in page does not reflect email from URL query")
assert(signInPage.includes('role="alert"'), "sign-in page announces status messages")

const callbackRoute = read("app/auth/callback/route.ts")
assert(callbackRoute.includes("exchangeCodeForSession"), "auth callback exchanges code for session")
assert(callbackRoute.includes("/home"), "auth callback redirects authenticated users home")

const appLayout = read("app/(app)/layout.tsx")
assert(appLayout.includes("ensureCoreSession"), "protected app layout requires Core session")
assert(appLayout.includes("/sign-in"), "protected app layout redirects unauthenticated users")
assert(appLayout.includes("/pending-access"), "protected app layout handles authenticated users without membership")

const signOutRoute = read("app/auth/sign-out/route.ts")
assert(signOutRoute.includes("isSameOrigin"), "sign-out route guards same-origin POSTs")

const pendingAccess = read("app/pending-access/page.tsx")
assert(pendingAccess.includes("hasActiveMembership"), "pending access page reads membership state")

console.log("Auth bootstrap validation passed.")
