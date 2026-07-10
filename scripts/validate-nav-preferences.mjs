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
// Per-user nav preferences storage
// ---------------------------------------------------------------------------
const navMigration = read(join(migrationsDir, "20260710120000_add_nav_preferences.sql"))
assert(navMigration.includes("create table if not exists public.core_nav_preferences"), "nav migration creates core_nav_preferences")
assert(navMigration.includes("constraint core_nav_preferences_workspace_profile_key unique (workspace_id, profile_id)"), "nav preferences are one row per workspace member")
assert(navMigration.includes("jsonb_typeof(layout_json) = 'object'"), "layout_json is constrained to a JSON object")
assert(navMigration.includes("alter table public.core_nav_preferences enable row level security"), "nav preferences table enables RLS")
assert(navMigration.includes("profile_id = private.core_current_profile_id()"), "nav preferences reads are scoped to the caller's own row")
assert(!navMigration.includes("for insert") && !navMigration.includes("for update") && !navMigration.includes("for delete"), "nav preferences have no client write policies (writes via definer RPC only)")
assert(navMigration.includes("function public.core_save_nav_preferences"), "nav migration adds the core_save_nav_preferences RPC")
assert(navMigration.includes("private.core_is_active_member(target_workspace_id)"), "save RPC requires an active workspace membership")
assert(navMigration.includes("pg_column_size(new_layout)"), "save RPC caps the stored layout size")
assert(navMigration.includes("grant execute on function public.core_save_nav_preferences(jsonb) to authenticated"), "save RPC is executable by authenticated users")

// ---------------------------------------------------------------------------
// Shared layout model
// ---------------------------------------------------------------------------
const navLayout = read("lib/nav-layout.ts")
assert(navLayout.includes("export function sanitizeNavLayout"), "layout model exposes sanitizeNavLayout for untrusted JSON")
assert(navLayout.includes("export function defaultNavLayout"), "layout model exposes the default Workspace/Plugins layout")
assert(navLayout.includes("export function buildSidebarNav"), "layout model reconciles layouts against visible items")
assert(!navLayout.includes("server-only"), "layout model stays client-safe (drives the in-sidebar customizer)")

// ---------------------------------------------------------------------------
// Read/write paths follow the core module conventions
// ---------------------------------------------------------------------------
const navData = read("core/nav/data.ts")
assert(navData.includes('import "server-only"'), "nav data reader is server-only")
assert(navData.includes("sanitizeNavLayout"), "nav data reader sanitizes stored JSON before use")
assert(navData.includes('from("core_nav_preferences")'), "nav data reader goes through the user client (RLS boundary)")

const navActions = read("core/nav/actions.ts")
assert(navActions.includes('"use server"'), "nav save path is a server action")
assert(navActions.includes('rpc("core_save_nav_preferences"'), "nav save path writes through the definer RPC")
assert(navActions.includes("sanitizeNavLayout"), "nav save path sanitizes client-submitted layouts")

// ---------------------------------------------------------------------------
// Sidebar consumes the per-user layout
// ---------------------------------------------------------------------------
const appLayout = read("app/(app)/layout.tsx")
assert(appLayout.includes("getNavLayoutForCurrentUser"), "app layout loads the viewer's saved nav layout")

const sidebar = read("components/app/sidebar.tsx")
assert(sidebar.includes("buildSidebarNav"), "sidebar renders the reconciled per-user tree")
assert(sidebar.includes("NavCustomizer"), "sidebar mounts the customizer in edit mode")

console.log("\nnav preferences validation passed")
