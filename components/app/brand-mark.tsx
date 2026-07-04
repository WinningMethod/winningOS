import { Hexagon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * The workspace brand mark (issue #56): the uploaded logo when one is set,
 * otherwise the default hexagon tile. Pure presentational — usable from both
 * server and client trees.
 */
export function BrandMark({
  logoUrl,
  className,
  iconClassName,
}: {
  logoUrl: string | null
  className?: string
  iconClassName?: string
}) {
  if (logoUrl) {
    return (
      <span className={cn("flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-border bg-background", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote logo host is workspace-configured, not build-time known */}
        <img src={logoUrl} alt="" aria-hidden="true" className="h-full w-full object-contain" />
      </span>
    )
  }

  return (
    <span className={cn("flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground", className)}>
      <Hexagon className={cn("h-4 w-4", iconClassName)} strokeWidth={2.5} />
    </span>
  )
}
