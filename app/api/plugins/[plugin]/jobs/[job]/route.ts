import { getInstalledPlugins } from "@/core/plugins/registry"
import { dispatchPluginJob } from "@/core/plugins/job-dispatch"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

// External schedulers POST with a plugin-scoped bearer secret. No cookies,
// redirects, caller payloads, provider details, or automatic retries.
export async function POST(request: Request, context: { params: Promise<{ plugin: string; job: string }> }) {
  const { plugin, job } = await context.params
  return dispatchPluginJob(getInstalledPlugins(), plugin, job, request.headers.get("authorization"), process.env)
}
