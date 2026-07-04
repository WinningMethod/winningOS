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
// — the same "UI is never the boundary" rule Core pages follow. Route
// components receive no props by contract; client components read dynamic
// `[param]` values from useParams().segments.

export default async function PluginHostPage({
  params,
}: {
  params: Promise<{ plugin: string; segments?: string[] }>
}) {
  const { plugin, segments } = await params
  const manifest = findInstalledPlugin(plugin)

  if (!manifest) {
    notFound()
  }

  const PluginRoute = matchPluginRoute(manifest, segments ?? [])

  if (!PluginRoute) {
    notFound()
  }

  return <PluginRoute />
}
