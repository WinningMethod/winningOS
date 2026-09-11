"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react"
import { useDraftGuard } from "./use-draft-guard"

export type FormActionResult = { status: "saved" | "error"; message: string; code?: string; href?: string; linkLabel?: string }

/** Server-rendered fields can opt into recoverable saves without moving their
 * data or authorization into the client. Success never changes page families. */
export function ActionForm({ action, label, children, id, className, fieldsClassName, confirmMessage, resetLabel, guardDraft = true }: {
  action: (formData: FormData) => Promise<FormActionResult>
  label: string; children: ReactNode; id?: string; className?: string; fieldsClassName?: string
  confirmMessage?: string; resetLabel?: string; guardDraft?: boolean
}) {
  const router = useRouter()
  const form = useRef<HTMLFormElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const manualReset = useRef(false)
  const [dirty, setDirty] = useState(false)
  const [visible, setVisible] = useState(false)
  const [state, submit, pending] = useActionState(async (_: FormActionResult | null, data: FormData) => {
    try { return await action(data) }
    catch { return { status: "error" as const, message: "The save could not be confirmed. Your draft is still here. Check the current records before retrying." } }
  }, null)
  useDraftGuard(guardDraft && dirty)
  useEffect(() => {
    if (!state) return
    setVisible(true)
    if (state.status === "saved") {
      setDirty(false)
      // Keep the current page and its other drafts mounted. Fixed server-built
      // query context updates the refreshed list and any page-level notice.
      if (state.href?.startsWith("/") && !state.href.startsWith("//")) {
        const destination = new URL(state.href, window.location.origin)
        if (destination.origin === window.location.origin && destination.pathname === window.location.pathname) window.history.replaceState(null, "", destination.pathname + destination.search + destination.hash)
      }
      router.refresh()
    }
  }, [state, router])
  useEffect(() => { if (state && visible) feedback.current?.focus() }, [state, visible])
  const completed = visible && state?.status === "saved" && Boolean(resetLabel)
  return <form ref={form} id={id} action={submit} aria-label={label} className={className}
    onChange={() => { setDirty(true); if (state?.status === "saved") setVisible(false) }}
    onSubmit={event => { if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault() }}
    onResetCapture={event => { if (!manualReset.current) event.preventDefault() }}>
    <fieldset disabled={pending} hidden={completed} className={`min-w-0 ${fieldsClassName ?? "space-y-4"}`}>{children}</fieldset>
    {pending ? <p role="status" className="mt-3 text-sm text-muted-foreground">Saving…</p> : null}
    {state && visible ? <div ref={feedback} role={state.status === "error" ? "alert" : "status"} tabIndex={-1} className={`mt-3 rounded-lg border p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${state.status === "error" ? "border-destructive" : "border-border bg-muted/30"}`}>
      <p>{state.message}</p>
      {state.status === "saved" ? <div className="flex flex-wrap gap-x-4 gap-y-1">{state.href && state.linkLabel ? <Link href={state.href} className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">{state.linkLabel}</Link> : null}{resetLabel ? <button type="button" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline" onClick={() => {
        manualReset.current = true; form.current?.reset(); manualReset.current = false
        setVisible(false); setDirty(false)
        window.requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea')?.focus())
      }}>{resetLabel}</button> : null}</div> : null}
    </div> : null}
  </form>
}
