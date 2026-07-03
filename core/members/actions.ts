"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { resolveAppOriginFromHeaders } from "@/core/auth/origin"
import { getCoreAuthBrand } from "@/core/auth/brand"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { logCoreAuditEvent } from "@/core/audit/log"
import { createClient } from "@/core/supabase/server"
import { createServiceRoleClient } from "@/core/supabase/service-role"
import { type PermissionKey } from "@/core/permissions/catalog"
import { roleHasLivePermission } from "@/core/permissions/grants"

const ASSIGNABLE_ROLE_KEYS = ["admin", "member", "viewer"] as const
type AssignableRoleKey = typeof ASSIGNABLE_ROLE_KEYS[number]

type AuthUserSummary = {
  id: string
  email?: string | null
}

type InviteDelivery = "sent" | "existing"

type InviteAuthResult = {
  user: AuthUserSummary
  delivery: InviteDelivery
}

type InviteFailureBucket = "rate-limited" | "provider" | "unknown"

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key)

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${key}`)
  }

  return value.trim()
}

function readOptionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key)

  if (typeof value !== "string" || !value.trim()) {
    return null
  }

  return value.trim()
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isAssignableRoleKey(value: string): value is AssignableRoleKey {
  return ASSIGNABLE_ROLE_KEYS.includes(value as AssignableRoleKey)
}

// Single source of truth for member-action authorization: the current member's
// role, checked against the live grant map (core_role_permissions) so it honors
// owner edits made in Settings → Roles. The Supabase RPCs re-enforce these
// boundaries server-side (defense in depth); this gate fails fast and keeps the
// app layer consistent with Settings → Roles.
//
// Returns false (deny) rather than throwing when session bootstrap fails — a
// transient Supabase error should produce a ?status=failed redirect, not a 500.
async function currentMemberHasPermission(permission: PermissionKey): Promise<boolean> {
  try {
    const session = await ensureCoreSession()
    return await roleHasLivePermission(session.membership?.roleKey, permission)
  } catch (error) {
    console.error("currentMemberHasPermission: session bootstrap failed", error instanceof Error ? error.message : "unknown")
    return false
  }
}

async function findAuthUserByEmail(email: string): Promise<AuthUserSummary | null> {
  const admin = createServiceRoleClient()
  let page = 1

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })

    if (error) {
      throw error
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email)

    if (user) {
      return { id: user.id, email: user.email }
    }

    if (data.users.length < 100) {
      return null
    }

    page += 1
  }

  return null
}

function classifyInviteFailure(error: unknown): InviteFailureBucket {
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: number }).status)
    : undefined
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: string }).code ?? "").toLowerCase()
    : ""
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase()

  if (status === 429 || code.includes("rate") || message.includes("email rate") || message.includes("rate limit")) {
    return "rate-limited"
  }

  if (code.includes("smtp") || code.includes("provider") || message.includes("email")) {
    return "provider"
  }

  return "unknown"
}

async function inviteAuthUser(email: string, displayName: string | null): Promise<InviteAuthResult> {
  const existingUser = await findAuthUserByEmail(email)

  if (existingUser) {
    return { user: existingUser, delivery: "existing" }
  }

  const admin = createServiceRoleClient()
  const headerStore = await headers()
  const origin = resolveAppOriginFromHeaders(headerStore)
  const authBrand = await getCoreAuthBrand()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
    data: {
      ...(displayName ? { display_name: displayName } : {}),
      brand_name: authBrand.name,
    },
  })

  if (!error && data.user?.id) {
    return { user: { id: data.user.id, email: data.user.email }, delivery: "sent" }
  }

  throw error ?? new Error("Supabase invite did not return a user")
}

async function upsertInvitedMembership({
  userId,
  email,
  displayName,
  roleKey,
}: {
  userId: string
  email: string
  displayName: string | null
  roleKey: AssignableRoleKey
}): Promise<{ profileId: string }> {
  const admin = createServiceRoleClient()

  const { data: workspace, error: workspaceError } = await admin
    .from("core_workspaces")
    .select("id")
    .eq("slug", "winningos")
    .is("deleted_at", null)
    .single()

  if (workspaceError || !workspace?.id) {
    throw workspaceError ?? new Error("WinningOS workspace not found")
  }

  const { data: role, error: roleError } = await admin
    .from("core_roles")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("key", roleKey)
    .single()

  if (roleError || !role?.id) {
    throw roleError ?? new Error("Core role not found")
  }

  const { data: existingProfile, error: profileReadError } = await admin
    .from("core_profiles")
    .select("id, display_name")
    .eq("user_id", userId)
    .maybeSingle()

  if (profileReadError) {
    throw profileReadError
  }

  let profileId = existingProfile?.id as string | undefined

  if (!profileId) {
    const { data: createdProfile, error: createProfileError } = await admin
      .from("core_profiles")
      .insert({ user_id: userId, display_name: displayName ?? email.split("@")[0] })
      .select("id")
      .single()

    if (createProfileError || !createdProfile?.id) {
      throw createProfileError ?? new Error("Core profile was not created")
    }

    profileId = createdProfile.id as string
  } else if (existingProfile && !existingProfile.display_name && displayName) {
    const { error: updateProfileError } = await admin
      .from("core_profiles")
      .update({ display_name: displayName })
      .eq("id", profileId)

    if (updateProfileError) {
      throw updateProfileError
    }
  }

  const { data: existingMembership, error: membershipReadError } = await admin
    .from("core_memberships")
    .select("id, status")
    .eq("workspace_id", workspace.id)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (membershipReadError) {
    throw membershipReadError
  }

  const nextStatus = existingMembership?.status === "active" ? "active" : "invited"
  const { error: membershipError } = await admin
    .from("core_memberships")
    .upsert(
      {
        workspace_id: workspace.id,
        profile_id: profileId,
        role_id: role.id,
        status: nextStatus,
      },
      { onConflict: "workspace_id,profile_id" },
    )

  if (membershipError) {
    throw membershipError
  }

  return { profileId }
}

export async function inviteMember(formData: FormData): Promise<never> {
  const email = normalizeEmail(readRequiredString(formData, "email"))
  const displayName = readOptionalString(formData, "displayName")
  const roleKey = readRequiredString(formData, "roleKey")

  if (!isAssignableRoleKey(roleKey)) {
    redirect("/members?status=failed")
  }

  if (!await currentMemberHasPermission("members.invite")) {
    redirect("/members?status=failed")
  }

  let delivery: InviteDelivery = "sent"
  let invitedProfileId: string | null = null

  try {
    const result = await inviteAuthUser(email, displayName)
    delivery = result.delivery
    const membership = await upsertInvitedMembership({ userId: result.user.id, email, displayName, roleKey })
    invitedProfileId = membership.profileId
  } catch (error) {
    const bucket = classifyInviteFailure(error)
    console.error("Failed to invite Core member", {
      bucket,
      message: error instanceof Error ? error.message : "Unknown invite failure",
    })
    redirect(`/members?status=${bucket === "rate-limited" ? "invite-rate-limited" : "invite-failed"}`)
  }

  await logCoreAuditEvent({
    action: "member.invited",
    subjectType: "profile",
    subjectId: invitedProfileId,
    metadata: { email, role: roleKey, delivery },
  })

  revalidatePath("/members")
  redirect(`/members?status=${delivery === "existing" ? "member-added" : "invited"}`)
}

export async function activateMember(formData: FormData): Promise<never> {
  const profileId = readRequiredString(formData, "profileId")
  const roleKey = readRequiredString(formData, "roleKey")

  if (!await currentMemberHasPermission("roles.assign")) {
    redirect("/members?status=failed")
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("core_set_member_role", {
    target_profile_id: profileId,
    target_role_key: roleKey,
  })

  if (error) {
    console.error("Failed to update Core member role", {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    redirect("/members?status=failed")
  }

  await logCoreAuditEvent({
    action: "member.role_changed",
    subjectType: "profile",
    subjectId: profileId,
    metadata: { role: roleKey },
  })

  revalidatePath("/members")
  redirect("/members?status=updated")
}

export async function disableMember(formData: FormData): Promise<never> {
  const membershipId = readRequiredString(formData, "membershipId")

  if (!await currentMemberHasPermission("members.disable")) {
    redirect("/members?status=failed")
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("core_disable_member", {
    target_membership_id: membershipId,
  })

  if (error) {
    console.error("Failed to disable Core member", {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    redirect("/members?status=failed")
  }

  await logCoreAuditEvent({
    action: "member.disabled",
    subjectType: "membership",
    subjectId: membershipId,
  })

  revalidatePath("/members")
  redirect("/members?status=updated")
}

export async function removeMember(formData: FormData): Promise<never> {
  const membershipId = readRequiredString(formData, "membershipId")

  if (!await currentMemberHasPermission("members.remove")) {
    redirect("/members?status=failed")
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("core_remove_member", {
    target_membership_id: membershipId,
  })

  if (error) {
    console.error("Failed to remove Core member", {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    redirect("/members?status=failed")
  }

  await logCoreAuditEvent({
    action: "member.removed",
    subjectType: "membership",
    subjectId: membershipId,
  })

  revalidatePath("/members")
  redirect("/members?status=removed")
}
