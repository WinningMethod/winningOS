# WinningOS

WinningOS is an agent-agnostic, build-time modular framework for creating custom company operating systems.

It is not intended to be a generic SaaS product. Each deployment is meant to be owned, customized, and extended for a specific company or operating context.

## Current status

WinningOS Core is moving from implementation-contract phase into Supabase-backed implementation.

The repo now contains the initial Core docs, a simplified static frontend wireframe, the compatibility contract for future build-time plugins, Supabase environment helpers, and initial Core schema migrations. The next priority is auth/profile bootstrap so Core can resolve real users into profiles and memberships.

## Core principles

- Agent agnostic: Hermes, Claude Code, Codex, Cursor, OpenCode, human developers, and future agents should all be able to contribute by reading the same repo-native rules.
- Supabase-backed: Supabase is the default foundation for auth, Postgres data, and future storage/realtime needs.
- Build-time modularity: plugins are source-level modules included at build/deploy time, not runtime marketplace extensions.
- Company-owned deployments: WinningOS is a framework for building custom operating systems, not a centralized SaaS.
- Core first: plugin work waits until WinningOS Core is defined, reviewed, and stable. Agent/chat functionality belongs in plugin territory, not Core v0.1.

## Foundational documents

- `CORE.md` defines what WinningOS Core is responsible for.
- `AGENTS.md` defines repo-wide, agent-agnostic contribution rules.
- `ARCHITECTURE.md`, `DATA_MODEL.md`, and `SECURITY.md` define the current Core contract.
- `COMPATIBILITY.md` defines the future build-time plugin contract and explicitly defers plugin work until Core is operational and tested.
- `IMPLEMENTATION_PLAN.md`, `SUPABASE_CONTRACT.md`, and `ROUTE_MAP.md` define the implementation runway.
- `FRONTEND_BRIEF.md` and `V0_WIREFRAME_PROMPT.md` describe the static wireframe scope.

Additional implementation work should land in small, reviewable PRs.
