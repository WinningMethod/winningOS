"use client"

import { useLinkStatus } from "next/link"
import { LoaderCircle } from "lucide-react"

export function NavigationPending() {
  const { pending } = useLinkStatus()
  return pending ? <span className="ml-auto inline-flex shrink-0" role="status"><LoaderCircle aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /><span className="sr-only">Opening page…</span></span> : null
}
