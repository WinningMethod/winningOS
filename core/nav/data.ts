import "server-only"

import { ensureCoreSession } from "@/core/auth/bootstrap"
import { createClient } from "@/core/supabase/server"
import { sanitizeNavLayout, type NavLayout } from "@/lib/nav-layout"

type NavPreferencesRow = {
  layout_json: Record<string, unknown> | null
}

/**
 * The viewer's saved sidebar layout, or null when they never customized (or
 * the stored JSON no longer parses as a layout — either way the sidebar falls
 * back to the default). Reads go through the user client, so the own-row RLS
 * policy on core_nav_preferences is the boundary.
 */
export async function getNavLayoutForCurrentUser(): Promise<NavLayout | null> {
  const session = await ensureCoreSession()

  if (!session.hasActiveMembership || !session.profile?.id || !session.workspace?.id) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("core_nav_preferences")
    .select("layout_json")
    .eq("workspace_id", session.workspace.id)
    .eq("profile_id", session.profile.id)
    .maybeSingle<NavPreferencesRow>()

  if (error) {
    console.error("Failed to read Core nav preferences", {
      code: error.code,
      details: error.details,
    })
    return null
  }

  return data?.layout_json ? sanitizeNavLayout(data.layout_json) : null
}
