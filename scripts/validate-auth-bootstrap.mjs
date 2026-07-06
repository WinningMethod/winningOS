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

// ---------------------------------------------------------------------------
// Email + password auth (issue #39): password is the sign-in hot path; email
// remains only for invites, sign-up confirmation, and password recovery.
// ---------------------------------------------------------------------------
assert(supabaseConfig.includes("minimum_password_length = 8"), "Supabase auth config sets a minimum password length")
assert(supabaseConfig.includes("[auth.email.template.invite]") && supabaseConfig.includes('content_path = "./supabase/templates/invite.html"'), "Supabase invite email uses a repo-owned template")
assert(supabaseConfig.includes("[auth.email.template.recovery]") && supabaseConfig.includes('content_path = "./supabase/templates/recovery.html"'), "Supabase recovery email uses a repo-owned template")
assert(supabaseConfig.includes("[auth.email.template.confirmation]") && supabaseConfig.includes('content_path = "./supabase/templates/confirmation.html"'), "Supabase confirmation email uses a repo-owned template")

for (const template of ["invite", "recovery", "confirmation"]) {
  const html = read(`supabase/templates/${template}.html`)
  assert(html.includes("WinningOS Core"), `${template} template is branded as WinningOS Core`)
  assert(html.includes("{{ .ConfirmationURL }}"), `${template} template uses Supabase confirmation URL`)
  assert(!html.toLowerCase().includes("powered by supabase"), `${template} template removes Supabase powered-by copy`)
}

const authErrors = read("core/auth/errors.ts")
assert(authErrors.includes("classifyAuthError"), "shared auth error module classifies Supabase errors")
assert(authErrors.includes('"invalid-credentials"') && authErrors.includes('"email-not-confirmed"') && authErrors.includes('"weak-password"'), "auth error module covers password auth codes")
assert(authErrors.includes("error.status === 429"), "auth error module prefers HTTP 429 for rate limits")
assert(authErrors.includes("Never reflect `error.message` to users"), "auth error module documents no-reflection rule")
assert(!authErrors.includes("Supabase is temporarily"), "auth error messages do not expose the auth vendor")

const authActions = read("core/auth/actions.ts")
assert(authActions.includes("signInWithPassword"), "auth actions sign in with password (no email on login)")
assert(!authActions.includes("signInWithOtp"), "auth actions no longer send magic links on sign-in")
assert(authActions.includes("supabase.auth.signUp"), "auth actions support password sign-up")
assert(authActions.includes("resetPasswordForEmail"), "auth actions support password recovery email")
assert(authActions.includes("updateUser({ password })"), "auth actions support setting a new password")
assert(authActions.includes("resolveAppOriginFromHeaders"), "auth actions use shared origin resolver")
assert(authActions.includes("emailRedirectTo"), "sign-up supplies auth callback redirect")
assert(authActions.includes("next=/set-password"), "recovery email lands on the set-password page")
assert(authActions.includes("classifyAuthError"), "auth actions classify failures through the shared module")
assert(authActions.includes("password !== confirmPassword"), "password forms verify the confirmation field")
assert(authActions.includes("obfuscated user"), "sign-up documents the account-enumeration guard")
assert(!authActions.includes("message: error.message"), "auth actions do not log email-bearing error messages")
assert(
  authActions.includes('errorCode === "email-not-confirmed" ? "invalid-credentials" : errorCode'),
  "sign-in collapses email-not-confirmed into invalid-credentials to avoid account enumeration",
)
assert(originUtility.includes("NEXT_PUBLIC_APP_URL"), "origin utility avoids Supabase URL as app callback fallback")
assert(originUtility.includes("NEXT_PUBLIC_APP_URL is required"), "origin utility requires explicit production app URL")

const signInPage = read("app/(auth)/sign-in/page.tsx")
assert(signInPage.includes("signInWithPassword"), "sign-in page submits email + password")
assert(signInPage.includes('type="password"'), "sign-in page has a password field")
assert(signInPage.includes("/forgot-password"), "sign-in page links to password recovery")
assert(signInPage.includes("/sign-up"), "sign-in page links to account creation")
assert(!signInPage.includes("x-forwarded-host"), "sign-in page does not trust forwarded host for auth redirect")
assert(!signInPage.includes("encodeURIComponent(email)"), "sign-in page does not reflect email from URL query")
assert(signInPage.includes("toAuthErrorCode"), "sign-in page renders errors through the shared vocabulary")

