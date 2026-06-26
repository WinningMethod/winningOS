# WinningOS Core Development Guide

## Purpose

This guide explains how to run WinningOS Core locally during the Supabase environment-contract phase.

This is not the full backend implementation guide yet. This PR adds the environment contract and Supabase client helper skeletons only.

Current scope:

- document required environment variables
- document public vs server-only Supabase boundaries
- add reusable Supabase client helper skeletons
- keep the current UI mock-data based

Out of scope for this phase:

- schema migrations
- Supabase Auth UI replacement
- profile bootstrap
- RLS policies
- real database reads/writes
- plugin code
- agent/chat functionality

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

Required browser-safe variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Required server-only variable:

```text
SUPABASE_SERVICE_ROLE_KEY
```

## Environment variable rules

### Browser-safe variables

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are available to browser code.

The anon key is not treated as a secret. Supabase Row Level Security must protect data access.

### Server-only variables

`SUPABASE_SERVICE_ROLE_KEY` is secret.

Rules:

- do not prefix it with `NEXT_PUBLIC_`
- do not import it into client components
- do not log it
- do not commit it
- do not use it for normal user-facing reads/writes
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

During this phase, the UI still uses mock data.

The Supabase helpers and initial migrations exist so future PRs can wire real auth/data safely without inventing environment boundaries or schema shape inside feature work.

Expected routes remain:

```text
/
/home
/members
/settings
```


## Supabase migration safety notes

The initial RLS helper functions live in the non-exposed `private` schema. Keep security-definer helpers out of the public PostgREST RPC surface unless there is an explicit product reason to expose them. Do not grant direct private schema usage to browser-facing roles, and do not add direct `GRANT EXECUTE` paths for private RLS helpers to `authenticated` or `anon`. Future server-only grants must be explicit and validator-safe.

The seed migration must revive/update the deterministic default workspace row by clearing `deleted_at` rather than silently no-oping or leaving a soft-deleted slug invisible to RLS. Role and branding seeds should resolve the active default workspace by slug and preserve any existing `logo_url` during branding reset behavior. Seed comments should document that deterministic IDs are guaranteed on clean databases while non-fresh development/restored databases preserve surviving primary keys. Future seed changes should remain idempotent and should not assume a hidden workspace-switching feature.

## Migration validation

Validate the migration contract without needing a running Supabase container:

```bash
npm run db:validate
```

This checks that the expected Core migrations, tables, seed records, RLS enables, and helper functions are present. It is not a replacement for applying migrations to a real Supabase project.

## Next implementation steps

After this initial schema phase, the next implementation slices should be:

1. auth/profile bootstrap
2. first-owner bootstrap path for the seeded workspace
3. membership and permission helpers
4. replacement of mock reads with Supabase reads
5. persisted settings writes
6. RLS policy expansion for permission-aware writes

Do not start plugin work until Core is operational and tested.

## Supabase Auth local URLs

Local Supabase Auth redirects use `http://localhost:3000` as `site_url` and allow `http://127.0.0.1:3000` as the additional redirect URL. Do not duplicate `site_url` inside `additional_redirect_urls`.

## Auth/profile bootstrap note

`core_profiles` includes a minimal authenticated INSERT policy (`user_id = auth.uid()`) so the next auth/profile slice can create user-owned profiles through the Supabase client or replace that path with a deliberate security-definer trigger. Non-active membership rows remain hidden from ordinary member reads until elevated member-management policies are added.
