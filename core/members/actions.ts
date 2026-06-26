"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/core/supabase/server"

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key)

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${key}`)
  }

  return value.trim()
}

export async function activateMember(formData: FormData): Promise<never> {
  const profileId = readRequiredString(formData, "profileId")
  const roleKey = readRequiredString(formData, "roleKey")

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

  revalidatePath("/members")
  redirect("/members?status=updated")
}

export async function disableMember(formData: FormData): Promise<never> {
  const membershipId = readRequiredString(formData, "membershipId")

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

  revalidatePath("/members")
  redirect("/members?status=updated")
}
