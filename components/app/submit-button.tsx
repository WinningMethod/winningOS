"use client"
import { useFormStatus } from "react-dom"
import { LoaderCircle } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"

export function SubmitButton({ children, pendingLabel = "Saving…", disabled, ...props }: Omit<ButtonProps, "type"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus()
  return <Button {...props} type="submit" disabled={disabled || pending} aria-busy={pending}>{pending ? <><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />{pendingLabel}</> : children}</Button>
}
