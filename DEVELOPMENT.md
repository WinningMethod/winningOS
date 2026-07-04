# WinningOS Core Development Guide

## Purpose

This guide covers developing WinningOS Core locally: environment variables, Supabase client boundaries, validators, and migration workflow.

**Taking an instance live** (Supabase project creation, hosted auth setup, Vercel) is a separate, complete runbook: `DEPLOYMENT.md`. A third-party developer goes zero-to-live from that file alone; this one is for working on the code.

## Prerequisites

Use the repo's existing Node/npm toolchain.

```bash
node --version
npm --version
```

Install dependencies:

```bash
npm install
```

## Environment setup

Create a local environment file:

```bash
cp .env.example .env.local
```

Then fill in values from the Supabase project that will back the Core deployment.

Required browser-safe variables for Next.js / `@supabase/ssr` helpers:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Required server-only variable for admin helper paths:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Required direct `@supabase/server` request-handler variables:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
```

Optional direct request-handler variable:

```text
SUPABASE_JWKS_URL
```

WinningOS derives the JWKS URL from `SUPABASE_URL` when `SUPABASE_JWKS_URL` is blank. If `SUPABASE_JWKS_URL` is set, its origin must match `SUPABASE_URL`.

Copy the real values from the Supabase dashboard Connect dialog. Never commit the secret key.

## Supabase hosted Auth URL and email setup

The hosted Supabase Auth project must use the same redirect and email-template contract as `supabase/config.toml`:

- Site URL: `https://winning-os.vercel.app`
- Redirect allow-list includes local development, production, the stable PR branch alias, and Vercel preview wildcard URLs.
- Minimum password length: 8 (email + password is the primary auth method, issue #39)
- Repo-owned branded email templates in `supabase/templates/`:
  - `invite.html` — member invitations (lands on `/set-password`)
  - `confirmation.html` — sign-up email confirmation
  - `recovery.html` — password reset (lands on `/set-password`)
  - `magic_link.html` — legacy links only; sign-in no longer sends magic links

After changing `supabase/config.toml` or auth email templates, push the hosted Auth config with a Supabase access token:

```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase config push --project-ref <project-ref> --yes
```

Do not rely on local `config.toml` alone for hosted Auth behavior; hosted auth link URLs, password policy, and email branding come from the Supabase project Auth configuration.

## Environment variable rules

### Browser-safe variables

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are available to browser code.

The anon key is not treated as a secret. Supabase Row Level Security must protect data access.

### Server-only variables

`SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SECRET_KEY` are secret.

Rules:

- do not prefix secrets with `NEXT_PUBLIC_`
- do not import secrets into client components
- do not log secrets
- do not commit secrets
- do not use admin/secret clients for normal user-facing reads/writes
- only use it in explicitly named server/admin paths after the service-role use case is documented

## Supabase helper files

The helper skeletons live in:

```text
core/supabase/env.public.ts
core/supabase/env.server.ts
core/supabase/browser.ts
core/supabase/server.ts
core/supabase/service-role.ts
```

Expected boundaries:

- `env.public.ts` validates browser-safe public Supabase variables only.
- `env.server.ts` is guarded with `server-only` and validates server-only variables.
- `browser.ts` creates a memoized browser-safe client with public env vars only.
- `server.ts` creates a cookie-aware server client for Server Components, Server Actions, and Route Handlers.
- `service-role.ts` creates a server-only admin client and must remain exceptional.

Do not import `service-role.ts` from client components.


## Direct Supabase request handlers

WinningOS can use `@supabase/server` for Supabase Edge Functions, Workers, or other standard Web `Request`/`Response` handlers.

The Core wrapper lives in:

```text
core/supabase/request-handler.ts
```

Use `withWinningOSUser` for authenticated user endpoints. It validates a user JWT and provides:

- `ctx.supabase` — RLS-scoped client for the authenticated user
- `ctx.supabaseAdmin` — admin client that bypasses RLS; use only for explicit server-side admin cases

Example shape:

```ts
import { withWinningOSUser } from "@/core/supabase/request-handler"

export default {
  fetch: withWinningOSUser(async (_request, ctx) => {
    const { data } = await ctx.supabase.from("core_workspaces").select()
    return Response.json(data)
  }),
}
```

Auth modes exposed by the wrapper:

```text
withWinningOSUser        -> auth: "user"
withWinningOSPublishable -> auth: "publishable"
withWinningOSSecret      -> auth: "secret"
withWinningOSOpen        -> auth: "none"
```

For Supabase Edge Functions that use `publishable`, `secret`, or `none` auth modes, add a function-specific config block with `verify_jwt = false` in `supabase/config.toml`.

## Local commands

Run the development server:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

Run TypeScript validation without emitting files:

```bash
npm run typecheck
```

## Current expected app behavior

The app is fully Supabase-backed: auth, members, roles, permissions, workspace/branding settings, and the audit feed all read and write live data. There is no mock data left in the app.

Expected routes:

```text
/
/sign-in  /sign-up  /forgot-password  /set-password
/auth/callback  /auth/sign-out  /pending-access
/home
/members
/settings
```

See `ROUTE_MAP.md` for the auth/data/permission boundary of each route.


## Supabase migration safety notes

The RLS helper functions live in the `private` schema, which is not in PostgREST's exposed schemas — that is what keeps them off the public RPC surface. Postgres evaluates RLS policy expressions **as the querying role**, so `authenticated` must hold `USAGE` on the private schema and `EXECUTE` on exactly the helpers that policies reference (see `20260703210000_fix_rls_helper_grants.sql`, which fixed issues #46/#47 where settings reads failed with `permission denied for schema private`, and `20260704210000_grant_plugin_rls_profile_helper.sql`, which added `core_current_profile_id` for the plugin RLS templates). The rules going forward: never grant anything in `private` to `anon` or `public`; grant `EXECUTE` to `authenticated` only for helpers an RLS policy actually references; helpers called only from inside security-definer functions stay revoked. `npm run db:validate` enforces this allowlist.

The seed migration must revive/update the deterministic default workspace row by clearing `deleted_at` rather than silently no-oping or leaving a soft-deleted slug invisible to RLS. Role and branding seeds should resolve the active default workspace by slug and preserve any existing `logo_url` during branding reset behavior. Seed comments should document that deterministic IDs are guaranteed on clean databases while non-fresh development/restored databases preserve surviving primary keys. Future seed changes should remain idempotent and should not assume a hidden workspace-switching feature.

## Migration validation

Validate the migration contract without needing a running Supabase container:

```bash
npm run db:validate
npm run auth:validate
npm run members:validate
npm run permissions:validate
npm run settings:validate
npm run plugins:validate
```

These check that the expected Core migrations, tables, seed records, RLS enables, helper functions, and app wiring are present (`plugins:validate` additionally checks any installed plugins against the `core-v0` contract in deployment repos). They are not a replacement for applying migrations to a real Supabase project.

## Apply migrations to the remote Supabase project

After `.env.local` contains the real project values, apply pending migrations with the Supabase CLI using the percent-encoded database URL derived from the project ref and database password:

```bash
npx supabase db push --db-url "$SUPABASE_DB_URL" --yes
```

If `SUPABASE_DB_URL` is not set, build the connection string from `SUPABASE_PROJECT_REF` and `SUPABASE_DB_PASSWORD` without committing it.

Verify the remote Core schema, RLS flags, seed rows, migration history, and required indexes:

```bash
npm run db:verify:remote
```

The remote verification script reads `.env.local`, does not print secret values, and fails if the JWKS URL origin does not match `SUPABASE_URL`.

## Going live

Applying migrations to a live project, pushing the hosted Auth config, and deploying to Vercel are covered end-to-end in `DEPLOYMENT.md`. The live readiness walkthrough is `TESTING.md` (Phase 9 gate in `IMPLEMENTATION_PLAN.md`).

## Supabase Auth local URLs

Local Supabase Auth redirects use `http://localhost:3000` as `site_url` and allow `http://127.0.0.1:3000` as the additional redirect URL. Do not duplicate `site_url` inside `additional_redirect_urls`.

## Auth/profile bootstrap note

`core_profiles` includes a minimal authenticated INSERT policy (`user_id = auth.uid()`) so the next auth/profile slice can create user-owned profiles through the Supabase client or replace that path with a deliberate security-definer trigger. Non-active membership rows remain hidden from ordinary member reads until elevated member-management policies are added.


## Auth behavior

The app uses email + password as the primary auth method (issue #39):

- `/sign-in` calls `signInWithPassword` — no email is sent on login.
- `/sign-up` creates an account (`signUp`); with confirmations enabled, a branded confirmation email is sent.
- `/forgot-password` sends a branded recovery email that lands on `/set-password`. This also lets pre-password (magic-link era) accounts set their first password.
- Member invites send a branded invite email that lands on `/set-password`.
- `/auth/callback` handles code exchange, token-hash verification (invite/magiclink/recovery/signup), and legacy hash-token links.
- Protected app routes call `ensureCoreSession()`; the first authenticated user becomes owner of the seeded workspace; authenticated users without membership are routed to `/pending-access`.
- All auth failures map to the safe error vocabulary in `core/auth/errors.ts` (issue #26) — no vendor-internal or user-supplied text is reflected.

For production auth redirects, set `NEXT_PUBLIC_APP_URL` to the deployed app origin. WinningOS intentionally does not trust forwarded host headers for auth callback URLs.
