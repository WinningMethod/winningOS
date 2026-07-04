"use client"

import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

/**
 * One brand color row: a native color picker synced with a #rrggbb text field
 * (issue #54). The text input is the submitted form value so a blank field
 * still means "use the default token" — the picker can't represent "unset",
 * which is what the reset button is for.
 */
export function ColorField({
  id,
  name,
  label,
  token,
  value,
  fallback,
  placeholder,
  disabled,
}: {
  id: string
  name: string
  label: string
  token: string
  /** Saved color, or null when the default token is in use. */
  value: string | null
  /** Color shown in the picker while no valid value is set. */
  fallback: string
  placeholder: string
  disabled: boolean
}) {
  const [text, setText] = useState(value ?? "")

  // Sync when a save round-trips: the server redirect re-renders with a new
  // value prop (possibly normalized, e.g. lowercased) without remounting.
  useEffect(() => {
    setText(value ?? "")
  }, [value])

  const pickerValue = HEX_COLOR_PATTERN.test(text) ? text.toLowerCase() : fallback

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => setText(event.target.value)}
          aria-label={`${label} picker`}
          disabled={disabled}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Input
          id={id}
          name={name}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          pattern="#[0-9a-fA-F]{6}"
          title="#rrggbb hex value"
          aria-describedby="brand-colors-hint"
          className="w-32 font-mono text-xs"
          disabled={disabled}
        />
        {!disabled && text !== "" && (
          <button
            type="button"
            onClick={() => setText("")}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to default
          </button>
        )}
        <code className="ml-auto font-mono text-xs text-muted-foreground">{token}</code>
      </div>
    </div>
  )
}
