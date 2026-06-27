import { existsSync, readFileSync, readdirSync } from "node:fs"
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
const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort()
const memberMigrationFile = migrationFiles.find((file) => file.endsWith("_add_member_management.sql"))
const invitationMigrationFile = migrationFiles.find((file) => file.endsWith("_add_member_invitations.sql"))
assert(Boolean(memberMigrationFile), "adds member-management migration")
assert(Boolean(invitationMigrationFile), "adds member-invitations migration")

const memberMigration = read(join(migrationsDir, memberMigrationFile))
const invitationMigration = read(join(migrationsDir, invitationMigrationFile))

assert(memberMigration.includes("public.core_list_workspace_members"), "defines member list RPC")
assert(memberMigration.includes("public.core_set_member_role"), "defines member role activation/update RPC")
assert(memberMigration.includes("public.core_disable_member"), "defines member disable RPC")
assert(memberMigration.includes("security definer") && memberMigration.includes("set search_path = extensions, auth, private, public"), "member-management RPCs use fixed security-definer search path")
assert(memberMigration.includes("private.core_current_member_role_key"), "adds private current-member role helper")
assert(memberMigration.includes("private.core_can_manage_members"), "adds private member-management authorization helper")
assert(memberMigration.includes("role_key in ('owner', 'admin')"), "member management is owner/admin-only")
assert(memberMigration.includes("where (m.id is not null and m.status = 'active')"), "member list limits non-admin visibility to active memberships")
assert(memberMigration.includes("target_role_key not in ('admin', 'member', 'viewer')"), "member role RPC excludes assigning owner through UI path")
assert(memberMigration.includes("current_profile_id = target_profile_id"), "member disable RPC prevents self-disable")
assert(memberMigration.includes("target_role_key = 'owner'"), "member role RPC prevents owner assignment")
assert(memberMigration.includes("target_role_key = 'owner'"), "member disable RPC protects owner membership")
assert(memberMigration.includes("join auth.users"), "member list RPC can show authenticated pending profile emails")
assert(memberMigration.includes("grant execute on function public.core_list_workspace_members() to authenticated"), "grants member list RPC to authenticated role")
assert(memberMigration.includes("grant execute on function public.core_set_member_role(uuid, text) to authenticated"), "grants member role RPC to authenticated role")
assert(memberMigration.includes("grant execute on function public.core_disable_member(uuid) to authenticated"), "grants member disable RPC to authenticated role")
assert(memberMigration.includes("revoke all on function public.core_list_workspace_members() from public"), "revokes public member list execute")
assert(memberMigration.includes("revoke all on function public.core_set_member_role(uuid, text) from public"), "revokes public member role execute")
assert(memberMigration.includes("revoke all on function public.core_disable_member(uuid) from public"), "revokes public member disable execute")
assert(invitationMigration.includes("existing_membership_status = 'invited'"), "auth bootstrap promotes invited memberships")
assert(invitationMigration.includes("status = 'active'"), "invited memberships become active after sign-in")
assert(invitationMigration.includes("has_active_membership boolean"), "invitation bootstrap preserves auth session contract")

const memberData = read("core/members/data.ts")
assert(memberData.includes("getCoreMembers"), "exports server member list helper")
assert(memberData.includes("core_list_workspace_members"), "member list helper calls list RPC")
assert(memberData.includes("ensureCoreSession"), "member list helper checks Core session")

const memberActions = read("core/members/actions.ts")
assert(memberActions.includes("activateMember"), "exports activate member server action")
assert(memberActions.includes("inviteMember"), "exports invite member server action")
assert(memberActions.includes("disableMember"), "exports disable member server action")
assert(memberActions.includes("inviteUserByEmail"), "invite action sends Supabase invite email")
assert(memberActions.includes("createServiceRoleClient"), "invite action uses server-only service role client")
assert(memberActions.includes("core_memberships") && memberActions.includes('const nextStatus = existingMembership?.status === "active" ? "active" : "invited"'), "invite action creates invited Core membership")
assert(memberActions.includes("resolveAppOriginFromHeaders"), "invite action sends invite callback to app origin")
assert(memberActions.includes("core_list_workspace_members"), "invite action verifies owner/admin authorization before service role writes")
assert(memberActions.includes("core_set_member_role"), "activate action calls member role RPC")
assert(memberActions.includes("core_disable_member"), "disable action calls disable RPC")
assert(memberActions.includes("revalidatePath(\"/members\")"), "member actions revalidate members route")
assert(memberActions.includes("redirect(\"/members?status=updated\")"), "member actions redirect after success")

const membersPage = read("app/(app)/members/page.tsx")
assert(!membersPage.includes('"use client"'), "members page is server-rendered")
assert(!membersPage.includes("@/lib/mock-data"), "members page no longer reads static mock members")
assert(membersPage.includes("getCoreMembers"), "members page reads real Core members")
assert(membersPage.includes("activateMember"), "members page exposes activation action")
assert(membersPage.includes("inviteMember"), "members page exposes invite action")
assert(membersPage.includes('name="email"') && membersPage.includes('type="email"'), "members page has invite email field")
assert(membersPage.includes('name="displayName"'), "members page has invite display-name field")
assert(membersPage.includes('name="roleKey"'), "members page has invite role field")
assert(!membersPage.includes("<Button disabled title=\"Coming later\""), "members page invite button is enabled")
assert(!membersPage.includes("Invitations are Coming later"), "members page no longer says invitations are deferred")
assert(membersPage.includes("Invited"), "members page shows invited status")
assert(membersPage.includes("disableMember"), "members page exposes disable action")
assert(membersPage.includes("Pending access"), "members page shows pending access profiles")
assert(membersPage.includes("owner") && membersPage.includes("admin"), "members page reflects owner/admin management boundary")

console.log("Member-management validation passed.")
