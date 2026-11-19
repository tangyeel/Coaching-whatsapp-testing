import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWithRetry, formatTemplateParameters } from "@/lib/whatsapp";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!authContext.isInstituteAdmin && !authContext.isGlobalAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { batch_id, subject, message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: "Announcement message cannot be empty" }, { status: 400 });
    }

    const admin = createAdminClient();
    const instituteId = authContext.profile?.institute_id;

    // Fetch institute credentials & quota
    const { data: inst, error: instErr } = await admin
      .from("institutes")
      .select("*, plan_defaults(msg_limit)")
      .eq("id", instituteId)
      .single();

    if (instErr || !inst) {
      return NextResponse.json({ success: false, error: "Institute record not found" }, { status: 404 });
    }

    if (!inst.whatsapp_token || !inst.phone_number_id) {
      return NextResponse.json({
        success: false,
        error: "WhatsApp API is not configured. Please contact platform admin.",
      }, { status: 400 });
    }

    // Fetch target active students
    let studentQuery = admin
      .from("students")
      .select("id, full_name, guardian_phone, student_phone, batch_id, batches(name)")
      .eq("institute_id", instituteId)
      .is("deleted_at", null)
      .eq("is_active", true);

    if (batch_id) {
      studentQuery = studentQuery.eq("batch_id", batch_id);
    }

    const { data: students, error: studErr } = await studentQuery;
    if (studErr) {
      return NextResponse.json({ success: false, error: studErr.message }, { status: 500 });
    }

    const validRecipients = (students || []).filter(
      (s) => (s.guardian_phone || s.student_phone)?.replace(/\D/g, "").length >= 10
    );

    if (validRecipients.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No active students with valid phone numbers found for the selected batch.",
      }, { status: 400 });
    }

    // Check quota limits
    const limit = inst.msg_limit_override !== null && inst.msg_limit_override !== undefined
      ? inst.msg_limit_override
      : (inst.plan_defaults?.msg_limit || 500);

    const used = inst.messages_sent_this_month || 0;
    if (limit > 0 && used + validRecipients.length > limit) {
      return NextResponse.json({
        success: false,
        error: `Insufficient quota. This broadcast requires ${validRecipients.length} messages, but you only have ${Math.max(0, limit - used)} remaining this month.`,
        limit,
        used,
        required: validRecipients.length,
      }, { status: 403 });
    }

    // Record broadcast intent
    const { data: broadcastRecord } = await admin
      .from("broadcasts")
      .insert({
        institute_id: instituteId,
        created_by: authContext.profile.id,
        batch_id: batch_id || null,
        subject: (subject || "General Announcement").trim(),
        body: message.trim(),
        status: "sending",
      })
      .select()
      .single();

    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    // Fan-out dispatches with pacing (150ms delay between dispatches to comply with Meta Cloud API pacing)
    for (const recipient of validRecipients) {
      const targetPhone = recipient.guardian_phone || recipient.student_phone;

      try {
        const params = formatTemplateParameters(
          "test_message",
          {
            institute_name: inst.name || "Coaching Institute",
            message_body: message.trim(),
            student_name: recipient.full_name,
          },
          inst.name
        );

        const dispatchResult = await dispatchWithRetry({
          phoneNumberId: inst.phone_number_id,
          accessToken: inst.whatsapp_token,
          recipientPhone: targetPhone,
          templateName: "test_message",
          parameters: params,
        });

        // Insert message job audit
        await admin.from("message_jobs").insert({
          institute_id: instituteId,
          recipient_phone: targetPhone,
          template_name: "test_message",
          status: "delivered",
          provider_message_id: dispatchResult.messageId || null,
        });

        sentCount++;
      } catch (sendErr) {
        failedCount++;
        errors.push({ phone: targetPhone, error: sendErr.message });

        await admin.from("message_jobs").insert({
          institute_id: instituteId,
          recipient_phone: targetPhone,
          template_name: "test_message",
          status: "failed",
          error_message: sendErr.message,
        });
      }

      // Small pacing pause
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    // Update broadcast record status
    if (broadcastRecord?.id) {
      await admin
        .from("broadcasts")
        .update({
          sent_count: sentCount,
          failed_count: failedCount,
          status: failedCount === validRecipients.length ? "failed" : "completed",
        })
        .eq("id", broadcastRecord.id);
    }

    // Increment institute quota
    if (sentCount > 0) {
      await admin
        .from("institutes")
        .update({
          messages_sent_this_month: used + sentCount,
        })
        .eq("id", instituteId);
    }

    // Record audit event
    await logAudit({
      institute_id: instituteId,
      actor_id: authContext.profile.id,
      actor_email: authContext.user.email,
      action: "broadcast.dispatched",
      entity_type: "broadcast",
      entity_id: broadcastRecord?.id || null,
      entity_name: subject || "Announcement",
      metadata: { sentCount, failedCount, total: validRecipients.length, batch_id },
    });

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalRecipients: validRecipients.length,
      errors: errors.slice(0, 5), // Return first 5 errors if any for diagnostics
    });
  } catch (err) {
    console.error("[Broadcast API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
