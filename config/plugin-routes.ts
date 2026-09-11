import type { PluginRouteAlias } from "@/core/plugins/manifest"

// Deployment-only presentation. In framework repos this always stays empty.
// Example: { path: "/sales/companies/[id]", pluginId: "crm", route: "/companies/[id]" }
// Aliases are dormant when their plugin is absent, including after source removal.
export const pluginRouteAliases: PluginRouteAlias[] = []
