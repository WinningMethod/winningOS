import "server-only"

import { ensureCoreSession } from "@/core/auth/bootstrap"
import { createServiceRoleClient } from "@/core/supabase/service-role"

export type CoreAuditEventInput = {
  /** Dot-namespaced action, e.g. "member.invited". */
  action: string
  subjectType?: string
  subjectId?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Best-effort audit append for app-layer flows that act through the service
 * role (invites) or through RPCs that predate server-side audit writes.
 * Audit is observability, not enforcement — this never throws, so a logging
 * failure can't break the action being recorded. The settings RPCs write
 * their own audit rows server-side and don't use this helper.
 */
export async function logCoreAuditEvent(input: CoreAuditEventInput): Promise<void> {
  try {
    const session = await ensureCoreSession()

    if (!session.workspace?.id) {
      console.warn("Skipped Core audit event without workspace context", { action: input.action })
      return
    }

    const admin = createServiceRoleClient()
    const { error } = await admin.from("core_audit_events").insert({
      workspace_id: session.workspace.id,
      actor_profile_id: session.profile?.id ?? null,
      action: input.action,
      subject_type: input.subjectType ?? null,
      subject_id: input.subjectId ?? null,
      metadata: input.metadata ?? {},
    })

    if (error) {
      console.warn("Failed to append Core audit event", { action: input.action, code: error.code })
    }
  } catch (error) {
    console.warn("Failed to append Core audit event", {
      action: input.action,
      message: error instanceof Error ? error.message : "unknown",
    })
  }
}
