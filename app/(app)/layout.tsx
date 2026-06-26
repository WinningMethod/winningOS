import { redirect } from "next/navigation"
import { AppShell } from "@/components/app/app-shell"
import { ensureCoreSession } from "@/core/auth/bootstrap"

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await ensureCoreSession()

  if (session.status === "unauthenticated") {
    redirect("/sign-in")
  }

  if (!session.hasActiveMembership) {
    redirect("/pending-access")
  }

  return (
    <AppShell
      workspaceName={session.workspace?.name ?? "WinningOS"}
      profileName={session.profile?.displayName ?? "Core user"}
      profileEmail={session.user?.email ?? null}
      roleKey={session.membership?.roleKey ?? "member"}
    >
      {children}
    </AppShell>
  )
}
