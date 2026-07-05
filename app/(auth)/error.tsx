"use client"

// Auth-surface error boundary. Production masks server error messages, so
// this can only guide, not diagnose — the auth layout's env preflight catches
// missing variables before they get here; a crash that still lands here on a
// fresh deployment usually means malformed env values, an unreachable or
// paused Supabase project, or migrations that were never applied.
export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">WinningOS Core</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">Sign-in couldn&apos;t load</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Something failed on the server. If this deployment was just set up, the usual causes are Supabase
          environment variables with malformed values (paste raw values, no quotes), a paused or unreachable
          Supabase project, or database migrations that were never applied. The troubleshooting table in{" "}
          <code className="font-mono text-xs">DEPLOYMENT.md</code> covers each case.
        </p>
        {error.digest && <p className="mt-3 text-xs text-muted-foreground">Error reference: {error.digest}</p>}
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
