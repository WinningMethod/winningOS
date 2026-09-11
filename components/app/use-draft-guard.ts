"use client"
import { useEffect } from "react"

const approvedNavigations = new WeakSet<MouseEvent>()

/** Protect a changed form draft during both full-page and client navigation. */
export function useDraftGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    const navigate = (event: MouseEvent) => {
      if (approvedNavigations.has(event) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return
      const next = new URL(link.href)
      if (next.origin !== window.location.origin || (next.pathname === window.location.pathname && next.search === window.location.search)) return
      if (!window.confirm("Discard your unsaved changes?")) { event.preventDefault(); event.stopImmediatePropagation() } else approvedNavigations.add(event)
    }
    window.addEventListener("beforeunload", unload)
    document.addEventListener("click", navigate, true)
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true) }
  }, [dirty])
}
