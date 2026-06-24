# V0 Wireframe Prompt

Use this prompt in V0 to generate the first WinningOS Core frontend wireframe.

Before using this prompt, review `FRONTEND_BRIEF.md`, `CORE.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, and `SECURITY.md`.

---

Build a static frontend wireframe for WinningOS Core, a workspace-first framework for custom company operating systems.

This is a frontend wireframe only. Use mock data. Do not implement Supabase auth, database calls, migrations, server actions, API routes, plugin machinery, agent/chat UI, or provider configuration.

Product vocabulary:
- Use `workspace` as the root operating object.
- Use `profile` for the user-level identity.
- Use `member` for a profile inside a workspace.
- Use `role` for a named permission bundle.
- Use `permission` for explicit action strings.
- Use `plugin` for future build-time extensions outside Core v0.1.
- Do not use team/company/org/tenant as the canonical root noun.
- Do not use provider/agent/chat as Core product concepts.

Create a polished app wireframe with these screens:

1. Unauthenticated entry screen
- WinningOS wordmark/text logo
- short tagline
- sign-in placeholder card/button
- subtle note that auth is not wired in this wireframe
- no real OAuth or SSO behavior

2. Authenticated app shell
- primary navigation limited to Home, Members, and Settings
- topbar/header
- static workspace display only; no workspace switcher
- profile/account menu placeholder
- active nav state
- responsive layout concept

Navigation:
- Home
- Members
- Settings

Settings sections:
- Workspace
- Roles
- Branding

3. Home
- workspace overview
- setup checklist
- members summary
- branding status
- future plugin readiness placeholder, if present, restrained and non-primary
- no agent/provider status
- no chat preview

4. Members
- member list/table
- avatar/name/email placeholders
- role display
- status display: active, invited, disabled, removed
- invite member button placeholder
- search/filter concept

5. Settings
- workspace name/slug placeholders
- workspace metadata card
- roles section with system roles: Owner, Admin, Member, Viewer
- permission groups: Workspace, Members, Roles, Branding, Settings, Plugins
- branding section with token-based brand name/logo/color/radius placeholders
- no Agent section
- no Chat section
- no provider selector
- no single sign-on settings
- no destructive behavior implemented

6. Empty/restricted states
- no members invited yet
- insufficient permission
- future plugins not available yet

Design direction:
- serious company operating environment
- calm, clean, sturdy, premium but not flashy
- strong hierarchy
- good spacing and typography
- dark-mode capable
- admin OS feel, not generic SaaS marketing dashboard

Avoid:
- over-bright marketing gradients
- crypto/web3 aesthetic
- playful mascot UI
- fake business-specific analytics
- meeting notes, CRM, billing, docs, analytics, or other business modules
- runtime plugin marketplace assumptions
- AI chat product UI in Core
- agent/provider configuration in Core

Use mock data such as:
- Workspace: Acme Operations
- Roles: Owner, Admin, Member, Viewer
- Statuses: active, invited, disabled, removed
- Permissions: workspace.view, members.invite, branding.manage, plugins.view

Accessibility:
- semantic headings
- visible focus states
- accessible button labels
- readable contrast
- form labels
- keyboard-friendly layout assumptions

Output should be static UI code only. If the repository does not yet have an app scaffold, generate the UI in the simplest V0-compatible way and do not invent backend infrastructure.
