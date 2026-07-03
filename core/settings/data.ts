import "server-only"

import { ensureCoreSession } from "@/core/auth/bootstrap"
import { createClient } from "@/core/supabase/server"
import { CORE_ROLE_KEYS, type CoreRoleKey, type PermissionKey } from "@/core/permissions/catalog"
import { getRoleGrantMap } from "@/core/permissions/grants"

export type CoreWorkspaceOverview = {
  id: string
  name: string
  slug: string
  createdAt: string | null
}

export type CoreBrandingOverview = {
  brandName: string
  logoUrl: string | null
  primaryColor: string | null
}

export type CoreSettingsOverview = {
  workspace: CoreWorkspaceOverview | null
  branding: CoreBrandingOverview | null
  canManageWorkspace: boolean
  canManageBranding: boolean
}

type WorkspaceRow = {
  id: string
  name: string
  slug: string
  created_at: string | null
}

type BrandRow = {
  brand_name: string
  logo_url: string | null
  theme_json: Record<string, unknown> | null
}

async function viewerGrantSet(): Promise<Set<PermissionKey>> {
  const session = await ensureCoreSession()
  const roleKey = session.membership?.roleKey ?? null

  if (!CORE_ROLE_KEYS.includes(roleKey as CoreRoleKey)) {
    return new Set<PermissionKey>()
  }

  const { grants } = await getRoleGrantMap()
  return grants[roleKey as CoreRoleKey]
}

/**
 * Live workspace + branding settings for the Settings page. Reads go through
 * the user client, so RLS (active members only) is the boundary; manage flags
 * come from the live grant map so buttons match what the RPCs will allow.
 */
export async function getCoreSettingsOverview(): Promise<CoreSettingsOverview> {
  const session = await ensureCoreSession()
  const grantSet = await viewerGrantSet()
  const canManageWorkspace = grantSet.has("workspace.manage")
  const canManageBranding = grantSet.has("branding.manage")

  if (!session.workspace?.id) {
    return { workspace: null, branding: null, canManageWorkspace, canManageBranding }
  }

  const supabase = await createClient()

  const [{ data: workspaceRow, error: workspaceError }, { data: brandRow, error: brandError }] = await Promise.all([
    supabase
      .from("core_workspaces")
      .select("id, name, slug, created_at")
      .eq("id", session.workspace.id)
      .maybeSingle<WorkspaceRow>(),
    supabase
      .from("core_brand_settings")
      .select("brand_name, logo_url, theme_json")
      .eq("workspace_id", session.workspace.id)
      .maybeSingle<BrandRow>(),
  ])

  if (workspaceError) {
    console.error("Failed to read Core workspace settings", {
      code: workspaceError.code,
      details: workspaceError.details,
    })
  }

  if (brandError) {
    console.error("Failed to read Core branding settings", {
      code: brandError.code,
      details: brandError.details,
    })
  }

  const primaryColor = typeof brandRow?.theme_json?.primary_color === "string"
    ? brandRow.theme_json.primary_color
    : null

  return {
    workspace: workspaceRow
      ? {
          id: workspaceRow.id,
          name: workspaceRow.name,
          slug: workspaceRow.slug,
          createdAt: workspaceRow.created_at,
        }
      : null,
    branding: brandRow
      ? {
          brandName: brandRow.brand_name,
          logoUrl: brandRow.logo_url,
          primaryColor,
        }
      : null,
    canManageWorkspace,
    canManageBranding,
  }
}

export type CoreAuditEventOverview = {
  id: string
  action: string
  actorName: string | null
  createdAt: string
}

/**
 * Recent audit events for the Home activity feed. RLS limits reads to holders
 * of the live workspace.manage grant; other members simply get zero rows.
 */
export async function getRecentAuditEvents(limit = 8): Promise<{ events: CoreAuditEventOverview[]; canViewAudit: boolean }> {
  const grantSet = await viewerGrantSet()
  const canViewAudit = grantSet.has("workspace.manage")

  if (!canViewAudit) {
    return { events: [], canViewAudit }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("core_audit_events")
    .select("id, action, created_at, actor:core_profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Failed to read Core audit events", { code: error.code, details: error.details })
    return { events: [], canViewAudit }
  }

  type AuditRow = {
    id: string
    action: string
    created_at: string
    actor: { display_name: string | null } | null
  }

  return {
    canViewAudit,
    events: ((data ?? []) as unknown as AuditRow[]).map((row) => ({
      id: row.id,
      action: row.action,
      actorName: row.actor?.display_name ?? null,
      createdAt: row.created_at,
    })),
  }
}
