# Frontend Wireframe Acceptance Checklist

Use this checklist when reviewing V0-generated frontend wireframe work.

## Scope

- [ ] Wireframe uses mock data only.
- [ ] No Supabase auth implementation was added.
- [ ] No database calls were added.
- [ ] No migrations were added.
- [ ] No API routes/server actions were added for real backend behavior.
- [ ] No plugin system or plugin loader was added.
- [ ] No agent/chat/provider UI was added to Core.
- [ ] No business-specific workflow modules were added.
- [ ] No workspace switcher, workspace creation UI, or multi-workspace management exists.

## Vocabulary

- [ ] `workspace` is the root operating noun.
- [ ] `profile`, `member`, `role`, `permission`, and `plugin` are used consistently.
- [ ] `provider`, `agent`, and `chat` are not presented as Core product concepts.
- [ ] `team`, `company`, `organization`, and `tenant` are not used as competing root nouns.

## Required screens

- [ ] Unauthenticated entry screen exists.
- [ ] Authenticated app shell exists.
- [ ] Home page exists.
- [ ] Members page exists.
- [ ] Settings page exists.
- [ ] Settings includes Workspace, Roles, and Branding sections only.
- [ ] Empty/restricted states exist.

## App shell

- [ ] Primary navigation is limited to Home, Members, and Settings.
- [ ] Topbar/header exists.
- [ ] Static workspace display exists.
- [ ] No workspace switcher exists.
- [ ] Profile/account menu placeholder exists.
- [ ] Active navigation state is visible.
- [ ] Responsive behavior is considered.

## Permissions

- [ ] System roles are shown: Owner, Admin, Member, Viewer.
- [ ] Permission groups are explicit.
- [ ] Permission groups do not include Agent/Chat/Provider namespaces.
- [ ] Permissions feel understandable and boring.
- [ ] UI does not imply that hiding buttons is the only security layer.
- [ ] Deep role customization is framed as later, not fully implemented now.

## Branding

- [ ] Branding is token-oriented.
- [ ] UI includes brand name, logo, color, radius/style, and preview concepts.
- [ ] UI does not expose `theme_json` as the user-facing model.

## Plugins

- [ ] Plugin readiness may be referenced as future-facing only.
- [ ] No plugin installation UI is implemented.
- [ ] No plugin route, manifest, loader, or runtime marketplace concept is introduced.
- [ ] Agent/chat is treated as future plugin territory, not Core.

## Visual quality

- [ ] Feels like a serious company operating environment.
- [ ] Calm, clean, sturdy, and premium without being flashy.
- [ ] Not a generic marketing SaaS dashboard.
- [ ] No fake business analytics that imply non-core workflows.
- [ ] No AI chat product UI in Core.
- [ ] Good spacing and hierarchy.
- [ ] Dark-mode capable or visually compatible with future dark mode.

## Accessibility

- [ ] Semantic headings are used.
- [ ] Buttons and controls have accessible labels.
- [ ] Inputs have labels.
- [ ] Contrast is readable.
- [ ] Focus states are visible or supported by the component system.

## Repo fit

- [ ] Generated structure does not fight the documented architecture.
- [ ] Any new dependencies are justified and minimal.
- [ ] If an app scaffold is introduced, it is intentionally reviewed rather than accepted blindly.
- [ ] The wireframe can be reconciled against `CORE.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, and `SECURITY.md`.
