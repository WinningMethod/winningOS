import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/app/page-header"

export type PageSkeletonLayout = "overview" | "list" | "settings" | "docs"

function Rows() {
  return <div className="divide-y divide-border">{[0, 1, 2, 3, 4].map(row => (
    <div key={row} className="flex items-center gap-4 py-5">
      <Skeleton className="h-9 w-9 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-2/3" /></div>
      <Skeleton className="hidden h-6 w-16 sm:block" />
    </div>
  ))}</div>
}

/** No data, requests, fake records, or focusable controls in page fallbacks. */
export function PageSkeleton({ layout = "list" }: { layout?: PageSkeletonLayout }) {
  return <PageContainer>
    <div role="status" aria-label="Loading page" data-page-skeleton={layout}>
      <span className="sr-only">Loading page…</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="space-y-3 border-b border-border pb-5">
          <Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-full max-w-lg" />
        </div>
        {layout === "overview" && <div className="grid gap-4 sm:grid-cols-3">{[0,1,2].map(i => <div key={i} className="space-y-4 rounded-lg border border-border bg-card p-5"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-2/3" /></div>)}</div>}
        {layout === "settings" ? <>
          <div className="flex gap-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-9 w-24" />)}</div>
          <div className="space-y-7 rounded-lg border border-border bg-card p-5 sm:p-6">
            <Skeleton className="h-5 w-40" />
            {[0,1,2].map(i => <div key={i} className="max-w-xl space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-10 w-full" /></div>)}
            <Skeleton className="h-9 w-28" />
          </div>
        </> : layout === "docs" ? <>
          <div className="flex gap-3"><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-28" /></div>
          <div className="grid gap-8 lg:grid-cols-[235px_minmax(0,1fr)]">
            <div className="space-y-4"><Skeleton className="h-10 w-full" />{[0,1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            <div className="space-y-6 rounded-lg border border-border bg-card p-6"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-24 w-full" /><Skeleton className="h-4 w-3/4" /></div>
          </div>
        </> : <div className="rounded-lg border border-border bg-card p-5 sm:p-6"><Skeleton className="mb-2 h-9 w-full max-w-sm" /><Rows /></div>}
      </div>
    </div>
  </PageContainer>
}

export function AuthSkeleton() {
  return <div role="status" aria-label="Loading sign-in page" className="mx-auto w-full max-w-md space-y-7 p-6">
    <span className="sr-only">Loading sign-in page…</span>
    <Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-10 w-28" />
  </div>
}
