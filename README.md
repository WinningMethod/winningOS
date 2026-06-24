# WinningOS

WinningOS is an agent-agnostic, build-time modular framework for creating custom company operating systems.

It is not intended to be a generic SaaS product. Each deployment is meant to be owned, customized, and extended for a specific company or operating context.

## Current status

WinningOS Core is in implementation-contract phase.

The repo now contains the initial Core docs and a simplified static frontend wireframe. The next priority is to lock the Supabase/auth/data/route contract before adding real backend behavior, migrations, plugins, or business workflows.

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
- `FRONTEND_BRIEF.md` and `V0_WIREFRAME_PROMPT.md` describe the static wireframe scope.

Additional implementation and compatibility documents should be added in small, reviewable PRs.
