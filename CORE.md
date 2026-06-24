# WinningOS Core Charter

## Purpose

WinningOS Core is the stable foundation for custom company operating systems.

It provides the shared primitives that every WinningOS deployment needs before any company-specific plugins or workflows are added.

WinningOS Core must be boring, explicit, durable, and easy to reason about. Future plugins, agents, and businesses will inherit its assumptions, so the core should change slowly and intentionally.

## What WinningOS is

WinningOS is:

- an agent-agnostic framework for building custom company operating systems
- a source-owned, build-time modular web application foundation
- a Supabase-backed system for identity, workspaces, permissions, branding, and shared data boundaries
- a base that can be cloned, customized, extended, and deployed by each company
- a platform where agents can help build, maintain, and extend the system without owning the architecture

## What WinningOS is not

WinningOS is not:

- a generic SaaS product
- a runtime plugin marketplace
- a centralized multi-tenant product where all customers share one hosted app
- a place for business-specific workflows to live in core
- tied to one AI coding agent, one chat agent, or one model provider

## Core responsibilities

WinningOS Core owns the primitives that every deployment needs:

1. Identity and session boundaries
2. Supabase integration conventions
3. Workspace data model
4. Membership model
5. Roles and permissions
6. Branding and theme tokens
7. App shell and navigation rules
8. Agent/chat provider abstraction
9. Build-time plugin boundary, later
10. Compatibility rules, later
11. Repo-wide development and agent contribution rules

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
- provider-specific integrations unless they are reference adapters

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
- future `COMPATIBILITY.md`

Agent-specific files are not part of the required core contract.

If an instruction applies to all agents and humans, it belongs in an agent-agnostic repo document.

If an instruction applies only to one tool, it must be optional and must not be required to understand or maintain WinningOS.

## Deployment assumption

A WinningOS deployment represents a company-owned operating system.

The framework should support multiple internal workspaces if useful, but it should not force SaaS-style tenant assumptions into every core decision.

Default assumption:

- one deployed WinningOS instance is owned by one company or operating group
- that instance may contain multiple workspaces, departments, or operating contexts
- data should be scoped and permissioned clearly even within a single-company deployment

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

- managing workspaces
- managing members
- managing roles
- managing branding
- managing settings
- using or configuring chat/agent features
- managing future plugin installation/configuration

UI hiding is not security. Permissions must eventually be enforced at server/data boundaries too.

Supabase Row Level Security should be used for data protection where applicable.

## Theme philosophy

Branding should be token-based.

Core owns the theme token system so custom company branding can be applied consistently across core and future modules.

Business-specific UI may vary, but it should consume core theme primitives instead of hardcoding brand assumptions.

## Agent/chat philosophy

WinningOS Core may include an agent/chat interface, but it must remain provider-neutral.

Hermes can be a reference or default adapter, but WinningOS must not be hardcoded to Hermes.

The correct abstraction is:

```text
WinningOS Core defines an agent provider interface.
Specific agents/providers implement adapters.
```

## Plugin timing

Plugins are intentionally not part of the first core slice.

Before plugins are implemented, WinningOS Core must first define:

1. what core owns
2. what core refuses to own
3. how identity, teams, permissions, Supabase, branding, and agent interfaces work
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
- provider-neutral agent/chat interface
- compatibility contract for future build-time plugins
- agent-agnostic contribution rules

The first repo slice is documentation only: this charter and the initial agent-agnostic contribution rules.
