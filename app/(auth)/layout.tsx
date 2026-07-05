import { BrandMark } from "@/components/app/brand-mark"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { getCoreBrandTheme } from "@/core/branding/theme"
import { publicSupabaseEnvProblems } from "@/core/supabase/env.public"

// Runtime env preflight: a fresh deployment without its Supabase variables
// would otherwise crash every auth page into the masked production error
// screen (AcmeCo issue #3). Variable names and problem shapes are safe to
// render; values never are.
function SetupNotice({ problems }: { problems: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Deployment setup</p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight">Not connected to Supabase yet</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        This deployment is missing required configuration. Fix the following in your hosting provider&apos;s
        environment variables, redeploy, and reload:
      </p>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm">
        {problems.map((problem) => (
          <li key={problem}>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{problem}</code>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        The full zero-to-live runbook is <code className="font-mono text-xs">DEPLOYMENT.md</code> in this repository.
      </p>
    </div>
  )
}

export default async function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  const envProblems = publicSupabaseEnvProblems()
  const brand = await getCoreBrandTheme()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-2.5">
          <BrandMark logoUrl={brand.logoUrl} />
          <span className="text-sm font-semibold tracking-tight">{brand.brandName ?? "WinningOS"}</span>
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Core
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{envProblems.length > 0 ? <SetupNotice problems={envProblems} /> : children}</div>
      </main>
    </div>
  )
}
