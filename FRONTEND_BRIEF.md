# WinningOS Core Frontend Wireframe Brief

## Purpose

This brief defines the accepted scope for the first WinningOS Core frontend wireframe.

The wireframe should help evaluate the product surface, navigation model, workspace vocabulary, user management, and base settings experience before backend implementation begins.

This is not a backend implementation brief.

## Goal

Build a static, high-quality frontend wireframe for WinningOS Core.

The output should communicate what the company operating system feels like at the Core level:

- workspace-first
- calm and operational
- focused on base system administration
- agent-agnostic as a repo/development principle
- ready for future build-time plugins
- not tied to any one business workflow
- not shipping agent/chat functionality in Core

## Scope

The wireframe should cover the Core application shell and foundational Core pages only.

It should not implement real authentication, Supabase calls, migrations, plugin machinery, agent/chat UI, provider configuration, or business-specific workflows.

## Canonical vocabulary

Use these terms consistently:

- `workspace`: the root operating object
- `profile`: the user-level WinningOS identity connected to auth
- `member`: a profile inside a workspace
- `role`: a named permission bundle
- `permission`: an explicit action string
- `plugin`: a future build-time extension outside Core v0.1

Do not use `team`, `company`, `organization`, or `tenant` as the root product noun unless the UI is explaining them as plain-language descriptors. The canonical root noun is `workspace`.

Do not use `provider` as a Core product concept in the wireframe. Provider configuration belongs to future plugins.

## Required screens

### 1. Auth shell placeholder

Create a simple unauthenticated entry screen.

Purpose:

- show the product name
- communicate that sign-in will be Supabase-backed later
- provide a visual entry point without implementing auth

Must include:

- WinningOS wordmark or text logo
- short tagline
- sign-in card or button placeholder
- note or subtle text that auth is not wired in this wireframe

Must not include:

- real OAuth providers
- single sign-on settings
- real form validation
- real Supabase code

### 2. Authenticated app shell

Create the main authenticated layout.

Must include:

- primary navigation limited to Home, Members, and Settings
- topbar/header area
- static workspace display only; no workspace switcher
- profile/account menu placeholder
- settings access
- clear active nav state
- responsive behavior concept

Navigation should include only:

- Home
- Members
- Settings

Settings may contain sections for:

- Workspace
- Roles
- Branding

Do not add primary nav items or settings sections for Agent, Chat, Providers, Modules, meeting notes, CRM, billing, docs, analytics, or other business-specific workflows.

### 3. Core home

Create a neutral Core home page.

Purpose:

- orient the workspace owner/admin
- show system readiness/status
- avoid business-specific content

Suggested sections:

- workspace overview
- setup checklist
- members summary
- branding status
- plugin readiness placeholder, if present, restrained and non-primary

Must not include:

- agent provider status
- chat preview
- fake business analytics

Use mock data only.

### 4. Members page

Create a workspace members management wireframe.

Must include:

- members table/list
- member name/avatar/email placeholder
- role display
- status display: active, invited, disabled, removed
- invite member button placeholder
- search/filter concept

Important:

- Do not implement invite flow.
- Do not invent backend behavior.
- Keep the UI permission-aware conceptually, but static.

### 5. Settings page

Create general workspace settings with focused sections.

Must include:

- Workspace section
- Roles section
- Branding section

Do not include:

- Agent section
- Chat section
- Provider selector
- SSO settings
- destructive workspace deletion behavior

### 6. Roles section

Create a roles and permissions management concept inside Settings.

Must include:

- system roles: Owner, Admin, Member, Viewer
- permission groups:
  - Workspace
  - Members
  - Roles
  - Branding
  - Settings
  - Plugins
- read-only/coming-later framing for deep customization

The wireframe should make permissions feel explicit and boring.

Do not build a complex custom role editor yet.

### 7. Branding section

Create a workspace branding settings section inside Settings.

Must include:

- brand name field placeholder
- logo placeholder/upload area mock
- color token controls mock
- radius/style token controls mock
- light/dark preview area
- save button placeholder

Important:

- Present branding as token-based.
- Do not spread one-off styling concepts.
- Treat `theme_json` as a storage carrier, not a UI concept.

### 8. Empty and restricted states

Create reusable empty/restricted-state patterns.

Examples:

- no members invited yet
- insufficient permission
- future plugins not available yet

These can be components or examples inside relevant pages.

## Visual direction

WinningOS should feel like a serious company operating environment, not a generic startup SaaS dashboard.

Suggested qualities:

- calm
- clean
- sturdy
- premium but not flashy
- information-dense when useful
- strong hierarchy
- subtle motion only if V0 adds it naturally
- dark-mode capable
- excellent spacing and typography

Avoid:

- over-bright marketing gradients
- crypto/web3 aesthetic
- playful mascot UI
- excessive animations
- fake analytics charts that imply business workflows
- generic SaaS clutter
- AI chat product UI in Core

## Data rules

Use mock data only.

Do not call Supabase.
Do not create migrations.
Do not create server actions.
Do not add API routes.
Do not require environment variables.

Mock data should use the canonical vocabulary:

```text
Workspace: Acme Operations
Roles: Owner, Admin, Member, Viewer
Statuses: active, invited, disabled, removed
Permissions: workspace.view, members.invite, branding.manage, plugins.view
```

## Implementation boundaries for V0 output

The generated frontend may include:

- React components
- static mock data
- page-level routes if app scaffold already exists
- Tailwind/shadcn-style UI components if compatible with chosen scaffold
- placeholder buttons and forms

The generated frontend must not include:

- real Supabase auth
- real database queries
- migrations
- plugin loading
- agent/chat UI
- provider configuration
- business-specific modules
- hidden tool-specific assumptions
- required Hermes-only integration

## Accessibility expectations

The wireframe should use:

- semantic headings
- visible focus states
- accessible button labels
- readable contrast
- form labels for inputs, even if static
- keyboard-friendly layout assumptions

## Review checklist

The Core wireframe is acceptable when:

- it consistently uses `workspace` as the root noun
- primary navigation is limited to Home, Members, and Settings
- Settings contains only Core sections: Workspace, Roles, Branding
- it uses mock data only
- it does not introduce backend implementation
- it does not add plugin machinery
- it does not add agent/chat/provider UI
- it makes permissions explicit and understandable
- it feels like a custom company OS foundation, not a generic SaaS template

## Relationship to backend work

This wireframe should inform backend implementation, but it should not define backend truth by itself.

After the wireframe is reviewed, backend/schema work should be reconciled against:

- `CORE.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `SECURITY.md`
- the approved wireframe

If the wireframe suggests a new backend concept, document and review that concept before implementing it.
