# WinningOS Core Compatibility Contract

## Purpose

This document defines how future build-time plugins may extend WinningOS Core without weakening the Core foundation.

It is a contract for future work, not an implementation step. WinningOS Core must become operational and tested before any plugin repo, example plugin, plugin loader, or real plugin is built.

## Current decision

WinningOS Core v0.1 is the base system:

- one workspace per Core deployment
- Supabase-backed auth and data
- profiles
- memberships
- roles
- permissions
- workspace settings
- branding/theme tokens
- app shell and navigation ownership
- plugin-readiness rules

Plugin work is deliberately deferred.

Do not build these yet:

- `Example_Plugin`
- Agent/chat plugin
- meeting notes plugin
- plugin folders inside Core
- plugin manifests
- plugin registry UI
- runtime plugin marketplace
- auto-install or one-click install flows

## Compatibility level

The initial compatibility level is:

```text
core-v0
```

`core-v0` means:

- single-workspace WinningOS Core
- source-owned deployment
- Supabase Auth and Postgres foundation
- explicit permission strings
- RLS-protected data model
- build-time plugin inclusion only
- no runtime plugin marketplace

Future plugin repos may eventually declare compatibility with `core-v0` or a more precise semver range, but no plugin compatibility implementation exists yet.

## What a plugin is

A WinningOS plugin is future source code that extends a WinningOS deployment at build time.

A plugin is:

- reviewed source code
- version-controlled
- included before build/deploy
- deployed as part of the company operating system
- scoped to the same Core auth, workspace, permission, and RLS boundaries

A plugin is not:

- runtime-loaded code
- a marketplace extension installed by a user from the UI
- a remote SaaS product masquerading as Core
- a browser-only script injection
- a package that bypasses source review
- a second app with its own identity/workspace model

## Future external plugin repositories

Future plugins may live in separate GitHub repositories.

That distribution model is allowed later because it keeps plugin code independently inspectable, forkable, versioned, and reusable across deployments.

However, a separate plugin repo does not mean runtime installation. A plugin becomes part of a WinningOS deployment only when its source is explicitly included in the deployment before build.

Allowed future inclusion methods may include:

```text
copy source into plugins/{plugin_id}
git subtree into plugins/{plugin_id}
git submodule into plugins/{plugin_id}
```

These are future options, not current implementation requirements.

Core must not auto-fetch plugin repositories.
Core must not install plugin repositories from the UI.
Core must not execute plugin code that has not been included and reviewed as part of the deployment source.

## Future plugin repo requirements

Every future plugin repository should include an `IMPLEMENTATION.md` file.

A future plugin repo should eventually contain something like:

```text
README.md
IMPLEMENTATION.md
plugin.manifest.ts
permissions.ts
components/
routes/
server/
db/migrations/
tests/
```

This is a future contract shape. Do not create these folders in Core yet.

### Required `IMPLEMENTATION.md` content

A plugin repo's `IMPLEMENTATION.md` should explain:

1. What the plugin does.
2. Which Core compatibility level it requires.
3. How to include the plugin source in a deployment.
4. Required environment variables.
5. Database migrations and RLS policies.
6. Permissions added by the plugin.
7. Routes or settings sections requested by the plugin.
8. Navigation entries requested by the plugin.
9. Server-only secrets and external integration boundaries.
10. Test/validation commands.
11. Removal instructions.
12. Known limitations.

The implementation guide must be explicit enough that a human or agent can integrate the plugin without guessing.

## Core owns forever

WinningOS Core owns these primitives:

- auth/session boundary
- single active workspace assumption for v0.1
- profile model
- membership model
- role model
- core permission model
- workspace settings
- branding/theme token model
- app shell and navigation rendering
- Supabase client/server conventions
- RLS expectations
- service-role usage restrictions
- plugin compatibility rules
- repo-wide contribution rules

Plugins may extend Core, but must not redefine these primitives.

## What plugins may eventually contribute

After Core is operational and tested, future plugins may be allowed to contribute:

- routes
- UI components
- navigation requests
- settings-section requests
- server actions or route handlers
- plugin-specific database tables
- plugin-specific migrations
- plugin-specific permissions
- plugin-specific audit event types
- background jobs, later
- external integrations, later

Every contribution must be declared, reviewable, and scoped by Core auth, workspace, permission, and RLS rules.

## What plugins must not do

Plugins must not:

- bypass Supabase Auth
- bypass active membership checks
- bypass Core permission checks
- bypass RLS
- expose service-role keys or provider secrets to browser code
- define a competing profile model
- define a competing member model
- define a competing workspace model
- introduce workspace switching into Core v0.1
- mutate Core tables directly without an approved Core API or documented migration
- replace the Core app shell
- replace Home, Members, or Settings
- add runtime plugin loading
- install themselves from the UI
- add business workflows into Core folders
- assume Agent/chat exists in Core
- add external provider configuration to Core settings

## Plugin identity

Every future plugin should have a stable plugin id.

Plugin ids should be:

- lowercase
- snake_case
- unique within a deployment
- stable once released

Examples:

```text
example_plugin
meeting_notes
agent
crm
```

Plugin ids should not use display names with spaces as technical identifiers.

## Permission naming convention

Core permissions use short Core namespaces:

```text
workspace.*
members.*
roles.*
branding.*
settings.*
plugins.*
```

Future plugin permissions should use this convention:

```text
plugin.{plugin_id}.{action}
```

Examples:

```text
plugin.meeting_notes.view
plugin.meeting_notes.create
plugin.meeting_notes.manage
plugin.agent.view
plugin.agent.configure
```

Reason:

- plugin permissions are visibly separate from Core permissions
- permission collisions are less likely
- future audits can distinguish Core capability from plugin capability

Rules:

