"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createContext, useContext, useState, useTransition, type ComponentProps, type ReactNode } from "react"
import { PageSkeleton, type PageSkeletonLayout } from "@/components/app/page-skeleton"

const NavigationContext = createContext<{
  pending: boolean
  layout: PageSkeletonLayout
  navigate: (href: string, replace?: boolean, scroll?: boolean) => void
} | null>(null)

export function WorkspaceNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [layout, setLayout] = useState<PageSkeletonLayout>("list")
  function navigate(href: string, replace = false, scroll = true) {
    const path = new URL(href, window.location.href).pathname
    setLayout(path === "/home" ? "overview" : path === "/settings" ? "settings" : path === "/docs" ? "docs" : "list")
    startTransition(() => {
      if (replace) router.replace(href, { scroll })
      else router.push(href, { scroll })
    })
  }
  return <NavigationContext.Provider value={{ pending, layout, navigate }}>{children}</NavigationContext.Provider>
}

export function WorkspaceNavigationContent({ children }: { children: ReactNode }) {
  const navigation = useContext(NavigationContext)
  return <>
    {navigation?.pending && <PageSkeleton layout={navigation.layout} />}
    {/* Keep the router outlet mounted so it can finish or show its error boundary. */}
    <div hidden={navigation?.pending}>{children}</div>
  </>
}

/** Link semantics stay with Next: modified clicks, downloads and external URLs bypass onNavigate. */
export function WorkspaceLink({ href, onNavigate, replace, scroll, ...props }: ComponentProps<typeof Link>) {
  const navigation = useContext(NavigationContext)
  return <Link {...props} href={href} prefetch={false} replace={replace} scroll={scroll} onNavigate={event => {
    let cancelled = false
    onNavigate?.({ preventDefault() { cancelled = true; event.preventDefault() } })
    if (cancelled || !navigation || typeof href !== "string") return
    const target = new URL(href, window.location.href)
    // Same-page filters, Docs history changes and anchors keep their own behavior.
    if (target.origin !== window.location.origin || target.pathname === window.location.pathname) return
    event.preventDefault()
    navigation.navigate(href, replace, scroll)
  }} />
}
