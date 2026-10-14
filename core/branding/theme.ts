import "server-only"

import { cache } from "react"
import { createServiceRoleClient } from "@/core/supabase/service-role"
import { foregroundFor } from "./color"

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/

export type CoreBrandTheme = {
  primary: string | null
  secondary: string | null
  tertiary: string | null
  /** Uploaded/linked workspace logo (https only), for the brand mark (#56). */
  logoUrl: string | null
  brandName: string | null
}

const EMPTY_THEME: CoreBrandTheme = {
  primary: null,
  secondary: null,
  tertiary: null,
  logoUrl: null,
  brandName: null,
}

function safeColor(value: unknown): string | null {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value) ? value : null
}

function safeLogoUrl(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://") && value.length <= 2048 ? value : null
}

/**
 * Brand identity for the whole deployment (issues #50/#56): theme colors plus
 * the logo and brand name. Read with the service role because it also styles
 * unauthenticated surfaces (entry page, sign-in); branding is not secret.
 * Wrapped in React cache() so a request renders with one read, and degrades
 * to defaults on any failure so a database hiccup can never blank the app.
 */
export const getCoreBrandTheme = cache(async (): Promise<CoreBrandTheme> => {
  try {
    const supabase = createServiceRoleClient()
    // The single active workspace — never resolve by slug, it is owner-editable (#52).
    const { data: workspace, error: workspaceError } = await supabase
      .from("core_workspaces")
      .select("id, branding:core_brand_settings(brand_name, logo_url, theme_json)")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string; branding: { brand_name: string; logo_url: string | null; theme_json: Record<string, unknown> | null } | null }>()

    if (workspaceError || !workspace?.id) {
      return EMPTY_THEME
    }

    const brand = workspace.branding
    if (!brand) return EMPTY_THEME

    const theme = (brand?.theme_json ?? {}) as Record<string, unknown>
    const brandName = typeof brand?.brand_name === "string" && brand.brand_name.trim()
      ? brand.brand_name.trim()
      : null

    return {
      primary: safeColor(theme.primary_color),
      secondary: safeColor(theme.secondary_color),
      tertiary: safeColor(theme.tertiary_color),
      logoUrl: safeLogoUrl(brand?.logo_url),
      brandName,
    }
  } catch {
    return EMPTY_THEME
  }
})

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
