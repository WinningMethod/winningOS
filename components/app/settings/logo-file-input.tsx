"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]

/**
 * Logo file input with client-side size/type validation (issue #57): an
 * oversized file used to travel all the way into the server action and blow
 * past the request body limit, crashing to the error boundary instead of a
 * friendly message. Invalid selections are cleared here before they can be
 * submitted; the server action re-validates regardless.
 */
export function LogoFileInput({ disabled }: { disabled: boolean }) {
  const [fileError, setFileError] = useState<string | null>(null)

  return (
    <>
      <Input
        id="brand-logo-file"
        name="logoFile"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        aria-describedby="brand-logo-hint"
        aria-invalid={fileError ? true : undefined}
        disabled={disabled}
        className="h-auto py-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-secondary-foreground"
        onChange={(event) => {
          const input = event.currentTarget
          const file = input.files?.[0]

          if (!file) {
            setFileError(null)
            return
          }

          if (file.size > MAX_LOGO_BYTES) {
            input.value = ""
            setFileError("That file is larger than 2 MB. Choose a smaller image.")
            return
          }

          if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
            input.value = ""
            setFileError("That file type is not supported. Use SVG, PNG, JPEG, or WebP.")
            return
          }

          setFileError(null)
        }}
      />
      {fileError && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {fileError}
        </p>
      )}
    </>
  )
}
