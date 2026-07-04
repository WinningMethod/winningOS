import { BrandMark } from "@/components/app/brand-mark"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { getCoreBrandTheme } from "@/core/branding/theme"

export default async function AuthGroupLayout({ children }: { children: React.ReactNode }) {
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
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  )
}
