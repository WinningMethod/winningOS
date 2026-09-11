"use client"
import { useId, useState, type ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"

/** Keep secondary filters reachable without pushing records below the fold. */
export function FilterOptions({ children, activeCount = 0 }: { children: ReactNode; activeCount?: number }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <div className="contents"><button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} className="order-1 inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg border border-input px-3 text-sm font-medium xl:hidden"><SlidersHorizontal aria-hidden="true" className="h-4 w-4" />Filters{activeCount ? <span className="rounded bg-primary/10 px-1.5 text-xs text-primary">{activeCount}</span> : null}</button><div id={id} className={`${open ? "contents" : "hidden xl:contents"} [&>*]:order-2 xl:[&>*]:order-none`}>{children}</div></div>
}
