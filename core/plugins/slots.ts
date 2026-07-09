import "server-only"

import { createElement } from "react"

import { ensureCoreSession } from "@/core/auth/bootstrap"
import { SlotModuleBoundary } from "./module-boundary"
import { getModulesForSlot, type PluginSlotModule } from "./registry"
import { getPluginGrantsForRole } from "./permissions"

/**
 * Modules the CURRENT member may see in a slot: every installed contribution
 * targeting `{hostPluginId}:{slotId}`, filtered by each module's own
 * permission against the live grant map (ECOSYSTEM.md "Modules").
 *
 * Hosts call this from the server component that renders the slot and pass
 * each module its documented context, e.g.:
 *
 *   const modules = await resolveSlotModules("crm_b2b:company_detail_panels")
 *   ...
 *   {modules.map((m) => <m.component key={m.pluginId} context={{ companyId }} />)}
 *
 * An empty result is the normal case (no bridges installed) — hosts render
 * nothing, not an empty frame.
 *
 * Every returned component is wrapped in `SlotModuleBoundary`, so a module
 * that throws while rendering on the client degrades to a failure note
 * instead of crashing the host page. Server-side render errors are NOT
 * caught by boundaries — modules must degrade gracefully on their own.
 */
export async function resolveSlotModules(slotId: string): Promise<PluginSlotModule[]> {
  const modules = getModulesForSlot(slotId)

  if (modules.length === 0) {
    return []
  }

  const session = await ensureCoreSession()

  if (!session.hasActiveMembership) {
    return []
  }

  const grants = await getPluginGrantsForRole(session.membership?.roleKey ?? null)

  return modules
    .filter((module) => grants.has(module.permission))
    .map((module) => ({
      ...module,
      component: function BoundedSlotModule(props) {
        return createElement(
          SlotModuleBoundary,
          { pluginId: module.pluginId },
          createElement(module.component, props),
        )
      },
    }))
}
