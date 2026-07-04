import "server-only"

import { ensureCoreSession } from "@/core/auth/bootstrap"
import { createClient } from "@/core/supabase/server"
import { CORE_ROLE_KEYS, type CoreRoleKey } from "@/core/permissions/catalog"
import { getRoleGrantMap } from "@/core/permissions/grants"

export type CoreMemberStatus = "active" | "invited" | "disabled" | "pending_access"
export type CoreMemberRoleKey = "owner" | "admin" | "member" | "viewer"

export type CoreMember = {
  profileId: string
  membershipId: string | null
  userId: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  roleKey: CoreMemberRoleKey | null
  roleName: string | null
  status: CoreMemberStatus
  joinedAt: string | null
  profileCreatedAt: string
  canManage: boolean
}

type CoreMemberRow = {
  profile_id: string
  membership_id: string | null
  user_id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role_key: CoreMemberRoleKey | null
  role_name: string | null
  status: CoreMemberStatus
  joined_at: string | null
  profile_created_at: string
  can_manage: boolean
}

function normalizeMember(row: CoreMemberRow): CoreMember {
  return {
    profileId: row.profile_id,
    membershipId: row.membership_id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name?.trim() || row.email?.split("@")[0] || "Core user",
    avatarUrl: row.avatar_url,
    roleKey: row.role_key,
    roleName: row.role_name,
    status: row.status,
    joinedAt: row.joined_at,
    profileCreatedAt: row.profile_created_at,
    canManage: row.can_manage === true,
  }
}

export async function getCoreMembers(): Promise<{
  members: CoreMember[]
  canManageMembers: boolean
  canAssignRoles: boolean
  canAssignAdmins: boolean
  canInviteMembers: boolean
  canRemoveMembers: boolean
}> {
  const session = await ensureCoreSession()

  if (!session.hasActiveMembership) {
    return { members: [], canManageMembers: false, canAssignRoles: false, canAssignAdmins: false, canInviteMembers: false, canRemoveMembers: false }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("core_list_workspace_members")

  if (error) {
    console.error("Failed to list Core members", {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw new Error("Member list failed")
  }

  const rows = (data ?? []) as CoreMemberRow[]
  const members = rows.map(normalizeMember)

  // Permission-driven gating from the live grant map (core_role_permissions),
  // so the buttons we render match what the RPCs will actually allow after an
  // owner edits a role. disable, invite, and role-assignment are admin-tier
  // and independently editable; remove stays owner-only and locked.
  // disable/remove/role-assignment are re-enforced server-side by their RPCs;
  // invite's grant is DB-driven but the admin-tier restriction (no admin
  // invites by non-owners) is app-layer-enforced only (see inviteAuthUser).
  const { grants } = await getRoleGrantMap()
  const roleKey = session.membership?.roleKey ?? null
  const roleGrants = CORE_ROLE_KEYS.includes(roleKey as CoreRoleKey)
    ? grants[roleKey as CoreRoleKey]
    : new Set<string>()

  return {
    members,
    canManageMembers: roleGrants.has("members.disable"),
    canAssignRoles: roleGrants.has("roles.assign"),
    // The admin tier itself is owner territory (#58/#60): only owners assign
    // the admin role, change existing admins, or invite at the admin tier.
    // This is a structural role rule, not an editable grant; the RPC and the
    // invite action re-enforce it server-side.
    canAssignAdmins: roleKey === "owner",
    canInviteMembers: roleGrants.has("members.invite"),
    canRemoveMembers: roleGrants.has("members.remove"),
  }
}
