import { cn } from "@/lib/utils"

/** Decorative placeholder. The enclosing loading region supplies one status label. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded bg-primary/10 motion-safe:animate-pulse", className)} />
}
