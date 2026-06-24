import { cn } from "@/lib/utils"

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "muted"

const tones: Record<Tone, string> = {
  neutral: "border-border bg-secondary text-secondary-foreground",
  primary: "border-primary/30 bg-primary/10 text-primary",
  success:
    "border-[color-mix(in_oklch,var(--color-success)_35%,transparent)] bg-[color-mix(in_oklch,var(--color-success)_14%,transparent)] text-[var(--color-success)]",
  warning:
    "border-[color-mix(in_oklch,var(--color-warning)_35%,transparent)] bg-[color-mix(in_oklch,var(--color-warning)_14%,transparent)] text-[var(--color-warning)]",
  danger:
    "border-destructive/35 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted text-muted-foreground",
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
