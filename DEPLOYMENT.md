# WinningOS Deployment Guide — zero to live

This is the complete runbook for taking a WinningOS instance live with no prior
context: Supabase project, database, hosted auth, and Vercel. If a step is not
in this file or a file it links to, it is not required.

## What you are deploying

WinningOS uses three kinds of repos (`COMPATIBILITY.md`, "Three-repository
model"):

1. `winningOS` — the Core framework. Deploy it directly only to evaluate Core.
2. `WinningTemplate` — the plugin template. **Never deployed**; it has no app.
3. **Deployment repos** — clones of Core, one per company OS, with plugins
   installed under `plugins/` and registered in `config/plugins.ts`. This is
   what a real company deploys.

The steps below are identical for Core and for a deployment repo; step 7 adds
the plugin-specific parts.

## Prerequisites

- Accounts: [Supabase](https://supabase.com) and [Vercel](https://vercel.com)
  (Hobby tiers work), plus GitHub access to the repo you are deploying.
- Node 20+ and npm locally. The Supabase CLI runs via `npx supabase` — no
  global install needed.

## 1. Create the Supabase project

Hard isolation rule: **one WinningOS deployment = one fresh Supabase project =
one database = one workspace**. Never point two deployment repos at the same
Supabase project, and never copy `.env.local` from `winningOS`, another company
deployment, or a scratch integration repo. Reusing a project mixes migration
history, users, plugin tables, permissions, storage buckets, and audit events.

Dashboard path:

1. Supabase Dashboard → **New project**.
2. Organization: the owning company/org.
3. Name: the deployment name, e.g. `AcmeCo`.
4. Region: usually the same region you plan to host from.
5. Set a strong **database password** and save it — you need it for migrations.

CLI path, if your Supabase account has project capacity:

```bash
export SUPABASE_ORG_ID="<org-id>"
export SUPABASE_REGION="us-east-2"
export SUPABASE_DB_PASSWORD="<new strong database password>"

npx supabase projects create "AcmeCo" \
  --org-id "$SUPABASE_ORG_ID" \
  --region "$SUPABASE_REGION" \
  --db-password "$SUPABASE_DB_PASSWORD"
```

If the CLI says the organization has reached its active free-project limit,
stop and resolve that in Supabase first: pause/delete an unused project, upgrade
the org, or explicitly create a paid-size project. Do **not** reuse an existing
WinningOS/Core project as a shortcut.

Collect these values (all under **Project Settings**):

| Value | Where |
|---|---|
| Project URL (`https://{ref}.supabase.co`) | Settings → API |
| `anon` / publishable key | Settings → API |
| `service_role` / secret key | Settings → API (keep secret) |
| Project ref (short id in the URL) | Settings → General |
| Database password | you set it at creation |
| Personal access token | supabase.com → Account → Access Tokens (for step 4) |

## 2. Local setup

```bash
git clone <your-repo> && cd <your-repo>
npm install
cp .env.example .env.local   # fill in the values from step 1
```

Before filling values, confirm this is a project created for **this repo**. The
variable names match every WinningOS deployment, but the values must be unique
per deployment.

`.env.local` minimum for a working app:

```text
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://{ref}.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="{anon key}"
SUPABASE_SERVICE_ROLE_KEY="{service_role key}"
SUPABASE_PROJECT_REF="{ref}"
SUPABASE_DB_PASSWORD="{database password}"
SUPABASE_DB_URL="postgresql://postgres:{percent-encoded-db-password}@db.{ref}.supabase.co:5432/postgres"
```

The `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` trio in
`.env.example` is only for the optional `@supabase/server` request handlers
(edge functions); the Next.js app does not need it to go live.

Sanity check before touching the database:

```bash
npm run typecheck && npm run build
npm run db:validate && npm run auth:validate && npm run members:validate \
  && npm run permissions:validate && npm run settings:validate && npm run plugins:validate
```

## 3. Apply the database migrations

Everything schema-level ships as migrations in `supabase/migrations/` — tables,
RLS policies, RPCs, seeds, permission grants, and the `core-brand` storage
bucket. There are **no manual dashboard steps** for the database or storage.

```bash
# Direct connection string: Dashboard → Connect → "Direct connection".
# Percent-encode special characters in the password.
export SUPABASE_DB_URL="postgresql://postgres:{percent-encoded-db-password}@db.{ref}.supabase.co:5432/postgres"

# Safety check: these refs must all be the new deployment project, not Core.
node - <<'NODE'
const env = process.env
const publicRef = (env.NEXT_PUBLIC_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const dbRef = (env.SUPABASE_DB_URL || '').match(/@db\.([^.]+)\.supabase\.co/)?.[1]
console.log({ publicRef, projectRef: env.SUPABASE_PROJECT_REF, dbRef })
if (!publicRef || !dbRef || publicRef !== dbRef || publicRef !== env.SUPABASE_PROJECT_REF) {
  process.exitCode = 1
}
NODE

npx supabase db push --db-url "$SUPABASE_DB_URL" --yes
```

Then verify the remote schema, RLS flags, seeds, and indexes:

```bash
npm run db:verify:remote
```

## 4. Push the hosted Auth configuration

Hosted Supabase Auth (link URLs, password policy, branded email templates) is
configured from this repo — `supabase/config.toml` + `supabase/templates/` —
and pushed with the CLI. The dashboard defaults are **not** correct on their
own.

First, **edit `supabase/config.toml` for your domain** (the committed values
belong to the reference deployment):

- `site_url` — your production origin, e.g. `https://acme-os.vercel.app`
  (use `http://localhost:3000` until you have one, then re-push after step 5)
- `additional_redirect_urls` — keep the localhost entries; replace the
  `*.vercel.app` entries with your own production domain and (optionally) your
  Vercel preview wildcard

Then push it:

```bash
SUPABASE_ACCESS_TOKEN={personal access token} \
  npx supabase config push --project-ref {ref} --yes
```

What this configures: email + password auth with minimum length 8, the branded
invite / confirmation / recovery templates (invite and recovery links land on
`/set-password`), and the redirect allow-list.

**Email volume warning:** Supabase's built-in mailer is rate-limited to a
handful of emails per hour and is not for production traffic. Before inviting
real members, configure custom SMTP (Dashboard → Auth → SMTP, e.g. Resend or
Postmark) — no code changes required.

## 5. Deploy to Vercel

1. Vercel → Add New → Project → import the repo. Framework preset **Next.js**;
   keep default build settings (`npm run build`).
2. Before the first deploy, add the environment variables (Project → Settings
   → Environment Variables, apply to Production and Preview):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secret) |
   | `NEXT_PUBLIC_APP_URL` | your production origin (set after the first deploy if you don't know it yet) |

3. Deploy. If you set or changed `NEXT_PUBLIC_APP_URL` after deploying,
   redeploy — `NEXT_PUBLIC_*` values are baked at build time.
4. Go back to step 4 and re-push the auth config with the real `site_url` and
   redirect URLs if you used placeholders. Auth emails link to whatever
   `site_url` was at push time; this is the most commonly missed step.

## 6. First sign-in and acceptance

1. Open the deployed app → **Sign up**. The **first account to sign in becomes
   the workspace owner** (structural: first active membership in the seeded
   workspace). Create your account before sharing the URL.
2. Everything else (workspace name, branding, invites, roles) is configured
   in-app: Settings and Members.
3. Run the owner→admin→member→viewer walkthrough in `TESTING.md`. A fresh
   deployment is not "live" until that passes.

## 7. Deployment repos: plugins

Only for deployment repos (clones of Core with plugins installed):

- Install per `COMPATIBILITY.md` "Installation": plugin source under
  `plugins/{plugin_id}/`, one registry line in `config/plugins.ts`, each plugin
  migration copied into `supabase/migrations/` with an install-date timestamp.
  Step 3's `db push` then applies plugin migrations exactly like Core's.
- `npm run plugins:validate` must be green before deploying — it checks the
  installed plugins against the `core-v0` contract.
- Plugin permissions appear in Settings → Roles (Plugins group) seeded with the
  manifest's default roles; the owner adjusts live grants in-app.
- To pull future Core updates into a deployment repo:
  `git remote add core <winningOS-url> && git fetch core && git merge core/main`,
  then re-run the validators and `db push` for any new migrations.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Pages 500 with `permission denied for schema private` | Migrations not (fully) applied — re-run step 3 and `npm run db:verify:remote` |
| Auth emails link to localhost or the wrong domain | `site_url` / redirect list not pushed for your domain — redo step 4 |
| Invite/recovery emails never arrive | Built-in mailer rate limit — configure custom SMTP (step 4 warning) |
| "Session bootstrap failed" on every page | Wrong `NEXT_PUBLIC_SUPABASE_*` values, or migrations missing (the bootstrap RPC doesn't exist yet) |
| Sign-up works but user is stuck on `/pending-access` | Expected for every account after the first — an owner/admin must invite them or they wait for membership |
| `/p/{plugin}` 404s | Plugin not in `config/plugins.ts` (or intentionally disabled) — that registry line is the on/off switch |
| Logo upload fails | `core-brand` bucket missing → migrations not applied; or file over 2 MB / not SVG/PNG/JPEG/WebP |

## Secrets hygiene

`service_role` key, database password, and access tokens live only in
`.env.local` (gitignored) and Vercel env vars. Never commit them, never prefix
them with `NEXT_PUBLIC_`, and rotate them if they leak. The anon key is public
by design; RLS is the boundary.
