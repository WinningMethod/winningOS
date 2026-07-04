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

// ---------------------------------------------------------------------------
// Role-permission grant fix (issue #49)
// ---------------------------------------------------------------------------
const grantFixMigration = read(join(migrationsDir, "20260704100000_fix_role_permission_grant_conflict.sql"))
const grantFixSqlOnly = grantFixMigration.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n")
assert(grantFixMigration.includes("on conflict on constraint core_role_permissions_pkey do nothing"), "set_role_permission upsert uses the named constraint (no PL/pgSQL ambiguity)")
assert(!grantFixSqlOnly.includes("on conflict (role_key, permission_key)"), "set_role_permission no longer uses the ambiguous column-inference conflict form")
assert(grantFixMigration.includes("core_current_member_has_permission(target_workspace_id, 'roles.manage')"), "set_role_permission still requires roles.manage")
assert(grantFixMigration.includes("('workspace.delete', 'members.invite', 'members.remove', 'roles.manage')"), "set_role_permission still locks the structural owner-only permissions")

// ---------------------------------------------------------------------------
// Branding v2: three theme colors + logo upload + app inheritance (issue #50)
// ---------------------------------------------------------------------------
const brandingV2Migration = read(join(migrationsDir, "20260704101000_branding_theme_v2.sql"))
assert(brandingV2Migration.includes("drop function if exists public.core_update_brand_settings(text, text, text);"), "branding v2 drops the old three-parameter RPC signature")
assert(brandingV2Migration.includes("new_secondary_color text") && brandingV2Migration.includes("new_tertiary_color text"), "branding v2 RPC accepts secondary and tertiary colors")
assert(brandingV2Migration.includes("secondary color must be a #rrggbb hex value") && brandingV2Migration.includes("tertiary color must be a #rrggbb hex value"), "branding v2 RPC validates all colors server-side")
assert(brandingV2Migration.includes("core_current_member_has_permission(target_workspace_id, 'branding.manage')"), "branding v2 RPC still requires branding.manage")
assert(brandingV2Migration.includes("'branding.updated'") && brandingV2Migration.includes("'secondary_color', clean_secondary_color"), "branding v2 audit event records all colors")
assert(brandingV2Migration.includes("grant execute on function public.core_update_brand_settings(text, text, text, text, text) to authenticated"), "branding v2 RPC is executable by authenticated users")
assert(brandingV2Migration.includes("revoke all on function public.core_update_brand_settings(text, text, text, text, text) from public"), "branding v2 RPC revokes default public execute")
assert(brandingV2Migration.includes("insert into storage.buckets") && brandingV2Migration.includes("'core-brand'"), "branding v2 creates the public brand-asset bucket")

const settingsActionsV2 = read("core/settings/actions.ts")
assert(settingsActionsV2.includes("new_secondary_color") && settingsActionsV2.includes("new_tertiary_color"), "branding action submits secondary and tertiary colors")
assert(settingsActionsV2.includes("uploadBrandLogo"), "branding action supports logo upload")
assert(settingsActionsV2.includes("MAX_LOGO_BYTES"), "logo upload enforces a size cap")
assert(settingsActionsV2.includes("image/svg+xml"), "logo upload allowlists image content types")
assert(settingsActionsV2.includes("branding-logo-invalid"), "logo upload failures surface a distinct status")
assert(settingsActionsV2.indexOf("roleHasLivePermission") < settingsActionsV2.indexOf("uploadBrandLogo(logoFile)"), "permission gate runs before any storage upload")
assert(settingsActionsV2.includes('revalidatePath("/", "layout")'), "branding saves revalidate the themed root layout")

const brandTheme = read("core/branding/theme.ts")
assert(brandTheme.includes("getCoreBrandTheme"), "brand theme module reads saved colors")
assert(brandTheme.includes("brandThemeCss"), "brand theme module renders token overrides")
assert(brandTheme.includes("--primary:") && brandTheme.includes("--secondary:") && brandTheme.includes("--accent:"), "brand theme overrides the primary/secondary/accent tokens")
assert(brandTheme.includes("HEX_COLOR_PATTERN.test"), "brand theme re-validates colors before emitting CSS")
assert(brandTheme.includes("foregroundFor"), "brand theme derives readable foregrounds by luminance")

const brandColor = read("core/branding/color.ts")
assert(!brandColor.includes('import "server-only"'), "shared color math stays safe to bundle for the browser")
assert(brandColor.includes("export function foregroundFor"), "color module exports the shared foreground-contrast helper")

const rootLayout = read("app/layout.tsx")
assert(rootLayout.includes("getCoreBrandTheme") && rootLayout.includes("brandThemeCss"), "root layout injects the saved brand theme")

const brandingSectionV2 = read("components/app/settings/branding-section.tsx")
assert(brandingSectionV2.includes('name="secondaryColor"') && brandingSectionV2.includes('name="tertiaryColor"'), "branding section edits secondary and tertiary colors")
assert(brandingSectionV2.includes('type="file"') && brandingSectionV2.includes('name="logoFile"'), "branding section offers logo upload")
assert(brandingSectionV2.includes('aria-label="Logo URL"'), "logo URL input keeps an accessible name once the file input takes the visible Logo label")
assert(
  brandingSectionV2.includes("foregroundFor(tertiaryColor)") && brandingSectionV2.includes("foregroundFor(secondaryColor)"),
  "branding preview derives readable text color from the chosen secondary/tertiary colors instead of a fixed light-mode class",
)

// ---------------------------------------------------------------------------
// Slug is metadata, never a resolution key (issue #52)
// ---------------------------------------------------------------------------
const slugFixMigration = read(join(migrationsDir, "20260704120000_unpin_workspace_slug.sql"))
const slugFixSqlOnly = slugFixMigration.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n")
assert(slugFixMigration.includes("create or replace function public.core_bootstrap_current_user"), "slug-fix migration redefines the bootstrap RPC")
assert(!slugFixSqlOnly.includes("slug = 'winningos'"), "bootstrap RPC no longer resolves the workspace by slug")
assert(slugFixMigration.includes("where w.deleted_at is null") && slugFixMigration.includes("order by w.created_at asc"), "bootstrap RPC resolves the single active workspace structurally")
assert(slugFixMigration.includes("for update"), "bootstrap RPC still serializes the first-owner decision")
assert(slugFixMigration.includes("on conflict on constraint core_memberships_workspace_profile_key do nothing"), "bootstrap RPC keeps the named membership constraint")
assert(slugFixMigration.includes("grant execute on function public.core_bootstrap_current_user(text) to authenticated"), "bootstrap RPC stays granted to authenticated only")

for (const appFile of ["core/auth/brand.ts", "core/branding/theme.ts", "core/members/actions.ts"]) {
  const contents = read(appFile)
  assert(!contents.includes('eq("slug"'), `${appFile} no longer resolves the workspace by slug`)
  assert(contents.includes('is("deleted_at", null)'), `${appFile} resolves the single active workspace structurally`)
}

const workspaceSectionSlug = read("components/app/settings/workspace-section.tsx")
assert(workspaceSectionSlug.includes("nothing in Core resolves by it"), "workspace section explains the slug's purpose")

const remoteVerify = read("scripts/verify-supabase-remote.mjs")
assert(!remoteVerify.includes("slug = 'winningos'"), "remote verification does not depend on the editable slug value")

console.log("Core settings + audit validation passed.")
