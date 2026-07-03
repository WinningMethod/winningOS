import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }

  console.log(`✓ ${message}`)
}

function read(path) {
  assert(existsSync(path), `exists: ${path}`)
  return readFileSync(path, "utf8")
}

const migrationsDir = "supabase/migrations"

// ---------------------------------------------------------------------------
// Audit events (Phase 8)
// ---------------------------------------------------------------------------
const auditMigration = read(join(migrationsDir, "20260703120000_add_audit_events.sql"))
assert(auditMigration.includes("create table if not exists public.core_audit_events"), "audit migration creates core_audit_events")
assert(auditMigration.includes("core_audit_events_action_format"), "audit events enforce dot-namespaced action format")
assert(auditMigration.includes("function private.core_append_audit_event"), "audit migration adds the private append helper")
assert(auditMigration.includes("private.core_current_profile_id()"), "audit helper resolves the actor from auth context, not caller input")
assert(auditMigration.includes("alter table public.core_audit_events enable row level security"), "audit events table enables RLS")
assert(auditMigration.includes("core_current_member_has_permission(workspace_id, 'workspace.manage')"), "audit reads require the live workspace.manage grant")
assert(!auditMigration.includes("for insert"), "audit table has no client insert policy (append via definer/service role only)")
assert(!auditMigration.includes("for update") && !auditMigration.includes("for delete"), "audit table has no client update/delete policies (append-only)")
assert(auditMigration.includes("revoke execute on function private.core_append_audit_event"), "audit append helper is not directly executable")

const auditLog = read("core/audit/log.ts")
assert(auditLog.includes("export async function logCoreAuditEvent"), "app audit helper exposes logCoreAuditEvent")
assert(auditLog.includes("never throws"), "app audit helper documents best-effort behavior")
assert(auditLog.includes("createServiceRoleClient"), "app audit helper writes through the service role")

const memberActions = read("core/members/actions.ts")
assert(memberActions.includes('action: "member.invited"'), "invite action records member.invited")
assert(memberActions.includes('action: "member.role_changed"'), "role action records member.role_changed")
assert(memberActions.includes('action: "member.disabled"'), "disable action records member.disabled")
assert(memberActions.includes('action: "member.removed"'), "remove action records member.removed")

const permissionActions = read("core/permissions/actions.ts")
assert(permissionActions.includes('action: "role_permission.changed"'), "role-permission action records role_permission.changed")

// ---------------------------------------------------------------------------
// Persisted settings (Phase 7)
// ---------------------------------------------------------------------------
const settingsMigration = read(join(migrationsDir, "20260703121000_persist_core_settings.sql"))
assert(settingsMigration.includes("function public.core_update_workspace_settings"), "settings migration adds the workspace update RPC")
assert(settingsMigration.includes("core_current_member_has_permission(target_workspace_id, 'workspace.manage')"), "workspace RPC requires the live workspace.manage grant")
assert(settingsMigration.includes("function public.core_update_brand_settings"), "settings migration adds the branding update RPC")
assert(settingsMigration.includes("core_current_member_has_permission(target_workspace_id, 'branding.manage')"), "branding RPC requires the live branding.manage grant")
assert(settingsMigration.includes("'^[a-z0-9]+(?:-[a-z0-9]+)*$'"), "workspace RPC validates the slug format server-side")
assert(settingsMigration.includes("'^#[0-9a-f]{6}$'"), "branding RPC validates the primary color format server-side")
assert(settingsMigration.includes("'workspace.updated'"), "workspace RPC writes the workspace.updated audit event")
assert(settingsMigration.includes("'branding.updated'"), "branding RPC writes the branding.updated audit event")
assert(settingsMigration.includes("is distinct from"), "settings RPCs skip audit events for no-op saves")
assert(settingsMigration.includes("grant execute on function public.core_update_workspace_settings(text, text) to authenticated"), "workspace RPC is executable by authenticated users")
assert(settingsMigration.includes("grant execute on function public.core_update_brand_settings(text, text, text) to authenticated"), "branding RPC is executable by authenticated users")
assert(settingsMigration.includes("revoke all on function public.core_update_workspace_settings(text, text) from public"), "workspace RPC revokes default public execute")
assert(settingsMigration.includes("revoke all on function public.core_update_brand_settings(text, text, text) from public"), "branding RPC revokes default public execute")

const settingsData = read("core/settings/data.ts")
assert(settingsData.includes("getCoreSettingsOverview"), "settings data exposes the live settings overview")
assert(settingsData.includes("getRoleGrantMap"), "settings data derives manage flags from the live grant map")
assert(settingsData.includes("getRecentAuditEvents"), "settings data exposes the recent audit feed")
assert(settingsData.includes('grantSet.has("workspace.manage")'), "audit feed visibility follows the live workspace.manage grant")

const settingsActions = read("core/settings/actions.ts")
assert(settingsActions.includes("core_update_workspace_settings"), "workspace action calls the workspace RPC")
assert(settingsActions.includes("core_update_brand_settings"), "branding action calls the branding RPC")
assert(settingsActions.includes('roleHasLivePermission(session.membership?.roleKey, "workspace.manage")'), "workspace action gates on the live workspace.manage grant")
assert(settingsActions.includes('roleHasLivePermission(session.membership?.roleKey, "branding.manage")'), "branding action gates on the live branding.manage grant")
assert(settingsActions.includes("workspace-invalid") && settingsActions.includes("branding-invalid"), "settings actions surface validation failures distinctly")

const workspaceSection = read("components/app/settings/workspace-section.tsx")
assert(workspaceSection.includes("updateWorkspaceSettings"), "workspace section submits the workspace action")
assert(workspaceSection.includes("canManage"), "workspace section disables editing without workspace.manage")
assert(!workspaceSection.includes("mock-data"), "workspace section no longer reads mock data")

const brandingSection = read("components/app/settings/branding-section.tsx")
assert(brandingSection.includes("updateBrandingSettings"), "branding section submits the branding action")
assert(brandingSection.includes("canManage"), "branding section disables editing without branding.manage")
assert(!brandingSection.includes("mock-data"), "branding section no longer reads mock data")

const settingsPage = read("app/(app)/settings/page.tsx")
assert(settingsPage.includes("getCoreSettingsOverview"), "settings page loads the live settings overview")
assert(settingsPage.includes("workspace-updated") && settingsPage.includes("branding-updated"), "settings page surfaces save confirmations")
assert(!settingsPage.includes("<Button>Save changes</Button>"), "settings page dropped the non-functional global save button")

const homePage = read("app/(app)/home/page.tsx")
assert(homePage.includes("getCoreSettingsOverview"), "home page reads live workspace data")
assert(homePage.includes("getCoreMembers"), "home page reads live member counts")
assert(homePage.includes("getRecentAuditEvents"), "home page surfaces the audit activity feed")
assert(!homePage.includes("mock-data"), "home page no longer reads mock data")
assert(
  !homePage.includes("memberData.members.length > 1"),
  "home page checklist does not treat unbounded member count as 'invited'",
)
assert(
  homePage.includes('m.status === "active" || m.status === "invited"'),
  "home page 'Invite members' checklist item excludes uninvited pending_access profiles",
)

assert(!existsSync("lib/mock-data.ts"), "static mock data module is deleted")

console.log("Core settings + audit validation passed.")
