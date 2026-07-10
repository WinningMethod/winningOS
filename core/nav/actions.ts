"use server"

import { revalidatePath } from "next/cache"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { createClient } from "@/core/supabase/server"
import { sanitizeNavLayout, type NavLayout } from "@/lib/nav-layout"

export type SaveNavLayoutResult = {
  ok: boolean
}

/**
 * Persist (or, with null, reset) the caller's personal sidebar layout. Called
 * directly by the in-sidebar customizer rather than through a form post — the
 * sidebar is interactive UI, so a redirect-with-status flow would throw the
 * user off whatever page they are on. core_save_nav_preferences re-enforces
 * authentication, active membership, and size limits server-side.
 *
 * Keys are deliberately not filtered against the currently visible nav items:
 * a key whose plugin is uninstalled (or whose permission was revoked) is
 * skipped at render but keeps its placement for when the item returns.
 */
export async function saveNavLayout(layout: NavLayout | null): Promise<SaveNavLayoutResult> {
  const session = await ensureCoreSession()

  if (!session.hasActiveMembership) {
    return { ok: false }
  }

  let cleanLayout: NavLayout | null = null

  if (layout !== null) {
    cleanLayout = sanitizeNavLayout(layout)

    if (!cleanLayout) {
      return { ok: false }
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("core_save_nav_preferences", {
    new_layout: cleanLayout,
  })

  if (error) {
    console.error("Failed to save Core nav preferences", {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return { ok: false }
  }

  revalidatePath("/", "layout")
  return { ok: true }
}
