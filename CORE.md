# WinningOS Core Charter

## Purpose

WinningOS Core is the stable foundation for custom company operating systems.

It provides the shared primitives that every WinningOS deployment needs before any company-specific plugins or workflows are added.

WinningOS Core must be boring, explicit, durable, and easy to reason about. Future plugins and businesses will inherit its assumptions, so the core should change slowly and intentionally.

## What WinningOS is

WinningOS is:

- an agent-agnostic framework for building custom company operating systems
- a source-owned, build-time modular web application foundation
- a Supabase-backed system for identity, workspaces, permissions, branding, and shared data boundaries
- a base that can be cloned, customized, extended, and deployed by each company
- a platform that agents can help build, maintain, and extend without owning the product architecture

## What WinningOS is not

WinningOS is not:

- a generic SaaS product
- a runtime plugin marketplace
- a centralized multi-tenant product where all customers share one hosted app
- a place for business-specific workflows to live in core
- tied to one AI coding agent, chat agent, model provider, or business workflow

## Core responsibilities

WinningOS Core owns the primitives that every deployment needs:

1. Identity and session boundaries
2. Supabase integration conventions
3. Workspace data model
4. Membership model
5. Roles and permissions
6. Branding and theme tokens
7. App shell and navigation rules
8. Build-time plugin readiness boundary
9. Compatibility rules
10. Repo-wide development and agent contribution rules

## Core non-goals

WinningOS Core should not own company-specific or department-specific workflows.

These belong outside core:

- meeting notes
- CRM
- project management
- billing
- analytics
- documents
- automations
- industry-specific workflows
- agent/chat experiences

Core may define how these things plug in, but should not implement them directly.

## Agent agnosticism

WinningOS must stand on its own without requiring Hermes, Claude Code, Codex, Cursor, V0, OpenCode, or any other agent.

The canonical project rules live in repo-native documents such as:

- `README.md`
- `CORE.md`
- `AGENTS.md`
- future `ARCHITECTURE.md`
- future `DATA_MODEL.md`
- future `SECURITY.md`
- `COMPATIBILITY.md`

Agent-specific files are not part of the required core contract.

If an instruction applies to all agents and humans, it belongs in an agent-agnostic repo document.

If an instruction applies only to one tool, it must be optional and must not be required to understand or maintain WinningOS.

## Deployment assumption

A WinningOS deployment represents a company-owned operating system.

For Core v0.1, one deployed WinningOS Core instance equals one workspace. Core should not include workspace switching, workspace creation, or multi-workspace management. Keeping this boundary tight avoids premature permission complexity.

Default assumption:

- one deployed WinningOS instance is owned by one company or operating group
- that instance contains one workspace
- data is scoped and permissioned inside that workspace
- future cross-workspace needs should be handled by explicit export/integration plugins or a separate receiving Core style designed to aggregate data from multiple workspaces

## Supabase assumption

Supabase is the default backend foundation for WinningOS Core.

Core should define:

- auth conventions
- Postgres schema conventions
- Row Level Security expectations
- environment variable conventions
- migration conventions
- server/client usage boundaries

Core should avoid hiding Supabase behind unnecessary abstractions before the real requirements are clear.

## Build-time modularity assumption

WinningOS uses build-time modularity.

Future plugins are expected to be source-level modules included in the codebase and deployed with the app.

This keeps each company OS:

- inspectable
- editable
- version-controlled
- deployable as one system
- understandable by humans and agents

Runtime plugin loading and marketplace-style installation are out of scope unless explicitly reconsidered later.

## Permission philosophy

Permissions must be explicit and boring.

Core permissions should protect core actions like:

- managing the active workspace
- managing members
- managing roles
- managing branding
- managing settings
- managing future plugin installation/configuration

UI hiding is not security. Permissions must eventually be enforced at server/data boundaries too.

Supabase Row Level Security should be used for data protection where applicable.

## Theme philosophy

Branding should be token-based.

Core owns the theme token system so custom company branding can be applied consistently across core and future modules.

Business-specific UI may vary, but it should consume core theme primitives instead of hardcoding brand assumptions.

## Agent/chat philosophy

Agent and chat functionality should not live in WinningOS Core v0.1.

Core should be ready to accept future build-time plugins, and an agent/chat experience can be one of those future plugins. Core should not ship agent-specific settings, provider selectors, chat previews, agent permissions, or provider secret handling until the plugin boundary and compatibility contract are defined.

Hermes or another provider may become a reference plugin later, but WinningOS Core must not hardcode any agent provider or model provider.

## Plugin timing

Plugins are intentionally not part of Core v0.1 implementation work.

Before plugins are implemented, WinningOS Core must first define:

1. what core owns
2. what core refuses to own
3. how identity, workspace membership, permissions, Supabase, branding, and plugin readiness work
4. how compatibility will be judged

The meeting notes plugin is a future validation use case, not the starting point.

## Definition of Core v0.1

WinningOS Core v0.1 should eventually include:

- Next.js app foundation
- Supabase auth/data foundation
- core profile/workspace/membership model
- basic role and permission model
- app shell and navigation model
- branding/theme token model
- compatibility contract for future build-time plugins
- agent-agnostic contribution rules

Core v0.1 should become operational and tested before any plugin repo, example plugin, or real plugin is created.
