# Frontend Wireframe Acceptance Checklist

Use this checklist when reviewing V0-generated frontend wireframe work.

## Scope

- [ ] Wireframe uses mock data only.
- [ ] No Supabase auth implementation was added.
- [ ] No database calls were added.
- [ ] No migrations were added.
- [ ] No API routes/server actions were added for real backend behavior.
- [ ] No plugin system or plugin loader was added.
- [ ] No business-specific workflow modules were added.

## Vocabulary

- [ ] `workspace` is the root operating noun.
- [ ] `profile`, `member`, `role`, `permission`, and `provider` are used consistently.
- [ ] `team`, `company`, `organization`, and `tenant` are not used as competing root nouns.

## Required screens

- [ ] Unauthenticated entry screen exists.
- [ ] Authenticated app shell exists.
- [ ] Dashboard exists.
- [ ] Members page exists.
- [ ] Roles & Permissions page exists.
- [ ] Branding page exists.
- [ ] Agent page exists.
- [ ] Settings page exists.
- [ ] Empty/restricted states exist.

## App shell

- [ ] Sidebar or primary navigation is clear.
- [ ] Topbar/header exists.
- [ ] Workspace switcher/display exists.
- [ ] Profile/account menu placeholder exists.
- [ ] Active navigation state is visible.
- [ ] Responsive behavior is considered.

## Permissions

- [ ] System roles are shown: Owner, Admin, Member, Viewer.
- [ ] Permission groups are explicit.
- [ ] Permissions feel understandable and boring.
- [ ] UI does not imply that hiding buttons is the only security layer.
- [ ] Deep role customization is framed as later, not fully implemented now.

## Branding

- [ ] Branding is token-oriented.
- [ ] UI includes brand name, logo, color, radius/style, and preview concepts.
- [ ] UI does not expose `theme_json` as the user-facing model.

## Agent/provider

- [ ] Agent UI is provider-neutral.
- [ ] Hermes is not hardcoded as the only provider.
- [ ] Chat preview is static/mock only.
- [ ] Provider configuration is placeholder only.

## Visual quality

- [ ] Feels like a serious company operating environment.
- [ ] Calm, clean, sturdy, and premium without being flashy.
- [ ] Not a generic marketing SaaS dashboard.
- [ ] No fake business analytics that imply non-core workflows.
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
