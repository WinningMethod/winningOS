import { Puzzle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { getPluginGrantsForRole } from "@/core/plugins/permissions"
import { getInstalledPlugins } from "@/core/plugins/registry"

// Server component: the Settings → Plugins tab content. Rendered by the
// settings page and passed into the client SettingsTabs as a ReactNode so
// manifest settings panels (server components) never cross the client
// boundary as component references.
export async function PluginsSection() {
  const plugins = getInstalledPlugins()

  if (plugins.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No plugins installed</CardTitle>
          <CardDescription>
            This is a pristine Core instance. Plugins are installed in deployment repos (clones of Core): copy the
            plugin source into <code className="font-mono text-xs">plugins/&#123;plugin_id&#125;/</code>, add one line
            to <code className="font-mono text-xs">config/plugins.ts</code>, and install its migrations. See
            COMPATIBILITY.md for the full contract.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const session = await ensureCoreSession()
  const grants = await getPluginGrantsForRole(session.membership?.roleKey ?? null)

  return (
    <div className="flex flex-col gap-4">
      {plugins.map((plugin) => {
        const SettingsPanel =
          plugin.settings && grants.has(plugin.settings.permission) ? plugin.settings.component : null

        return (
          <Card key={plugin.id}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                  <Puzzle className="h-4 w-4" />
                </span>
                <CardTitle>{plugin.name}</CardTitle>
                <Badge tone="muted">v{plugin.version}</Badge>
                <Badge tone="neutral">{plugin.compatibility}</Badge>
              </div>
              <CardDescription>
                <code className="font-mono text-xs">{plugin.id}</code> — routes under{" "}
                <code className="font-mono text-xs">/p/{plugin.id}</code>
                {plugin.tables.length > 0 && (
                  <>
                    {" "}
                    · tables: <code className="font-mono text-xs">{plugin.tables.join(", ")}</code>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            {SettingsPanel && (
              <CardContent>
                <div className="rounded-md border border-border p-4">
                  <SettingsPanel />
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
