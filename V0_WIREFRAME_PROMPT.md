# V0 Wireframe Prompt

Use this prompt in V0 to generate the first WinningOS Core frontend wireframe.

Before using this prompt, review `FRONTEND_BRIEF.md`, `CORE.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, and `SECURITY.md`.

---

Build a static frontend wireframe for WinningOS Core, a workspace-first framework for custom company operating systems.

This is a frontend wireframe only. Use mock data. Do not implement Supabase auth, database calls, migrations, server actions, API routes, or plugin machinery.

Product vocabulary:
- Use `workspace` as the root operating object.
- Use `profile` for the user-level identity.
- Use `member` for a profile inside a workspace.
- Use `role` for a named permission bundle.
- Use `permission` for explicit action strings.
- Use `provider` for an agent/chat backend adapter.
- Do not use team/company/org/tenant as the canonical root noun.

Create a polished app wireframe with these screens:

1. Unauthenticated entry screen
- WinningOS wordmark/text logo
- short tagline
- sign-in placeholder card/button
- subtle note that auth is not wired in this wireframe

2. Authenticated app shell
- sidebar or primary navigation
- topbar/header
- workspace switcher or workspace display
- profile/account menu placeholder
- active nav state
- responsive layout concept

Navigation:
- Dashboard
- Members
- Roles & Permissions
- Branding
- Agent
- Settings
- Optional disabled/future item: Modules

3. Dashboard
- workspace overview
- setup checklist
- recent admin activity placeholder
- members summary
- branding status
- agent provider status
- future modules placeholder

4. Members
- member list/table
- avatar/name/email placeholders
- role display
- status display: active, invited, disabled, removed
- invite member button placeholder
- search/filter concept

5. Roles & Permissions
- system roles: Owner, Admin, Member, Viewer
- permission groups: Workspace, Members, Roles, Branding, Settings, Agent, Modules
- clear read-only or coming-later framing for deep customization
- make permissions explicit and boring, not magical

6. Branding
- brand name field placeholder
- logo placeholder/upload mock
- color token controls mock
- radius/style token controls mock
- light/dark preview area
- save button placeholder
- present branding as token-based

7. Agent
- provider-neutral agent/chat settings and preview page
- current provider status card
- provider configuration placeholder
- chat preview panel
- example provider names can include Hermes, OpenAI, Anthropic, Local, Custom
- do not hardcode Hermes as the only provider
- do not implement real API calls

8. Settings
- workspace name/slug placeholders
- workspace metadata card
- restrained danger-zone placeholder
- security/settings sections
- no destructive behavior implemented

9. Empty/restricted states
- no members invited yet
- provider not configured
- insufficient permission
- future modules not available yet

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

Use mock data such as:
- Workspace: Acme Operations
- Roles: Owner, Admin, Member, Viewer
- Statuses: active, invited, disabled, removed
- Permissions: workspace.view, members.invite, branding.manage, agent.configure

Accessibility:
- semantic headings
- visible focus states
- accessible button labels
- readable contrast
- form labels
- keyboard-friendly layout assumptions

Output should be static UI code only. If the repository does not yet have an app scaffold, generate the UI in the simplest V0-compatible way and do not invent backend infrastructure.
