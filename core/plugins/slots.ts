import "server-only"

import { ensureCoreSession } from "@/core/auth/bootstrap"
import { getModulesForSlot, type PluginSlotModule } from "./registry"
import { roleHasPluginPermission } from "./permissions"

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

  const roleKey = session.membership?.roleKey
  const allowed = await Promise.all(
    modules.map((module) => roleHasPluginPermission(roleKey, module.permission)),
  )

  return modules.filter((_, index) => allowed[index])
}
