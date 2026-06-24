import { Lock, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function RestrictedState({
  permission,
  description,
}: {
  permission: string
  description?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
        <Lock className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-medium">Insufficient permission</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
          {description ?? "Your role does not grant access to this area."}{" "}
          Requires <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{permission}</code>.
        </p>
      </div>
    </div>
  )
}
