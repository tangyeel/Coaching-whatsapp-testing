import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTemplateParameters, dispatchWhatsAppMessage } from "@/lib/whatsapp";
import { normalizePhone } from "@/lib/utils";

export async function POST(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { template_key, recipients, custom_token, custom_phone_id, custom_template_name } = body;

  if (!template_key || !Array.isArray(recipients) || recipients.length === 0) {
    return Response.json({ error: "template_key and recipients array are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve WhatsApp credentials: request override -> institute settings
  const whatsappToken = (custom_token || auth.institute?.whatsapp_token || "").trim();
  const phoneNumberId = (custom_phone_id || auth.institute?.phone_number_id || "").trim();
  const templateName = (custom_template_name || template_key).trim();
  const schoolName = auth.institute?.name || "School Portal";

  if (!whatsappToken || !phoneNumberId) {
    return Response.json({
      error: "WhatsApp credentials not configured for this institute. Please update Institute Settings.",
    }, { status: 400 });
  }

  // 1. Create message_jobs record
  const { data: job, error: jobErr } = await admin
    .from("message_jobs")
    .insert([
      {
        institute_id: auth.instituteId,
        template_key,
        status: "processing",
        total_count: recipients.length,
        created_by: auth.user.id,
      },
    ])
    .select()
    .single();

  if (jobErr) return Response.json({ error: jobErr.message }, { status: 500 });

  // 2. Iterate recipients, record message_recipients, and dispatch with idempotency
  let successCount = 0;
  let failedCount = 0;
  const dispatchResults = [];

  for (let i = 0; i < recipients.length; i++) {
    const item = recipients[i];
    const phone = normalizePhone(item.phone || item.guardian_phone);
    const studentId = item.student_id || item.id || null;
    const idempotencyKey = `${job.id}:${studentId || i}:${phone}:${Date.now()}`;

    if (!phone) {
      failedCount++;
      dispatchResults.push({ phone: item.phone, success: false, error: "Missing or invalid phone" });
      continue;
    }

    const templateParams = formatTemplateParameters(template_key, item, schoolName);

    // Save initial recipient state
    const { data: recipientRecord, error: recInsertErr } = await admin
      .from("message_recipients")
      .insert([
        {
          job_id: job.id,
          student_id: studentId && !String(studentId).startsWith("new-") ? studentId : null,
          phone,
          payload_snapshot: item,
          idempotency_key: idempotencyKey,
          status: "queued",
        },
      ])
      .select()
      .single();

    try {
      const res = await dispatchWhatsAppMessage({
        phoneNumberId,
        accessToken: whatsappToken,
        recipientPhone: phone,
        templateName,
        parameters: templateParams,
      });

      successCount++;
      dispatchResults.push({ phone, success: true, messageId: res.messageId });

      if (recipientRecord) {
        await admin
          .from("message_recipients")
          .update({
            status: "sent",
            provider_message_id: res.messageId,
            sent_at: new Date().toISOString(),
          })
          .eq("id", recipientRecord.id);
      }
    } catch (err) {
      failedCount++;
      dispatchResults.push({ phone, success: false, error: err.message });

      if (recipientRecord) {
        await admin
          .from("message_recipients")
          .update({
            status: "failed",
            error_message: err.message,
          })
          .eq("id", recipientRecord.id);
      }
    }

    // Small pacing pause between messages to stay comfortably within Meta rate limits
    if (recipients.length > 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // 3. Finalize job status
  await admin
    .from("message_jobs")
    .update({
      status: failedCount === 0 ? "completed" : successCount === 0 ? "failed" : "completed",
      success_count: successCount,
      failed_count: failedCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  return Response.json({
    success: true,
    job_id: job.id,
    total: recipients.length,
    successCount,
    failedCount,
    results: dispatchResults,
  });
}
