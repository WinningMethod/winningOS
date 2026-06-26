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
assert(authMigration.includes("on conflict on constraint core_memberships_workspace_profile_key do nothing"), "bootstrap RPC uses named membership constraint without ambiguous output names")
assert(authMigration.includes("Preserve an existing display name"), "bootstrap RPC documents immutable display names")
assert(authMigration.includes("and public.core_profiles.display_name is null"), "bootstrap RPC avoids no-op profile writes without ambiguous output names")
assert(authMigration.includes("select p.id, p.display_name"), "bootstrap RPC qualifies profile display name reads")
assert(
  authMigration.includes("revoke all on function public.core_bootstrap_current_user(text) from public"),
  "bootstrap RPC revokes default public execute",
)

const authCore = read("core/auth/bootstrap.ts")
assert(authCore.includes("ensureCoreSession"), "exports ensureCoreSession helper")
assert(authCore.includes("core_bootstrap_current_user"), "helper calls bootstrap RPC")
assert(authCore.includes("hasActiveMembership"), "helper exposes active membership state")
assert(authCore.includes("AuthSessionMissingError"), "helper treats missing auth sessions as unauthenticated")
assert(authCore.includes("Session bootstrap failed"), "helper uses generic Supabase failure messages")

const authBrand = read("core/auth/brand.ts")
assert(authBrand.includes("getCoreAuthBrand"), "exports Core auth brand helper")
assert(authBrand.includes("core_brand_settings") && authBrand.includes("brand_name"), "auth brand helper reads Core branding settings")

const originUtility = read("core/auth/origin.ts")
assert(originUtility.includes("resolveAppOriginFromHeaders") && originUtility.includes("resolveAppOriginFromRequest"), "uses shared auth origin utility")
assert(originUtility.includes("NODE_ENV === \"production\""), "origin utility guards production fallback")

const supabaseConfig = read("supabase/config.toml")
assert(supabaseConfig.includes('site_url = "https://winning-os.vercel.app"'), "Supabase hosted auth site URL is production, not localhost")
assert(supabaseConfig.includes("winning-os-git-feat-auth-prof") && supabaseConfig.includes("*-carter-turnbull-s-projects.vercel.app"), "Supabase auth redirects allow Vercel preview URLs")
assert(supabaseConfig.includes("[auth.email.template.magic_link]") && supabaseConfig.includes('subject = "Sign in to WinningOS Core"'), "Supabase magic-link email uses WinningOS Core subject")
assert(supabaseConfig.includes('content_path = "./supabase/templates/magic_link.html"'), "Supabase magic-link email uses a repo-owned template")

const magicLinkTemplate = read("supabase/templates/magic_link.html")
assert(magicLinkTemplate.includes("WinningOS Core"), "magic-link template is branded as WinningOS Core")
assert(magicLinkTemplate.includes("{{ .Data.brand_name }}"), "magic-link template can render the Core branding name")
assert(magicLinkTemplate.includes("{{ .ConfirmationURL }}"), "magic-link template uses Supabase confirmation URL")
assert(!magicLinkTemplate.toLowerCase().includes("powered by supabase"), "magic-link template removes Supabase powered-by copy")

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
assert(["missing-email", "rate-limited", "email-provider", "auth-failed"].every((code) => signInPage.includes(code)), "sign-in page handles each OTP error code")
assert(signInPage.includes("Email required") && signInPage.includes("Too many magic-link requests") && signInPage.includes("Email provider unavailable") && signInPage.includes("Sign-in failed"), "sign-in page has distinct user-facing OTP error messages")
assert(signInPage.includes("const exhaustive: never = errorCode"), "sign-in error messages are exhaustively matched")
assert(!signInPage.includes("Supabase is temporarily") && !signInPage.includes("Supabase could not"), "sign-in page does not expose auth vendor in user-facing OTP errors")
assert(!signInPage.includes("message: error.message"), "sign-in page does not log submitted-email-bearing OTP messages")
assert(!signInPage.includes("error.status === 500"), "sign-in page does not misclassify generic Supabase 500s as email provider errors")
assert(!signInPage.includes('code.includes("email")'), "sign-in page does not treat every email auth code as an SMTP failure")
assert(!signInPage.includes('message.includes("send")') && !signInPage.includes('message.includes("send email")'), "sign-in page does not treat generic network send failures as SMTP failures")

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
