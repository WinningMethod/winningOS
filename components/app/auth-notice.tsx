import type { AuthErrorMessage } from "@/core/auth/errors"

/** Error banner for auth pages, fed by the shared auth error vocabulary. */
export function AuthErrorNotice({ error }: { error: AuthErrorMessage | null }) {
  if (!error) {
    return null
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      <p className="font-medium">{error.title}</p>
      <p className="mt-1">{error.message}</p>
    </div>
  )
}

/** Success/status banner for auth pages. */
export function AuthStatusNotice({ title, message }: { title: string; message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground"
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  )
}
