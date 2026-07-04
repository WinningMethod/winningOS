import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { brandThemeCss, getCoreBrandTheme } from "@/core/branding/theme"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "WinningOS Core",
  description:
    "WinningOS Core — a workspace-first framework for custom company operating systems. Static wireframe.",
  applicationName: "WinningOS Core",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#16181d" },
  ],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Workspace brand colors override the default design tokens everywhere,
  // including auth pages (issue #50). brandThemeCss only ever emits values
  // that re-validated as #rrggbb hex.
  const brandCss = brandThemeCss(await getCoreBrandTheme())

  return (
    <html lang="en" suppressHydrationWarning className="bg-background">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {brandCss ? <style id="core-brand-theme">{brandCss}</style> : null}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
