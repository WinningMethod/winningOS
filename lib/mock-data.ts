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

export const roles: { name: RoleName; description: string; system: boolean; memberCount: number }[] = [
  { name: "Owner", description: "Full control of the workspace, including billing and deletion.", system: true, memberCount: 1 },
  { name: "Admin", description: "Manage members, roles, branding, and workspace settings.", system: true, memberCount: 1 },
  { name: "Member", description: "Operate inside the workspace with standard access.", system: true, memberCount: 3 },
  { name: "Viewer", description: "Read-only access to permitted areas.", system: true, memberCount: 2 },
]

export type PermissionGroup = {
  group: string
  description: string
  permissions: {
    key: string
    label: string
    grants: Record<RoleName, boolean>
  }[]
}

const all: Record<RoleName, boolean> = { Owner: true, Admin: true, Member: true, Viewer: true }
const adminUp: Record<RoleName, boolean> = { Owner: true, Admin: true, Member: false, Viewer: false }
const ownerOnly: Record<RoleName, boolean> = { Owner: true, Admin: false, Member: false, Viewer: false }
const memberUp: Record<RoleName, boolean> = { Owner: true, Admin: true, Member: true, Viewer: false }

export const permissionGroups: PermissionGroup[] = [
  {
    group: "Workspace",
    description: "Visibility and high-level workspace control.",
    permissions: [
      { key: "workspace.view", label: "View workspace", grants: all },
      { key: "workspace.manage", label: "Manage workspace metadata", grants: adminUp },
      { key: "workspace.delete", label: "Delete workspace", grants: ownerOnly },
    ],
  },
  {
    group: "Members",
    description: "Membership lifecycle inside the workspace.",
    permissions: [
      { key: "members.view", label: "View members", grants: memberUp },
      { key: "members.invite", label: "Invite members", grants: adminUp },
      { key: "members.remove", label: "Remove members", grants: adminUp },
    ],
  },
  {
    group: "Roles",
    description: "Role assignment and permission bundles.",
    permissions: [
      { key: "roles.view", label: "View roles", grants: memberUp },
      { key: "roles.assign", label: "Assign roles", grants: adminUp },
      { key: "roles.manage", label: "Manage custom roles", grants: ownerOnly },
    ],
  },
  {
    group: "Branding",
    description: "Theme tokens and workspace identity.",
    permissions: [
      { key: "branding.view", label: "View branding", grants: all },
      { key: "branding.manage", label: "Manage branding tokens", grants: adminUp },
    ],
  },
  {
    group: "Settings",
    description: "Workspace configuration and security.",
    permissions: [
      { key: "settings.view", label: "View settings", grants: memberUp },
      { key: "settings.manage", label: "Manage settings", grants: adminUp },
    ],
  },
  {
    group: "Plugins",
    description: "Future build-time plugins. Not available in Core v0.1.",
    permissions: [
      { key: "plugins.view", label: "View plugins", grants: memberUp },
      { key: "plugins.manage", label: "Manage plugins", grants: adminUp },
    ],
  },
]

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
