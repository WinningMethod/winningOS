"use client"

/**
 * Form wrapper that asks "Are you sure?" before submitting a destructive
 * server action (issue #61). Uses the native confirm dialog — no dependencies,
 * works with progressive enhancement (without JS the form submits directly,
 * which matches the pre-#61 behavior rather than blocking the action).
 */
export function ConfirmForm({
  action,
  confirmMessage,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>
  confirmMessage: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault()
        }
      }}
    >
      {children}
    </form>
  )
}
