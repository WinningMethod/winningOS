import { redirect } from "next/navigation"
import { AppShell } from "@/components/app/app-shell"
import { ensureCoreSession } from "@/core/auth/bootstrap"
import { getCoreBrandTheme } from "@/core/branding/theme"
import { getNavLayoutForCurrentUser } from "@/core/nav/data"
import { getPluginNavItems } from "@/core/plugins/navigation"
import { coreNavItems, toSidebarNavItems } from "@/lib/navigation"

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await ensureCoreSession()

  if (session.status === "unauthenticated") {
    redirect("/sign-in")
  }

  if (!session.hasActiveMembership) {
    redirect("/pending-access")
  }

  const [brand, pluginNavItems, navLayout] = await Promise.all([
    getCoreBrandTheme(),
    getPluginNavItems(session.membership?.roleKey ?? null),
    getNavLayoutForCurrentUser(),
  ])

  return (
    <AppShell
      workspaceName={session.workspace?.name ?? "WinningOS"}
      brandLogoUrl={brand.logoUrl}
      brandName={brand.brandName}
      profileName={session.profile?.displayName ?? "Core user"}
      profileEmail={session.user?.email ?? null}
      roleKey={session.membership?.roleKey ?? "member"}
      navItems={toSidebarNavItems(coreNavItems, pluginNavItems)}
      navLayout={navLayout}
    >
      {children}
    </AppShell>
  )
}
