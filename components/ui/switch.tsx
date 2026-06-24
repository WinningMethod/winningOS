"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export function Switch({
  defaultChecked = false,
  label,
  disabled,
}: {
  defaultChecked?: boolean
  label: string
  disabled?: boolean
}) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => setChecked((v) => !v)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-1",
        )}
      />
    </button>
  )
}
