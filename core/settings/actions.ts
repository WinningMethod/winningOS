"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { createClient } from "@/core/supabase/server"
import { createServiceRoleClient } from "@/core/supabase/service-role"
import { roleHasLivePermission } from "@/core/permissions/grants"

function readTrimmedString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

const WORKSPACE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

const BRAND_ASSET_BUCKET = "core-brand"
const MAX_LOGO_BYTES = 2 * 1024 * 1024
const LOGO_CONTENT_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
}

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

// Uploads a validated logo file to the public brand-asset bucket through the
// service role (no client storage policies exist) and returns its public URL.
async function uploadBrandLogo(file: File): Promise<string | null> {
  const extension = LOGO_CONTENT_TYPES[file.type]

  if (!extension || file.size <= 0 || file.size > MAX_LOGO_BYTES) {
    return null
  }

  const admin = createServiceRoleClient()
  const path = `workspace-logo-${Date.now()}.${extension}`
  const { error } = await admin.storage.from(BRAND_ASSET_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    console.error("Failed to upload Core brand logo", { message: error.message })
    return null
  }

  return admin.storage.from(BRAND_ASSET_BUCKET).getPublicUrl(path).data.publicUrl
}

/**
 * Update branding: brand name, logo (uploaded file or https URL), and the
 * primary/secondary/tertiary colors the app theme inherits (issue #50).
 * Gated on the live branding.manage grant; core_update_brand_settings
 * re-enforces server-side and writes the branding.updated audit event.
 */
export async function updateBrandingSettings(formData: FormData): Promise<never> {
  const brandName = readTrimmedString(formData, "brandName")
  const logoUrlInput = readTrimmedString(formData, "logoUrl")
  const primaryColor = readTrimmedString(formData, "primaryColor").toLowerCase()
  const secondaryColor = readTrimmedString(formData, "secondaryColor").toLowerCase()
  const tertiaryColor = readTrimmedString(formData, "tertiaryColor").toLowerCase()
  const logoFile = formData.get("logoFile")

  if (
    !brandName
    || brandName.length > 120
    || (logoUrlInput && (!logoUrlInput.startsWith("https://") || logoUrlInput.length > 2048))
    || (primaryColor && !HEX_COLOR_PATTERN.test(primaryColor))
    || (secondaryColor && !HEX_COLOR_PATTERN.test(secondaryColor))
    || (tertiaryColor && !HEX_COLOR_PATTERN.test(tertiaryColor))
  ) {
    redirect("/settings?tab=branding&status=branding-invalid")
  }

  const session = await ensureCoreSession()
  if (!await roleHasLivePermission(session.membership?.roleKey, "branding.manage")) {
    redirect("/settings?tab=branding&status=branding-failed")
  }

  // An uploaded file wins over the URL field; the permission gate above runs
  // first so unauthorized submissions never reach storage.
  let logoUrl = logoUrlInput
  if (logoFile instanceof File && logoFile.size > 0) {
    const uploadedUrl = await uploadBrandLogo(logoFile)

    if (!uploadedUrl) {
      redirect("/settings?tab=branding&status=branding-logo-invalid")
    }

    logoUrl = uploadedUrl
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("core_update_brand_settings", {
    new_brand_name: brandName,
    new_logo_url: logoUrl || null,
    new_primary_color: primaryColor || null,
    new_secondary_color: secondaryColor || null,
    new_tertiary_color: tertiaryColor || null,
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
  revalidatePath("/", "layout")
  redirect("/settings?tab=branding&status=branding-updated")
}