- plugins must declare every permission they introduce
- plugin permission checks deny by default
- plugin permissions must map to Core roles through an approved registration path later
- plugin UI visibility is not security
- plugin server/data boundaries must enforce permissions too

## Database naming convention

Future plugin tables should use this convention:

```text
plugin_{plugin_id}_{table}
```

Examples:

```text
plugin_meeting_notes_notes
plugin_meeting_notes_sources
plugin_agent_threads
plugin_agent_messages
```

Rules:

- plugin tables must not use `core_` prefixes
- plugin tables must include `workspace_id` unless an exception is documented and approved
- plugin tables must enable RLS
- plugin tables must reference Core profiles/memberships where applicable rather than duplicating identity
- plugin migrations must be reviewable SQL or generated output checked into source
- plugin tables must not assume multiple Core workspaces in v0.1

## RLS expectations for plugins

Future plugin data must be protected by RLS.

Default expectation:

- active workspace members may read plugin data only when permitted
- plugin writes require plugin-specific permissions
- plugin admin actions require explicit elevated permissions
- non-members cannot read plugin data
- service-role usage is exceptional and documented

Plugins should reuse Core membership and permission helpers once those exist.

## Navigation contribution rules

Core owns the shell and final navigation rendering.

Future plugins may request navigation entries, but Core decides:

- whether the entry is shown
- where the entry is placed
- which permission gates it
- whether the entry belongs in primary nav, settings, or a plugin section

Plugins must not:

- replace the shell
- replace Home, Members, or Settings
- inject workspace switchers
- add global account/auth controls
- bypass permission-aware navigation rules

## Settings contribution rules

Core settings remain Core-owned.

Future plugins may request settings sections only through a documented registration path.

Plugin settings should be grouped under plugin-aware surfaces such as:

```text
Settings > Plugins > {Plugin Name}
```

or another explicitly approved placement.

Plugins must not add provider/API-key settings to Core workspace settings directly.

## Secret handling rules

Plugin secrets must be server-only.

Rules:

- no plugin secret may use a public/browser env prefix
- plugin API keys must not be exposed to client components
- plugin external calls that require secrets must happen server-side
- plugin secret storage must be documented before implementation
- plugin secret rotation/removal expectations must be documented when applicable

Agent/chat plugins are especially sensitive because provider credentials, tool execution, and conversation data can introduce extra risk. They must wait until Core is operational and compatibility rules are proven.

## Removal rules

A plugin should be removable without breaking Core.

Removal expectations:

- removing plugin source should not break Core routes
- Core should still build without the plugin
- plugin data deletion must require explicit migration or operator action
- plugin removal must not delete data silently
- plugin nav/settings entries should disappear when the plugin source is absent

Future plugin repos should document removal in `IMPLEMENTATION.md`.

## Versioning and compatibility changes

Compatibility rules should change slowly.

Breaking changes may include:

- changing plugin permission naming
- changing plugin table naming
- changing workspace assumptions
- changing navigation contribution APIs
- changing settings contribution APIs
- changing migration/RLS expectations

If a future change breaks `core-v0`, introduce a new compatibility level rather than silently changing the contract.

## Future validation checklist

A future plugin should not be accepted unless it passes a checklist like this:

- [ ] Plugin source is included at build time.
- [ ] Plugin declares a stable plugin id.
- [ ] Plugin includes `IMPLEMENTATION.md`.
- [ ] Plugin declares Core compatibility.
- [ ] Plugin declares all permissions.
- [ ] Plugin tables use `plugin_{plugin_id}_{table}` naming.
- [ ] Plugin tables are workspace-scoped or explicitly justified.
- [ ] Plugin tables have RLS.
- [ ] Plugin secrets are server-only.
- [ ] Plugin does not mutate Core tables without approved APIs/migrations.
- [ ] Plugin does not introduce workspace switching.
- [ ] Plugin does not replace the Core shell.
- [ ] Plugin can be removed without breaking Core.
- [ ] Plugin has tests or validation commands.

This checklist is future-facing. It should become executable only after Core is operational and the first reference plugin is intentionally scoped.

## Future validation examples

Agent/chat and meeting notes are useful future validation examples, but they are not current work.

### Future Agent plugin

A future Agent plugin would own:

- agent/chat UI
- provider configuration
- provider secret strategy
- model/provider adapters
- chat/thread tables
- tool execution boundaries
- agent-specific permissions
- agent-specific audit events

Core should not pre-build these.

### Future Meeting Notes plugin

A future Meeting Notes plugin would own:

- meeting records
- transcript references
- recorder/source integrations
- summaries
- meeting-specific permissions
- meeting-specific tables
- meeting-specific RLS

Core should not pre-build these.

## Example plugin timing

An `Example_Plugin` repository is a good future idea, but not yet.

Required order:

1. Finish and merge this compatibility contract.
2. Build WinningOS Core until it is operational.
3. Test Core thoroughly, including auth, data, permissions, RLS, and deployment setup.
4. Only then create an `Example_Plugin` repo to prove the contract.
5. Only after the example validates the contract should real plugins begin.

The example plugin should validate Core compatibility; it should not define Core compatibility.

## Current non-goals

Do not implement any of these now:

- plugin loader
- plugin registry
- plugin manifest parser
- plugin settings registry
- plugin nav registry
- plugin migration runner
- external plugin repo
- Example_Plugin repo
- Agent plugin
- meeting notes plugin
- runtime marketplace
- plugin install UI

## Core readiness gate before plugins

Before any plugin work begins, Core must be:

- operational with Supabase
- deployed successfully
- documented for local development
- backed by initial schema migrations
- protected by RLS
- wired to real auth
- using server-side permission helpers
- tested for role/permission behavior
- able to load and update Core settings from real data
- verified to build cleanly

Plugin work waits until this gate is met.
