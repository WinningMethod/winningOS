// WinningOS plugin manifest — the `core-v0` contract type (COMPATIBILITY.md).
//
// A plugin's manifest is its single source of declarations: routes, navigation,
// settings, permissions, and tables all derive from it, and one registry line
// in `config/plugins.ts` is the only install switch. This module is pure types
// plus one string guard so both server and client code can share it; everything
// that touches the registry or the database lives in the server-only modules
// next to it.
//
// The template repo (`WinningMethod/WinningTemplate`) mirrors this type in its
// `core-stub` so plugin repos typecheck standalone. Changing this shape is a
// compatibility-level conversation, not a silent edit — the stub and this file
// must stay type-compatible.

import type { CoreRoleKey } from "@/core/permissions/catalog"

export type PluginPermissionKey = `plugin.${string}.${string}`

export type WinningOSPluginManifest = {
  /** Stable snake_case id. Never changes after first release. */
  id: string
  /** Human display name. */
  name: string
  /** Plugin semver. */
  version: string
  /** Compatibility level this plugin was built and verified against. */
  compatibility: "core-v0"
  /** Every permission the plugin registers. Format: plugin.{id}.{action}. */
  permissions: {
    key: PluginPermissionKey
    name: string
    description: string
    /** Default role grants seeded by the plugin's migration. */
    defaultRoles: CoreRoleKey[]
  }[]
  /** Navigation entries Core MAY render (Core decides placement/order). */
  navigation: {
    label: string
    /** Path under the plugin host: /p/{id}{path}. Use "" for the root. */
    path: string
    /** lucide-react icon name; Core resolves it, falls back to a generic icon. */
    icon: string
    /** Permission required to see the entry. */
    permission: PluginPermissionKey
  }[]
  /** Route table: path under /p/{id} → React component (server or client). */
  routes: Record<string, React.ComponentType>
  /** Optional Settings → Plugins panel. */
  settings?: {
    label: string
    permission: PluginPermissionKey
    component: React.ComponentType
  }
  /** Every table the plugin owns. Must match db/migrations exactly. */
  tables: `plugin_${string}`[]
  /**
   * Tables this plugin exposes as its stable interface. Other plugins may
   * read and foreign-key ONLY these. Schema changes to public tables are
   * breaking (major version). Omit/empty = nothing shared.
   */
  publicTables?: `plugin_${string}`[]
  /**
   * Plugins this plugin builds on. Dependencies must be installed first,
   * uninstalled after, and expose what this plugin uses via publicTables.
   */
  dependsOn?: { pluginId: string; minVersion: string }[]
}

// Mirrors the database constraint from migration 20260704200000: the only
// permission-key shape a plugin may register. Unknown or malformed keys deny.
const PLUGIN_PERMISSION_KEY_PATTERN = /^plugin\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/

export function isPluginPermissionKey(value: string): value is PluginPermissionKey {
  return PLUGIN_PERMISSION_KEY_PATTERN.test(value)
}
