import { notFound } from "next/navigation"
import { findInstalledPlugin, matchPluginRoute } from "@/core/plugins/registry"

// The plugin host route: every installed plugin's pages mount under
// /p/{plugin_id}, resolved from the manifest's route table (COMPATIBILITY.md).
// Unregistered ids and unmatched paths 404 — deleting a plugin's line from
// config/plugins.ts is disable-level removal, and this is where it takes
// effect for URLs.
//
// The (app) layout already enforced an authenticated active membership before
// this renders. Per-feature permission gating belongs to the plugin itself:
// its server data/actions check the live grant map and its tables enforce RLS
// — the same "UI is never the boundary" rule Core pages follow.
//
// Route components may optionally accept Next-style props: `params` resolves
// to the `[name]` bindings from the matched route key, `searchParams` is
// forwarded untouched. Components that declare no props simply ignore both.

export default async function PluginHostPage({
  params,
  searchParams,
}: {
  params: Promise<{ plugin: string; segments?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { plugin, segments } = await params
  const manifest = findInstalledPlugin(plugin)

  if (!manifest) {
    notFound()
  }

  const match = matchPluginRoute(manifest, segments ?? [])

  if (!match) {
    notFound()
  }

  // The manifest declares routes as prop-less ComponentType; the host widens
  // to offer the optional Next-style props. Components that don't declare
  // them ignore the extras — React passes props, never requires them.
  const PluginRoute = match.component as React.ComponentType<{
    params: Promise<Record<string, string>>
    searchParams: Promise<Record<string, string | string[] | undefined>>
  }>

  return <PluginRoute params={Promise.resolve(match.params)} searchParams={searchParams} />
}
