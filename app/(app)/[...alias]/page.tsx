import { notFound } from "next/navigation"
import { pluginRouteAliases } from "@/config/plugin-routes"
import { getInstalledPlugins } from "@/core/plugins/registry"
import { resolvePluginAlias } from "@/core/plugins/aliases"

// This route inherits the same authenticated membership layout as /p/{plugin}.
export default async function PluginAliasPage({ params, searchParams }: {
  params: Promise<{ alias: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const match = resolvePluginAlias(getInstalledPlugins(), pluginRouteAliases, (await params).alias)
  if (!match) notFound()
  const Page = match.component as React.ComponentType<{
    params: Promise<Record<string, string>>
    searchParams: Promise<Record<string, string | string[] | undefined>>
  }>
  return <Page params={Promise.resolve(match.params)} searchParams={searchParams} />
}
