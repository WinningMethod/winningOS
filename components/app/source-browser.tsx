"use client"
import { WorkspaceLink as Link } from "@/components/app/workspace-navigation"
import { useRouter } from "next/navigation"
import { useState, useTransition, type ReactNode } from "react"
import { Search } from "lucide-react"

type SourceItem = { key: string; name: string; description: string; href: string }

/** Select a source by URL; only the selected server panel is rendered. */
export function SourceBrowser({ label, items, selected, children, countLabel = label.toLowerCase() }: {
  label: string; items: SourceItem[]; selected: string; children: ReactNode; countLabel?: string
}) {
  const [query, setQuery] = useState("")
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const matches = items.filter(item => `${item.name} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
    <div className="lg:hidden"><label className="block text-xs font-medium text-muted-foreground">{label}<select aria-label={label} name="source" value={selected} aria-busy={pending} onChange={event => { const item = items.find(item => item.key === event.target.value); if (item) startTransition(() => router.push(item.href, { scroll: false })) }} className="mt-2 min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground">{!selected ? <option value="">Choose…</option> : null}{items.map(item => <option key={item.key} value={item.key}>{item.name} · {item.description}</option>)}</select></label>{pending ? <p role="status" className="mt-2 text-xs text-muted-foreground">Opening source…</p> : null}</div>
    <aside className="hidden self-start overflow-hidden rounded-xl border border-border bg-card lg:sticky lg:top-20 lg:block">
      <div className="border-b border-border p-3"><label className="relative block"><span className="sr-only">Find {label.toLowerCase()}</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input type="search" name="source-search" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" placeholder="Find a source…" className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" /></label><p className="mt-2 text-xs text-muted-foreground">{items.length} {countLabel}</p></div>
      <nav aria-label={label} className="max-h-[calc(100dvh-300px)] overflow-y-auto overscroll-contain p-2">{matches.map(item => <Link prefetch={false} key={item.key} href={item.href} scroll={false} style={{ contentVisibility: "auto", containIntrinsicSize: "auto 72px" }} aria-current={selected === item.key ? "page" : undefined} className={`flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-3 text-sm ${selected === item.key ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><span className="min-w-0 break-words"><span className="font-medium">{item.name}</span><span className="mt-1 block text-xs font-normal [overflow-wrap:anywhere]">{item.description}</span></span></Link>)}{!matches.length ? <p role="status" className="p-3 text-sm text-muted-foreground">No sources match. Try a name, ID or status.</p> : null}</nav>
    </aside>
    <div className="min-w-0">{children}</div>
  </div>
}
