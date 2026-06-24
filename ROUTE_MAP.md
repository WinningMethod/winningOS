# WinningOS Core Route Map

## Purpose

This document maps the current Core wireframe surfaces to future authentication, data, and permission boundaries.

The route map prevents backend work from drifting away from the product surface and prevents UI routes from implying permissions that do not exist.

## Routing principles

- Routes should reflect the single-workspace Core scope.
- Routes should not accept arbitrary workspace IDs in URLs for Core v0.1.
- The active workspace is the instance workspace, not a user-selected tenant.
- UI visibility is not security; server/data boundaries must enforce access.
- Settings can contain sections/tabs without becoming separate backend concepts prematurely.
- Agent/chat routes are plugin territory and should not exist in Core v0.1.

## Current route inventory

```text
/
/home
/members
/settings
```

The app also has shared authenticated layout code under `app/(app)/layout.tsx`.

## Public routes

### `/`

Purpose:

- public entry/sign-in placeholder
- explain WinningOS Core
- route users into the demo/app shell during wireframe phase

Current state:

- static wireframe
- no real Supabase Auth
- no real SSO

Future behavior:

- unauthenticated users land here or on a dedicated sign-in route
- authenticated users may redirect to `/home`

Permissions:

```text
none
```

Data:

```text
none, until auth is wired
```

## Authenticated app routes

### `/home`

Purpose:

- workspace home
- orientation and setup status
- calm landing page for the single workspace

Required auth:

```text
authenticated user
active membership
```

Minimum permission:

```text
workspace.view
```

Future data:

```text
core_workspaces
core_memberships summary
core_brand_settings status
plugin readiness status, later
```

Notes:

- Should not show business workflow analytics.
- Should not imply multiple workspaces.
- Should not show agent/provider status in Core.

### `/members`

Purpose:

- view workspace members
- show role/status information
- placeholder invite/manage controls

Required auth:

```text
authenticated user
active membership
```

Minimum permission:

```text
members.view
```

Future action permissions:

```text
members.invite
members.remove
roles.assign
```

Future data:

```text
core_profiles
core_memberships
core_roles
```

Notes:

- Invited/disabled/removed statuses are part of membership state.
- Management controls should be disabled/hidden for users without permission, but server actions must enforce permissions too.

### `/settings`

Purpose:

- single Core settings surface
- contains workspace, roles, and branding sections
- avoids expanding primary nav too early

Required auth:

```text
authenticated user
active membership
```

Minimum permission:

```text
settings.view
```

Sections:

```text
Workspace
Roles
Branding
```

Core settings must not include:

```text
Agent
Chat
Provider configuration
Single sign-on
Plugin installation UI
```

## Settings sections

### Workspace section

Purpose:

- display/update workspace metadata
- reinforce single-workspace Core model

Minimum view permission:

```text
workspace.view
```

Future write permission:

```text
workspace.manage
```

Future data:

```text
core_workspaces
```

Must not include:

- workspace switcher
- workspace creation
- workspace deletion in v0.1 unless explicitly scoped
- SSO settings until auth provider strategy is defined

### Roles section

Purpose:

- show system roles and permission posture
- make permissions understandable without building a full role editor

Minimum view permission:

```text
roles.view
```

Future action permissions:

```text
roles.assign
roles.manage
```

Future data:

```text
core_roles
permission constants
```

Notes:

- Custom role editing is deferred.
- Full permission tables are deferred.
- Role assignment may be needed before role customization.
- Agent/chat/provider permissions do not belong in Core.

### Branding section

Purpose:

- manage workspace brand identity and theme tokens

Minimum view permission:

```text
branding.view
```

Future write permission:

```text
branding.manage
```

Future data:

```text
core_brand_settings
```

Notes:

- `theme_json` may store values early.
- Components should consume typed theme tokens/helpers.

## Deferred routes

Do not add these in Core v0.1 unless explicitly scoped:

```text
/workspaces
/workspaces/[id]
/modules
/plugins
/agent
/chat
/providers
/admin/billing
/meeting-notes
/crm
/projects
/documents
/analytics
```

Future plugin routes should live behind a compatibility contract, not by ad hoc route additions.

## Permission summary

```text
/                         public
/home                     workspace.view
/members                  members.view
/settings                 settings.view
/settings:workspace       workspace.view / workspace.manage
/settings:roles           roles.view / roles.assign / roles.manage
/settings:branding        branding.view / branding.manage
```

If settings sections are implemented as tabs inside `/settings`, the same logical permissions still apply.

## Data loading direction

Initial implementation should prefer server-side loading for protected app routes.

Suggested direction:

```text
server route/page boundary
  get current user session
  resolve core profile
  resolve active membership in the single workspace
  check permission where needed
  load route data
  render client components with safe props
```

Client components may render interactive UI, but should not own privileged decisions.

## Redirect and error states

Expected states:

```text
unauthenticated -> public entry/sign-in
authenticated without profile -> bootstrap/profile creation path
authenticated without active membership -> setup/access-needed state
authenticated without permission -> restricted state
missing core workspace -> setup/bootstrap error
```

These states should be explicit before auth implementation begins.

## Missing pieces identified

The current wireframe gives us route shape, but implementation still needs:

- exact auth redirect behavior
- bootstrap behavior for first workspace/owner
- permission helper API
- RLS policy tests or verification method
- settings write flow design
- plugin compatibility contract before any plugin routes are added
