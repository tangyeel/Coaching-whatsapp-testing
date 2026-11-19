import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Safely log administrative and security actions into audit_logs.
 * Won't throw or disrupt parent API transaction if audit logging fails.
 */
export async function logAudit({
  institute_id,
  actor_id,
  actor_email,
  action,
  entity_type,
  entity_id,
  entity_name,
  metadata = {},
}) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      institute_id: institute_id || null,
      actor_id: actor_id || null,
      actor_email: actor_email || "system",
      action,
      entity_type: entity_type || null,
      entity_id: entity_id || null,
      entity_name: entity_name || null,
      metadata: metadata || {},
    });

    if (error) {
      console.warn("[Audit Log] Non-fatal insert warning:", error.message);
    }
  } catch (err) {
    console.warn("[Audit Log] Failed to record event:", err.message);
  }
}
