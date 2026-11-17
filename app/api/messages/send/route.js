import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatTemplateParameters,
  dispatchWithRetry,
  WHATSAPP_BATCH_SIZE,
  WHATSAPP_CHUNK_DELAY_MS,
  sleep,
} from "@/lib/whatsapp";
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

  // 1. Fetch fresh institute record with plan quota
  const { data: institute, error: instErr } = await admin
    .from("institutes")
    .select("*, plan_defaults(*)")
    .eq("id", auth.instituteId)
    .single();

  if (instErr || !institute) {
    return Response.json({ error: "Institute record not found" }, { status: 404 });
  }

  // 2. Enforce monthly message quota
  const effectiveLimit = institute.msg_limit_override !== null && institute.msg_limit_override !== undefined
    ? institute.msg_limit_override
    : (institute.plan_defaults?.msg_limit || 500);

  const used = institute.messages_sent_this_month || 0;

  if (effectiveLimit > 0) {
    const remaining = effectiveLimit - used;
    if (remaining <= 0) {
      return Response.json({
        success: false,
        code: "QUOTA_EXCEEDED",
        error: `Monthly WhatsApp message limit reached (${used}/${effectiveLimit}). Contact your administrator to upgrade your plan.`,
        used,
        limit: effectiveLimit,
      }, { status: 403 });
    }

    if (recipients.length > remaining) {
      return Response.json({
        success: false,
        code: "QUOTA_PARTIAL",
        error: `You have ${remaining} message${remaining === 1 ? "" : "s"} remaining this month, but attempted to dispatch ${recipients.length}. Please reduce recipient batch size or upgrade your plan.`,
        remaining,
        attempted: recipients.length,
        limit: effectiveLimit,
      }, { status: 400 });
    }
  }

  // 3. Resolve WhatsApp credentials
  const whatsappToken = (custom_token || institute.whatsapp_token || "").trim();
  const phoneNumberId = (custom_phone_id || institute.phone_number_id || "").trim();
  const templateName = (custom_template_name || template_key).trim();
  const schoolName = institute.name || "School Portal";

  if (!whatsappToken || !phoneNumberId) {
    return Response.json({
      error: "WhatsApp credentials not configured for this institute. Contact your administrator.",
    }, { status: 400 });
  }

  // 4. Create message_jobs record
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

  // 5. Chunked dispatch with exponential backoff retry and rate-limiting
  let successCount = 0;
  let failedCount = 0;
  const dispatchResults = [];

  for (let c = 0; c < recipients.length; c += WHATSAPP_BATCH_SIZE) {
    const chunk = recipients.slice(c, c + WHATSAPP_BATCH_SIZE);

    const chunkPromises = chunk.map(async (item, chunkIndex) => {
      const globalIndex = c + chunkIndex;
      const phone = normalizePhone(item.phone || item.guardian_phone);
      const studentId = item.student_id || item.id || null;
      const idempotencyKey = `${job.id}:${studentId || globalIndex}:${phone}:${Date.now()}`;

      if (!phone) {
        failedCount++;
        dispatchResults.push({ phone: item.phone, success: false, error: "Missing or invalid phone" });
        return;
      }

      const templateParams = formatTemplateParameters(template_key, item, schoolName);

      const { data: recipientRecord } = await admin
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
        const res = await dispatchWithRetry({
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
    });

    await Promise.allSettled(chunkPromises);

    if (c + WHATSAPP_BATCH_SIZE < recipients.length) {
      await sleep(WHATSAPP_CHUNK_DELAY_MS);
    }
  }

  // 6. Finalize job status
  await admin
    .from("message_jobs")
    .update({
      status: failedCount === 0 ? "completed" : successCount === 0 ? "failed" : "completed",
      success_count: successCount,
      failed_count: failedCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  // 7. Atomically increment institute monthly usage counter
  if (successCount > 0) {
    await admin
      .from("institutes")
      .update({
        messages_sent_this_month: used + successCount,
      })
      .eq("id", auth.instituteId);
  }

  return Response.json({
    success: true,
    job_id: job.id,
    total: recipients.length,
    successCount,
    failedCount,
    usedThisMonth: used + successCount,
    effectiveLimit,
    results: dispatchResults,
  });
}
