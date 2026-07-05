# WinningOS

WinningOS is an agent-agnostic, build-time modular framework for creating custom company operating systems.

It is not intended to be a generic SaaS product. Each deployment is meant to be owned, customized, and extended for a specific company or operating context.

## Current status

WinningOS Core v0.1 is code-complete; the plugin boundary is now the active work.

The app is fully Supabase-backed: email + password auth (sign-up, invites, recovery), profile and first-owner bootstrap, member lifecycle management, an owner-editable live permission grant map, persisted workspace and branding settings (theme colors and logo restyle the whole shell), and an append-only audit trail — all enforced by security-definer RPCs and RLS. `COMPATIBILITY.md` is the buildable `core-v0` plugin contract, `PLUGIN_TEMPLATE_HANDOVER.md` briefs the agent building the `Example_Plugin` template repo, and the Phase 10 plugin host (manifest type, `config/plugins.ts` registry, `/p/{plugin_id}` host route, `@/core/plugins/api` barrel, `plugins:validate`) is shipped — the registry stays empty here; plugins install only into deployment repos (three-repository model). `TESTING.md` is the live readiness walkthrough.

## Core principles

- Agent agnostic: Hermes, Claude Code, Codex, Cursor, OpenCode, human developers, and future agents should all be able to contribute by reading the same repo-native rules.
- Supabase-backed: Supabase is the default foundation for auth, Postgres data, and future storage/realtime needs.
- Deployment-isolated: every clone/company OS uses a fresh Supabase project and database. Do not reuse the framework/Core Supabase project or copy another repo's `.env.local` into a deployment clone.
- Build-time modularity: plugins are source-level modules included at build/deploy time, not runtime marketplace extensions.
- Company-owned deployments: WinningOS is a framework for building custom operating systems, not a centralized SaaS.
- Core first: plugin work waits until WinningOS Core is defined, reviewed, and stable. Agent/chat functionality belongs in plugin territory, not Core v0.1.

## Deployment isolation

When cloning WinningOS for a company OS or scratch integration test, create a
new Supabase project first and fill that clone's `.env.local` from the new
project. The variable names are the same across deployments, but the values must
not be. Sharing the framework project's Supabase URL/keys/database with a clone
mixes migration history, users, plugin tables, permissions, storage, and audit
events across products.

Use `DEPLOYMENT.md` for the full runbook, including dashboard and CLI commands
for creating the project and applying migrations.

## Foundational documents

- `CORE.md` defines what WinningOS Core is responsible for.
- `AGENTS.md` defines repo-wide, agent-agnostic contribution rules.
- `ARCHITECTURE.md`, `DATA_MODEL.md`, and `SECURITY.md` define the current Core contract.
- `COMPATIBILITY.md` defines the future build-time plugin contract and explicitly defers plugin work until Core is operational and tested.
- `IMPLEMENTATION_PLAN.md`, `SUPABASE_CONTRACT.md`, and `ROUTE_MAP.md` define the implementation runway.
- `DEPLOYMENT.md` is the zero-to-live runbook (Supabase project, migrations, hosted auth, Vercel); `DEVELOPMENT.md` covers local development; `TESTING.md` is the live acceptance walkthrough.
- `FRONTEND_BRIEF.md` and `V0_WIREFRAME_PROMPT.md` describe the static wireframe scope.

Additional implementation work should land in small, reviewable PRs.
