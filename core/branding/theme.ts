import "server-only"

import { cache } from "react"
import { createServiceRoleClient } from "@/core/supabase/service-role"

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/

export type CoreBrandTheme = {
  primary: string | null
  secondary: string | null
  tertiary: string | null
}

const EMPTY_THEME: CoreBrandTheme = { primary: null, secondary: null, tertiary: null }

function safeColor(value: unknown): string | null {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value) ? value : null
}

/**
 * Brand colors for the whole deployment (issue #50). Read with the service
 * role because the theme also styles unauthenticated surfaces (entry page,
 * sign-in); brand colors are not secrets. Wrapped in React cache() so a
 * request renders with one read, and degrades to no overrides on any failure
 * so a database hiccup can never blank the app.
 */
export const getCoreBrandTheme = cache(async (): Promise<CoreBrandTheme> => {
  try {
    const supabase = createServiceRoleClient()
    const { data: workspace, error: workspaceError } = await supabase
      .from("core_workspaces")
      .select("id")
      .eq("slug", "winningos")
      .is("deleted_at", null)
      .maybeSingle()

    if (workspaceError || !workspace?.id) {
      return EMPTY_THEME
    }

    const { data: brand, error: brandError } = await supabase
      .from("core_brand_settings")
      .select("theme_json")
      .eq("workspace_id", workspace.id)
      .maybeSingle()

    if (brandError) {
      return EMPTY_THEME
    }

    const theme = (brand?.theme_json ?? {}) as Record<string, unknown>

    return {
      primary: safeColor(theme.primary_color),
      secondary: safeColor(theme.secondary_color),
      tertiary: safeColor(theme.tertiary_color),
    }
  } catch {
    return EMPTY_THEME
  }
})

/** Perceived luminance (0..1) of a #rrggbb color for foreground contrast. */
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function foregroundFor(hex: string): string {
  return luminance(hex) > 0.6 ? "#171717" : "#ffffff"
}

/**
 * CSS that overrides the design tokens in globals.css with the saved brand
 * colors: primary → --primary/--ring, secondary → --secondary, tertiary →
 * --accent. Foregrounds are chosen by luminance so text stays readable on any
 * brand color. Values are re-validated as #rrggbb before being emitted, so no
 * unvalidated string ever reaches the style tag. The same values apply in
 * light and dark mode (declared under both :root and .dark, emitted after the
 * global stylesheet so they win the cascade). Returns null when no brand
 * colors are set, leaving the default theme untouched.
 */
export function brandThemeCss(theme: CoreBrandTheme): string | null {
  const declarations: string[] = []

  if (theme.primary && HEX_COLOR_PATTERN.test(theme.primary)) {
    declarations.push(
      `--primary: ${theme.primary};`,
      `--primary-foreground: ${foregroundFor(theme.primary)};`,
      `--ring: ${theme.primary};`,
    )
  }

  if (theme.secondary && HEX_COLOR_PATTERN.test(theme.secondary)) {
    declarations.push(
      `--secondary: ${theme.secondary};`,
      `--secondary-foreground: ${foregroundFor(theme.secondary)};`,
    )
  }

  if (theme.tertiary && HEX_COLOR_PATTERN.test(theme.tertiary)) {
    declarations.push(
      `--accent: ${theme.tertiary};`,
      `--accent-foreground: ${foregroundFor(theme.tertiary)};`,
    )
  }

  if (declarations.length === 0) {
    return null
  }

  const block = declarations.join("\n  ")
  return `:root {\n  ${block}\n}\n.dark {\n  ${block}\n}`
}
