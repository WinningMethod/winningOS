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

/**
 * Props every slot module receives from its host (ECOSYSTEM.md "Modules").
 * The host documents each slot's context shape in its IMPLEMENTATION.md
 * (e.g. `{ companyId: string }` for a CRM company-page slot).
 */
export type PluginModuleProps = {
  context?: Record<string, unknown>
}

export type WinningOSPluginManifest = {
  /** Stable snake_case id. Never changes after first release. */
  id: string
  /** Human display name. */
  name: string
  /** Plugin semver. */
  version: string
  /** Compatibility level this plugin was built and verified against. */
  compatibility: "core-v0"
  /** Minimum Core release; new portability features require 0.2.0. */
  minCoreVersion?: string
  /** Explicit public code entrypoints, relative to the plugin folder. */
  publicApi?: string[]
  /** Authenticated machine entrypoints, dispatched only while installed. */
  jobs?: Record<string, PluginJob>
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
  /**
   * Roll this plugin's nav entries up under another plugin's primary (first
   * visible) nav entry instead of adding top-level sidebar entries of its own.
   * The idiom for Viewers and Bridges orbiting an owner App: the owner keeps
   * the single sidebar entry for the function, satellites appear as its
   * dropdown children. A hint, not a command — Core resolves it (chains
   * collapse to the root plugin; cycles, uninstalled targets, or targets with
   * no visible entries fall back to top-level entries so nothing disappears),
   * and members can still rearrange everything per-user.
   */
  navRollup?: {
    /** Installed plugin id whose primary nav entry hosts this plugin's entries. */
    into: string
  }
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
  /**
   * Named extension points this plugin's UI offers to other plugins
   * (ECOSYSTEM.md "Modules"). Contributors target `{this_plugin_id}:{slot id}`.
   * The host renders contributions via `resolveSlotModules` and documents each
   * slot's context shape in its IMPLEMENTATION.md.
   */
  slots?: {
    /** Slot name, lowercase snake_case, unique within this plugin. */
    id: string
    /** Where it renders and what context the host passes. */
    description: string
  }[]
  /**
   * Components this plugin mounts into other plugins' declared slots
   * (`{host_plugin_id}:{slot_id}`). A module renders only when the host is
   * installed, declares the slot, and the member holds `permission`. This is
   * how a Bridge surfaces joined data inside a host App/Viewer without either
   * side knowing the other's code.
   */
  modules?: {
    /** Target slot: `{host_plugin_id}:{slot_id}`. */
    slot: string
    /** Short heading the host may render above the module. */
    title: string
    component: React.ComponentType<PluginModuleProps>
    /** Permission gating the module — owned by THIS plugin, not the host. */
    permission: PluginPermissionKey
  }[]
}

// Mirrors the database constraint from migration 20260704200000: the only
// permission-key shape a plugin may register. Unknown or malformed keys deny.
const PLUGIN_PERMISSION_KEY_PATTERN = /^plugin\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/

export function isPluginPermissionKey(value: string): value is PluginPermissionKey {
  return PLUGIN_PERMISSION_KEY_PATTERN.test(value)
}

/** Jobs accept no caller-controlled payload. Interactive actions still use live grants. */
export type PluginJob = {
  /** Plugin-scoped server-only bearer secret, e.g. PLUGIN_MY_PLUGIN_CRON_SECRET. */
  secretEnv: string
  /** Bounded, idempotent engine; never assumes Core provides retries or locking. */
  run: () => Promise<void>
}

/** Deployment-owned aliases contain metadata only, never imported plugin code. */
export type PluginRouteAlias = {
  path: string
  pluginId: string
  route: string
}
