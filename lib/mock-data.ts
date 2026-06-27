// Static mock data for the WinningOS Core wireframe.
// No backend, no Supabase, no network calls. Vocabulary is canonical:
// workspace / profile / member / role / permission / plugin.

export type MemberStatus = "active" | "invited" | "disabled" | "removed"
export type RoleName = "Owner" | "Admin" | "Member" | "Viewer"

export type Workspace = {
  id: string
  name: string
  slug: string
  plan: string
  createdOn: string
}

export type Member = {
  id: string
  name: string
  email: string
  role: RoleName
  status: MemberStatus
  joinedOn: string
}

export type ActivityEntry = {
  id: string
  actor: string
  action: string
  target: string
  at: string
}

export const currentWorkspace: Workspace = {
  id: "ws_acme",
  name: "Acme Operations",
  slug: "acme-operations",
  plan: "Core",
  createdOn: "Jan 2026",
}

export const currentProfile = {
  name: "Dana Whitfield",
  email: "dana@acme.example",
  role: "Owner" as RoleName,
}

export const members: Member[] = [
  { id: "m_1", name: "Dana Whitfield", email: "dana@acme.example", role: "Owner", status: "active", joinedOn: "Jan 12, 2026" },
  { id: "m_2", name: "Marcus Lindqvist", email: "marcus@acme.example", role: "Admin", status: "active", joinedOn: "Jan 14, 2026" },
  { id: "m_3", name: "Priya Nair", email: "priya@acme.example", role: "Member", status: "active", joinedOn: "Feb 02, 2026" },
  { id: "m_4", name: "Tomás Herrera", email: "tomas@acme.example", role: "Member", status: "invited", joinedOn: "Pending" },
  { id: "m_5", name: "Wen Li", email: "wen@acme.example", role: "Viewer", status: "invited", joinedOn: "Pending" },
  { id: "m_6", name: "Sofia Castellano", email: "sofia@acme.example", role: "Member", status: "disabled", joinedOn: "Dec 18, 2025" },
  { id: "m_7", name: "Owen Brandt", email: "owen@acme.example", role: "Viewer", status: "removed", joinedOn: "Nov 04, 2025" },
]

export const statusMeta: Record<MemberStatus, { label: string; tone: "success" | "warning" | "muted" | "danger" }> = {
  active: { label: "Active", tone: "success" },
  invited: { label: "Invited", tone: "warning" },
  disabled: { label: "Disabled", tone: "muted" },
  removed: { label: "Removed", tone: "danger" },
}

// Roles and permissions are no longer mocked here. The real, server-backed
// permission catalog lives in core/permissions/catalog.ts and is surfaced in
// Settings → Roles via core/permissions/data.ts.

export const activity: ActivityEntry[] = [
  { id: "a_1", actor: "Dana Whitfield", action: "updated", target: "branding tokens", at: "2h ago" },
  { id: "a_2", actor: "Marcus Lindqvist", action: "invited", target: "wen@acme.example", at: "5h ago" },
  { id: "a_3", actor: "Dana Whitfield", action: "assigned role", target: "Admin to Marcus", at: "Yesterday" },
  { id: "a_4", actor: "System", action: "created", target: "workspace Acme Operations", at: "Jan 12, 2026" },
]

export const setupChecklist = [
  { id: "c_1", label: "Create workspace", done: true },
  { id: "c_2", label: "Set workspace name and slug", done: true },
  { id: "c_3", label: "Configure branding tokens", done: true },
  { id: "c_4", label: "Invite members", done: false },
  { id: "c_5", label: "Review plugin readiness", done: false },
]


export const brandTokens = {
  name: "Acme Operations",
  colors: [
    { token: "--primary", label: "Primary", value: "#3a5bd9" },
    { token: "--background", label: "Background", value: "#fafafa" },
    { token: "--foreground", label: "Foreground", value: "#22252c" },
    { token: "--accent", label: "Accent", value: "#eef1f8" },
  ],
  radius: "0.5rem",
  density: "Comfortable",
}
