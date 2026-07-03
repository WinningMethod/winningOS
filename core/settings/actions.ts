"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { createClient } from "@/core/supabase/server"
import { roleHasLivePermission } from "@/core/permissions/grants"

function readTrimmedString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

const WORKSPACE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

/**
 * Update workspace name/slug. Gated on the live workspace.manage grant here for
 * fast feedback; core_update_workspace_settings re-enforces server-side and
 * writes the workspace.updated audit event in the same transaction.
 */
export async function updateWorkspaceSettings(formData: FormData): Promise<never> {
  const name = readTrimmedString(formData, "name")
  const slug = readTrimmedString(formData, "slug").toLowerCase()

  if (!name || name.length > 120 || !WORKSPACE_SLUG_PATTERN.test(slug) || slug.length > 60) {
    redirect("/settings?tab=workspace&status=workspace-invalid")
  }

  const session = await ensureCoreSession()
  if (!await roleHasLivePermission(session.membership?.roleKey, "workspace.manage")) {
    redirect("/settings?tab=workspace&status=workspace-failed")
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("core_update_workspace_settings", {
    new_name: name,
    new_slug: slug,
  })

  if (error) {
    console.error("Failed to update Core workspace settings", {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    redirect("/settings?tab=workspace&status=workspace-failed")
  }

  revalidatePath("/settings")
  revalidatePath("/home")
  redirect("/settings?tab=workspace&status=workspace-updated")
}

/**
 * Update branding (brand name, logo URL, primary color). Gated on the live
 * branding.manage grant; core_update_brand_settings re-enforces server-side
 * and writes the branding.updated audit event.
 */
export async function updateBrandingSettings(formData: FormData): Promise<never> {
  const brandName = readTrimmedString(formData, "brandName")
  const logoUrl = readTrimmedString(formData, "logoUrl")
  const primaryColor = readTrimmedString(formData, "primaryColor")

  if (
    !brandName
    || brandName.length > 120
    || (logoUrl && (!logoUrl.startsWith("https://") || logoUrl.length > 2048))
    || (primaryColor && !HEX_COLOR_PATTERN.test(primaryColor))
  ) {
    redirect("/settings?tab=branding&status=branding-invalid")
  }

  const session = await ensureCoreSession()
  if (!await roleHasLivePermission(session.membership?.roleKey, "branding.manage")) {
    redirect("/settings?tab=branding&status=branding-failed")
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("core_update_brand_settings", {
    new_brand_name: brandName,
    new_logo_url: logoUrl || null,
    new_primary_color: primaryColor || null,
  })

  if (error) {
    console.error("Failed to update Core branding settings", {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    redirect("/settings?tab=branding&status=branding-failed")
  }

  revalidatePath("/settings")
  revalidatePath("/home")
  redirect("/settings?tab=branding&status=branding-updated")
}
