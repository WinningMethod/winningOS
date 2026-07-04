# WinningOS Agent Instructions

This repository is agent-agnostic.

These instructions apply to any AI agent or human developer working in WinningOS, including Hermes, Claude Code, Codex, Cursor, OpenCode, V0-assisted workflows, and future tools.

## Source of truth

Read these files before making architectural changes:

1. `README.md`
2. `CORE.md`
3. `AGENTS.md`

As the repo matures, additional source-of-truth documents may be added, such as:

- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `SECURITY.md`
- `COMPATIBILITY.md`

## Current phase

WinningOS Core v0.1 is code-complete: Supabase-backed auth (email + password), members, live editable permissions, persisted workspace/branding settings, and an audit trail, all enforced by security-definer RPCs and RLS.

The current focus is the plugin boundary. `COMPATIBILITY.md` is the buildable `core-v0` contract; the `Example_Plugin` template is being built in a separate repo from `PLUGIN_TEMPLATE_HANDOVER.md`; Core's next slice is Phase 10 (plugin host primitives) in `IMPLEMENTATION_PLAN.md`.

Inside this repo, plugin work means Phase 10 host primitives only. Business-specific features and real plugin implementations still do not belong here.

## Product rules

- WinningOS is a framework for custom company operating systems.
- WinningOS is not a generic SaaS app.
- WinningOS is not a runtime plugin marketplace.
- WinningOS must stay agent-agnostic.
- Supabase is the intended backend foundation.
- Plugins are build-time/source-level modules, but plugin work starts only after core is defined. Agent/chat functionality is plugin territory, not Core v0.1.

## Agent rules

- Do not create agent-specific required project files unless explicitly approved.
- Do not make Hermes, Claude Code, Codex, or any single agent mandatory for repo comprehension.
- If a rule applies to all agents and humans, put it in an agent-agnostic repo document.
- If a rule is tool-specific, it must be optional and must not be required to understand the framework.

## Architecture rules

- Keep core small and stable.
- Do not put business-specific workflows in core.
- Prefer explicit contracts over clever abstractions.
- Prefer readable documentation before premature implementation.
- Ask before broad architecture changes.
- Do not introduce runtime plugin assumptions without explicit approval.

## Supabase rules

Supabase is the intended foundation for auth and data.

Do not add a different auth/database provider unless explicitly approved.

When Supabase implementation begins, changes must document:

- required environment variables
- schema/migration conventions
- Row Level Security expectations
- server/client usage boundaries

## Permission rules

Permissions must be explicit.

Do not rely only on UI hiding for security.

When permission implementation begins, permission checks must be designed for both UI and server/data boundaries.

## Plugin rules

Plugins are build-time source modules governed by `COMPATIBILITY.md` (`core-v0`). Plugin repos live outside Core and are built from the `Example_Plugin` template.

Inside Core, plugin work is limited to the Phase 10 host primitives (`core/plugins/`, `config/plugins.ts`, the `/p/[plugin]` host route, plugin validators). Do not implement plugin features, business workflows, or agent/chat functionality in Core folders.

The meeting notes and agent plugins remain future validation use cases, not Core scope.

## Validation rules

For documentation-only changes, verify with:

```bash
git diff --check
```

For future application code, validation commands will be defined once the stack is scaffolded.

Expected future checks may include:

```bash
npm run lint
npm run build
npm test
npm run compatibility:check
```

Do not claim implementation is complete until the relevant validation commands have been run.

## Change management

Work in small, reviewable slices.

For major changes:

1. explain the intended change
2. make the smallest useful edit
3. verify it
4. summarize the diff
5. wait for feedback before expanding scope

## Current implementation guardrails

The current repo may contain Core docs and the static frontend wireframe.

Until Core implementation begins in the approved sequence:

- no plugin code
- no meeting-notes plugin
- no agent/chat functionality in Core
- no business-specific workflows
- no workspace switcher or multi-workspace management

Implementation should now proceed in small PRs that map back to `IMPLEMENTATION_PLAN.md`, `SUPABASE_CONTRACT.md`, `ROUTE_MAP.md`, and `COMPATIBILITY.md`.
