# WinningOS Core v0.1 — Manual Test Plan

Run top to bottom with four email accounts you control. Prereqs: latest `main`
deployed, `npx supabase db push` run, hosted auth config pushed. Expected
results assume default role grants (reset any experiments on Settings → Roles
first).

Accounts used below:

- **OWNER** — the first account (already exists)
- **ADMIN**, **MEMBER**, **VIEWER** — fresh addresses you will invite during the run

---

## 1. Owner

### 1.1 Auth
- [ ] Signed-out visit to `/home` redirects to `/sign-in`.
- [ ] Sign in with a wrong password → "Incorrect email or password" (no email sent).
- [ ] Sign in with the right password → lands on Home. No email involved.
- [ ] `/forgot-password` with your address → branded reset email → link lands on Set password → new password works, old one fails.
- [ ] Open an already-used reset link → distinct "Link expired" error.

### 1.2 Home
- [ ] Title is the workspace name; member counts are real; checklist reflects actual state.
- [ ] "Recent activity" card is visible (owner holds workspace.manage).

### 1.3 Settings → Workspace
- [ ] Name and slug render live values; edit name → save → notice "Workspace settings saved", Home title updates, `workspace.updated` appears in Recent activity.
- [ ] Slug with uppercase/spaces (e.g. `Bad Slug!`) → rejected with the validation notice, nothing saved.

### 1.4 Settings → Branding
- [ ] Set primary, secondary, and tertiary colors → save → **the app restyles**: buttons/focus take primary, subtle surfaces take secondary, hovers take tertiary. Works in light and dark mode. Sign out once to confirm the sign-in page is themed too.
- [ ] Upload a PNG or SVG logo (≤ 2 MB) → save → logo renders in the section AND replaces the brand mark in the sidebar, top bar, and (after sign-out) the sign-in page (#56).
- [ ] Pick a 3 MB or non-image file → inline message appears immediately and the file is cleared — no crash, nothing submitted (#57).
- [ ] Bad color (`#12345`, `red`) → validation notice, nothing saved.
- [ ] Each successful save adds one `branding.updated` audit entry; saving with no changes adds none.

### 1.5 Settings → Roles
- [ ] Grid shows live grants; owner column and the three structural rows (workspace.delete, members.remove, roles.manage) are locked. members.invite is editable and granted to Admin by default (#60).
- [ ] **Grant** something (e.g. `branding.manage` → Member) → "Role permission updated" (this was issue #49 — verify the *grant* direction specifically).
- [ ] **Revoke** the same grant → also succeeds. Both changes appear in Recent activity.

### 1.6 Members
- [ ] Invite ADMIN (role: Admin — only the owner sees this option), MEMBER (role: Member), VIEWER (role: Viewer) → each shows as **Invited**; three `member.invited` audit entries.
- [ ] Invite a nonsense address twice quickly → rate-limit message says the invite was NOT sent, list is not polluted.

---

## 2. Admin (complete the ADMIN invite, then test)

### 2.1 Invite acceptance
- [ ] Open the branded invite email → lands on **Set password** → choose password → lands in the app as an **active** Admin (owner sees status flip Invited → Active).

### 2.2 What an admin CAN do
- [ ] Members: invite a new person as **Member or Viewer** (#60) — the Admin option is absent from the role dropdown.
- [ ] Members: change MEMBER's role between Member ↔ Viewer (#58) — `roles.assign`.
- [ ] Members: disable VIEWER, then re-activate via role assignment — `members.disable`.
- [ ] Settings → Workspace: edit name/slug (workspace.manage) — succeeds.
- [ ] Settings → Branding: edit colors (branding.manage) — succeeds.
- [ ] Home: Recent activity card is visible (workspace.manage).

### 2.3 What an admin CANNOT do
- [ ] Members: cannot invite or promote anyone **as Admin** (#58/#60) — no Admin option in either dropdown, and role controls are absent on admin rows; no Remove buttons (`members.remove` stays owner-only).
- [ ] Settings → Roles: grid is **read-only** (no toggles).
- [ ] Cannot change or disable the OWNER row, and cannot change their own role.

---

## 3. Member (complete the MEMBER invite, then test)

- [ ] Invite email → set password → active Member.
- [ ] Home: overview and checklist visible; **no Recent activity card**.
- [ ] Members: list visible (members.view) but **no** role dropdowns, disable, remove, or invite controls.
- [ ] Settings: Workspace and Branding render **read-only** (fields disabled, no Save); Roles grid read-only.
- [ ] While signed in as Member, have the OWNER grant `branding.manage` to Member on Settings → Roles → Member refreshes `/settings` → Branding becomes editable and a save succeeds. Revoke it → editing disabled again and a direct save attempt fails safely. (Proves live grants drive both UI and server.)

---

## 4. Viewer (complete the VIEWER invite, then test)

- [ ] Invite email → set password → active Viewer.
- [ ] Home: renders (workspace.view); member count may show active members only; no activity card.
- [ ] Members: viewer holds no members.view — the page must not expose management controls, and any direct action fails safely.
- [ ] Settings: everything read-only; no save buttons anywhere.
- [ ] Branding view: viewer can *see* branding (branding.view) but cannot edit.

---

## 5. Lifecycle edge cases (as Owner)

- [ ] Disable ADMIN (confirm dialog appears — #61) → they get pending/blocked on next navigation; re-activate via role assignment → access returns.
- [ ] Remove VIEWER's membership (confirm dialog appears — #61) → they disappear from the Members list entirely (issue #43); their next sign-in lands on Pending access.
- [ ] Re-invite the removed VIEWER → they receive a **set-password email** (#62) that lands on Set password, and they re-enter as an active member; audit shows the sequence.
- [ ] Sign up a brand-new 5th account via `/sign-up` (not invited) → confirmation email → lands on **Pending access**, sees no workspace data; owner sees them as Pending access and can activate with a role.
- [ ] Sign-out works from the app shell menu and returns to sign-in.

## 6. Cross-cutting

- [ ] Every failure above produced a specific, human-readable notice — no raw errors, no Supabase branding anywhere in UI or emails (#19, #26).
- [ ] Recent activity now contains at least: workspace.updated, branding.updated, member.invited ×3+, member.role_changed, member.disabled, member.removed, role_permission.changed.
- [ ] Vercel logs show no unexpected 500s during the run.
