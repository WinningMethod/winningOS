import { createHash, timingSafeEqual } from "node:crypto"
import type { WinningOSPluginManifest } from "./manifest"

/** Generic machine boundary. Removed plugins never reach their engine or env. */
export async function dispatchPluginJob(
  plugins: readonly WinningOSPluginManifest[],
  pluginId: string,
  jobId: string,
  authorization: string | null,
  env: Record<string, string | undefined>,
): Promise<Response> {
  const plugin = plugins.find(item => item.id === pluginId)
  const job = plugin?.jobs && Object.hasOwn(plugin.jobs, jobId) ? plugin.jobs[jobId] : undefined
  if (!job) return new Response(null, { status: 404 })
  // Validate namespace at runtime too, even if an operator skipped validation.
  if (!job.secretEnv.startsWith(`PLUGIN_${pluginId.toUpperCase()}_`)) return new Response(null, { status: 503 })
  const secret = env[job.secretEnv]
  if (!secret) return new Response(null, { status: 503 })
  if (!authorization || authorization.length > 4096) return new Response(null, { status: 401 })
  const digest = (value: string) => createHash("sha256").update(value).digest()
  if (!timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))) return new Response(null, { status: 401 })
  try {
    await job.run()
    return new Response(null, { status: 204 })
  } catch {
    // Raw provider errors can contain credentials. The engine owns safe logs.
    console.error("plugin-job-failed", { pluginId, jobId })
    return new Response(null, { status: 500 })
  }
}
