"use client"
import { useEffect, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

/** URL-selected record preview. Native dialog provides focus trapping and Escape. */
export function DetailDrawer({ title, closeHref, children }: { title: string; closeHref: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const router = useRouter()
  useEffect(() => { dialog.current?.showModal() }, [])
  const close = () => {
    dialog.current?.close()
    router.replace(closeHref, { scroll: false })
  }
  return <dialog ref={dialog} aria-label={title} onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === event.currentTarget) close() }} className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-lg overflow-y-auto overscroll-contain border-0 border-l border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/35">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-5 pb-3 pt-[max(.75rem,env(safe-area-inset-top))]"><h2 className="min-w-0 break-words text-sm font-semibold">{title}</h2><button type="button" onClick={close} aria-label="Close preview" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted"><X className="h-5 w-5" aria-hidden="true" /></button></div>
    <div className="px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
  </dialog>
}