const authNotice = read("components/app/auth-notice.tsx")
assert(authNotice.includes('role="alert"') && authNotice.includes('aria-live="assertive"'), "auth error notice alerts on initial render")
assert(authNotice.includes('role="status"') && authNotice.includes('aria-live="polite"'), "auth status notice is exposed politely")

// ---------------------------------------------------------------------------
// Deployment setup notice (AcmeCo issue #3): auth surfaces explain a
// misconfigured deployment instead of crashing into the masked production
// error page.
// ---------------------------------------------------------------------------
const envPublicModule = read("core/supabase/env.public.ts")
assert(envPublicModule.includes("publicSupabaseEnvProblems"), "env module exposes a non-throwing preflight for public Supabase vars")
assert(envPublicModule.includes("wrapped in quotes"), "preflight detects quote-wrapped values")
assert(envPublicModule.includes("must be the project URL starting with https://"), "preflight detects non-https Supabase URLs")

const authLayout = read("app/(auth)/layout.tsx")
assert(authLayout.includes("publicSupabaseEnvProblems"), "auth layout renders a setup notice from the env preflight")
assert(authLayout.includes('role="alert"') && authLayout.includes('aria-live="assertive"'), "auth setup notice alerts screen readers")

const authErrorBoundary = read("app/(auth)/error.tsx")
assert(authErrorBoundary.includes('role="alert"') && authErrorBoundary.includes('aria-live="assertive"'), "auth error boundary alerts screen readers")

const signUpPage = read("app/(auth)/sign-up/page.tsx")
assert(signUpPage.includes("signUpWithPassword"), "sign-up page submits the password sign-up action")
assert(signUpPage.includes("confirmPassword"), "sign-up page confirms the password")
assert(signUpPage.includes("first account becomes the workspace owner"), "sign-up page explains first-owner bootstrap")

const forgotPage = read("app/(auth)/forgot-password/page.tsx")
assert(forgotPage.includes("requestPasswordReset"), "forgot-password page submits the reset action")
assert(forgotPage.includes("If an account exists"), "forgot-password page does not confirm account existence")

const setPasswordPage = read("app/(auth)/set-password/page.tsx")
assert(setPasswordPage.includes("updatePassword"), "set-password page submits the password update action")
assert(setPasswordPage.includes("session-expired"), "set-password page redirects unauthenticated visitors safely")

const callbackRoute = read("app/auth/callback/route.ts")
assert(callbackRoute.includes("exchangeCodeForSession"), "auth callback exchanges code for session")
assert(callbackRoute.includes("verifyOtp"), "auth callback verifies token-hash email links")
assert(callbackRoute.includes("setSession"), "auth callback can persist implicit hash-token sessions")
assert(callbackRoute.includes("access_token") && callbackRoute.includes("refresh_token"), "auth callback reads Supabase hash-token session payloads")
assert(callbackRoute.includes("completeHashTokenSession"), "auth callback serves client-side hash-token completion bridge")
assert(callbackRoute.includes("token_hash"), "auth callback accepts Supabase invite token hash links")
assert(callbackRoute.includes('"invite"') && callbackRoute.includes('"magiclink"') && callbackRoute.includes('"recovery"') && callbackRoute.includes('"signup"'), "auth callback accepts invite, magic-link, recovery, and signup token types")
assert(callbackRoute.includes("sanitizeNextPath"), "auth callback only follows same-app relative next paths")
assert(callbackRoute.includes("/set-password"), "auth callback routes invite/recovery links to set-password")
assert(callbackRoute.includes("otp_expired") && callbackRoute.includes("link-expired"), "auth callback maps expired links to a distinct error code")
assert(callbackRoute.includes("invalid-callback-link"), "auth callback rejects unsupported token callback types with a safe code")
assert(callbackRoute.includes("resolveAppOriginFromRequest"), "auth callback uses configured app origin")
assert(callbackRoute.includes("isSameOrigin"), "auth callback POST guards same-origin requests")
assert(callbackRoute.includes("origin !== null"), "auth callback POST requires Origin header on token POST")
assert(callbackRoute.includes("noscript") && callbackRoute.includes("missing-code"), "auth callback hash-token bridge has noscript fallback for JS-disabled browsers")
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
