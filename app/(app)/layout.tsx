import { redirect } from "next/navigation"
import { AppShell } from "@/components/app/app-shell"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { getCoreBrandTheme } from "@/core/branding/theme"

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await ensureCoreSession()

  if (session.status === "unauthenticated") {
    redirect("/sign-in")
  }

  if (!session.hasActiveMembership) {
    redirect("/pending-access")
  }

  const brand = await getCoreBrandTheme()

  return (
    <AppShell
      workspaceName={session.workspace?.name ?? "WinningOS"}
      brandLogoUrl={brand.logoUrl}
      brandName={brand.brandName}
      profileName={session.profile?.displayName ?? "Core user"}
      profileEmail={session.user?.email ?? null}
      roleKey={session.membership?.roleKey ?? "member"}
    >
      {children}
    </AppShell>
  )
}
