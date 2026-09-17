// Log only fixed endpoint labels and durations. Never log URLs, queries, headers,
// bodies, identities or credentials. Reads remain uncached and unmodified.
const endpoints = new Set([
  '/auth/v1/user', '/auth/v1/token', '/auth/v1/.well-known/jwks.json',
  '/rest/v1/rpc/core_bootstrap_current_user', '/rest/v1/rpc/core_list_workspace_members',
  '/rest/v1/rpc/core_access_directory', '/rest/v1/core_role_permissions',
  '/rest/v1/core_nav_preferences', '/rest/v1/core_workspaces', '/rest/v1/core_brand_settings', '/rest/v1/core_audit_events',
])
export const timedSupabaseFetch: typeof fetch = async (input, init) => {
  const path = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).pathname
  const start = performance.now()
  let status: number | undefined
  try {
    const response = await fetch(input, init)
    status = response.status
    return response
  } finally {
    if (endpoints.has(path)) console.info('[core-perf]', JSON.stringify({ endpoint: path, responseHeadersMs: Math.round(performance.now() - start), status: status ?? 'network-error' }))
  }
}
