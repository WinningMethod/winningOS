import "server-only"

import { createClient } from "@/core/supabase/server"

export type CoreSessionStatus = "unauthenticated" | "ready" | "pending_access"

export type CoreSession = {
  status: CoreSessionStatus
  hasActiveMembership: boolean
  user: {
    id: string
    email: string | null
  } | null
  profile: {
    id: string
    displayName: string
  } | null
  workspace: {
    id: string
    name: string
  } | null
  membership: {
    id: string
    roleKey: string
  } | null
}

type BootstrapRow = {
  profile_id: string
  display_name: string | null
  workspace_id: string
  workspace_name: string
  membership_id: string | null
  role_key: string | null
  has_active_membership: boolean
}

function displayNameFromUser(email: string | null | undefined, metadata: Record<string, unknown> | undefined): string {
  const metadataName = metadata?.display_name ?? metadata?.name ?? metadata?.full_name

  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim().slice(0, 120)
  }

  if (email?.includes("@")) {
    return email.split("@")[0].slice(0, 120)
  }

  return "Core user"
}

export async function ensureCoreSession(): Promise<CoreSession> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // Invalid or revoked credentials are signed-out state, not an unavailable
  // auth service. This also lets the sign-in page recover stale browser cookies.
  const sessionMissing = userError?.name === "AuthSessionMissingError" || [
    "refresh_token_not_found",
    "refresh_token_already_used",
    "session_not_found",
    "session_expired",
    "user_not_found",
  ].includes(userError?.code ?? "")

  if (userError && !sessionMissing) {
    console.error("Failed to read Supabase user", userError)
    throw new Error("Session bootstrap failed")
  }

  if (sessionMissing || !user) {
    return {
      status: "unauthenticated",
      hasActiveMembership: false,
      user: null,
      profile: null,
      workspace: null,
      membership: null,
    }
  }

  const displayName = displayNameFromUser(user.email, user.user_metadata)
  const { data, error } = await supabase
    .rpc("core_bootstrap_current_user", { profile_display_name: displayName })
    .single<BootstrapRow>()

  if (error) {
    console.error("Failed to bootstrap Core session", error)
    throw new Error("Session bootstrap failed")
  }

  const hasActiveMembership = data.has_active_membership === true

  return {
    status: hasActiveMembership ? "ready" : "pending_access",
    hasActiveMembership,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    profile: {
      id: data.profile_id,
      displayName: data.display_name ?? displayName,
    },
    workspace: {
      id: data.workspace_id,
      name: data.workspace_name,
    },
    membership: data.membership_id && data.role_key
      ? {
          id: data.membership_id,
          roleKey: data.role_key,
        }
      : null,
  }
}
