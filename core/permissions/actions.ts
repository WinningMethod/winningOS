"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { createClient } from "@/core/supabase/server"
import { allPermissions, isEditableGrant, type CoreRoleKey, type PermissionKey } from "./catalog"
import { roleHasLivePermission } from "./grants"

const EDITABLE_ROLE_KEYS = ["admin", "member", "viewer"] as const
type EditableRoleKey = (typeof EDITABLE_ROLE_KEYS)[number]

const PERMISSION_KEY_SET = new Set<string>(allPermissions.map((permission) => permission.key))

function isEditableRoleKey(value: string): value is EditableRoleKey {
  return EDITABLE_ROLE_KEYS.includes(value as EditableRoleKey)
}

function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEY_SET.has(value)
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

/**
 * Toggle a single role → permission grant (issue #42). Owner-only: gated on the
 * live roles.manage grant here for fast UX feedback, then re-enforced by the
 * core_set_role_permission RPC (which also keeps owner immutable and the
 * structural owner-only permissions locked).
 */
export async function setRolePermission(formData: FormData): Promise<never> {
  const roleKey = readString(formData, "roleKey")
  const permissionKey = readString(formData, "permissionKey")
  const granted = readString(formData, "granted") === "true"

  if (!isEditableRoleKey(roleKey) || !isPermissionKey(permissionKey) || !isEditableGrant(roleKey as CoreRoleKey, permissionKey)) {
    redirect("/settings?tab=roles&status=role-permission-failed")
  }

  const session = await ensureCoreSession()
  if (!await roleHasLivePermission(session.membership?.roleKey, "roles.manage")) {
    redirect("/settings?tab=roles&status=role-permission-failed")
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("core_set_role_permission", {
    target_role_key: roleKey,
    target_permission_key: permissionKey,
    granted,
  })

  if (error) {
    console.error("Failed to update Core role permission", {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    redirect("/settings?tab=roles&status=role-permission-failed")
  }

  revalidatePath("/settings")
  redirect("/settings?tab=roles&status=role-permission-updated")
}
