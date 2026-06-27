import "server-only"

import { ensureCoreSession } from "@/core/auth/bootstrap"
import { createClient } from "@/core/supabase/server"

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

export async function getCoreMembers(): Promise<{ members: CoreMember[]; canManageMembers: boolean }> {
  const session = await ensureCoreSession()

  if (!session.hasActiveMembership) {
    return { members: [], canManageMembers: false }
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
  return {
    members,
    canManageMembers: members.some((member) => member.canManage),
  }
}
