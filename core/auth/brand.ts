import "server-only"

import { createServiceRoleClient } from "@/core/supabase/service-role"

const DEFAULT_CORE_AUTH_BRAND = "WinningOS Core"

type CoreAuthBrand = {
  name: string
}

function normalizeBrandName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function getCoreAuthBrand(): Promise<CoreAuthBrand> {
  try {
    const supabase = createServiceRoleClient()
    const { data: workspace, error: workspaceError } = await supabase
      .from("core_workspaces")
      .select("id")
      .eq("slug", "winningos")
      .is("deleted_at", null)
      .maybeSingle()

    if (workspaceError || !workspace) {
      if (workspaceError) {
        console.warn("Failed to read auth email workspace brand", workspaceError)
      }

      return { name: DEFAULT_CORE_AUTH_BRAND }
    }

    const { data: brand, error: brandError } = await supabase
      .from("core_brand_settings")
      .select("brand_name")
      .eq("workspace_id", workspace.id)
      .maybeSingle()

    if (brandError) {
      console.warn("Failed to read auth email brand settings", brandError)
      return { name: DEFAULT_CORE_AUTH_BRAND }
    }

    return { name: normalizeBrandName(brand?.brand_name) ?? DEFAULT_CORE_AUTH_BRAND }
  } catch (error) {
    console.warn("Falling back to default auth email brand", error)
    return { name: DEFAULT_CORE_AUTH_BRAND }
  }
}
