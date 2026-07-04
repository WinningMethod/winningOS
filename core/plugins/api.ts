// The WinningOS Core Plugin API barrel — the ONLY Core import path sanctioned
// for plugin code (`@/core/plugins/api`, COMPATIBILITY.md "The Plugin API
// surface"). Everything else under `core/` is internal and may change without
// notice inside `core-v0`; plugins that import around this barrel are rejected
// in review, and `npm run plugins:validate` enforces it.
//
// This surface must stay type-compatible with the template repo's canonical
// stub (`core-stub/plugins/api.tsx` in WinningMethod/WinningTemplate): same
// export names, signatures plugin code written against the stub can rely on.
// Widening (extra props, extra variants) is fine; narrowing or renaming is a
// compatibility-level conversation.
//
// The barrel is server-first (`server-only`): plugin route components,
// server data modules, and server actions import it freely, but a
// `"use client"` module cannot — client components receive data and UI from
// their server parents. A client-safe split is a future compatibility-level
// addition if a plugin genuinely needs one.

import "server-only"

import { createElement, forwardRef } from "react"
import { Button as CoreButton, type ButtonProps as CoreButtonProps } from "@/components/ui/button"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { CoreRoleKey } from "@/core/permissions/catalog"
export type { PluginPermissionKey, WinningOSPluginManifest } from "@/core/plugins/manifest"
export type { CoreSession, CoreSessionStatus } from "@/core/auth/bootstrap"

// ---------------------------------------------------------------------------
// Session and permissions
// ---------------------------------------------------------------------------

export { ensureCoreSession } from "@/core/auth/bootstrap"
export { roleHasPluginPermission } from "@/core/plugins/permissions"

// ---------------------------------------------------------------------------
// Data access (Core Supabase conventions)
// ---------------------------------------------------------------------------

export { createClient } from "@/core/supabase/server"
export { createServiceRoleClient } from "@/core/supabase/service-role"
export { logCoreAuditEvent } from "@/core/audit/log"

// ---------------------------------------------------------------------------
// UI kit (Core's components/ui/* subset + page chrome)
// ---------------------------------------------------------------------------

export { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
export { Badge } from "@/components/ui/badge"
export { Input } from "@/components/ui/input"
export { Label } from "@/components/ui/label"
export { PageContainer, PageHeader } from "@/components/app/page-header"

// The stub declares size "default" (shadcn convention) where Core's Button
// uses "md" — the barrel accepts both so plugin code written against either
// spelling renders identically.
export type PluginApiButtonProps = Omit<CoreButtonProps, "size"> & {
  size?: "sm" | "md" | "default" | "lg" | "icon"
}

export const Button = forwardRef<HTMLButtonElement, PluginApiButtonProps>(
  function PluginApiButton({ size = "md", ...props }, ref) {
    return createElement(CoreButton, { ...props, ref, size: size === "default" ? "md" : size })
  },
)
