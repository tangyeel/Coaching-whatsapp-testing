import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWithRetry, formatTemplateParameters } from "@/lib/whatsapp";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const keyParam = searchParams.get("key");

    if (cronSecret) {
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` || keyParam === cronSecret;
      if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const admin = createAdminClient();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const dPlus7 = new Date(today);
    dPlus7.setDate(today.getDate() + 7);
    const dPlus7Str = dPlus7.toISOString().split("T")[0];

    const dPlus2 = new Date(today);
    dPlus2.setDate(today.getDate() + 2);
    const dPlus2Str = dPlus2.toISOString().split("T")[0];

    // 1. Fetch institutes with active autopilot and valid credentials
    const { data: institutes, error: instErr } = await admin
      .from("institutes")
      .select("*, plan_defaults(*)")
      .eq("fee_reminder_autopilot", true)
      .eq("is_active", true)
      .not("whatsapp_token", "is", null)
      .not("phone_number_id", "is", null);

    if (instErr) throw instErr;

    let totalDispatched = 0;
    let totalSkippedQuota = 0;
    const instituteLogs = [];

    for (const inst of (institutes || [])) {
      // Calculate effective limit (0 = unlimited)
      const effectiveLimit = inst.msg_limit_override !== null && inst.msg_limit_override !== undefined
        ? inst.msg_limit_override
        : (inst.plan_defaults?.msg_limit || 500);

      let currentUsage = inst.messages_sent_this_month || 0;

      // 2. Fetch pending invoices for this institute
      const { data: invoices, error: invErr } = await admin
        .from("fee_invoices")
        .select("*, student:students(*)")
        .eq("institute_id", inst.id)
        .in("status", ["unpaid", "partial"])
        .or(`due_date.eq.${dPlus7Str},due_date.eq.${dPlus2Str},due_date.eq.${todayStr}`);

      if (invErr || !invoices || invoices.length === 0) continue;

      let instSent = 0;
      let instSkipped = 0;

      for (const inv of invoices) {
        if (!inv.student || !inv.student.guardian_phone) continue;

        // Determine which trigger matches
        let reminderType = null;
        if (inv.due_date === dPlus7Str && !inv.reminder_7d_sent) {
          reminderType = "7d";
        } else if (inv.due_date === dPlus2Str && !inv.reminder_2d_sent) {
          reminderType = "2d";
        } else if (inv.due_date === todayStr && !inv.reminder_due_sent) {
          reminderType = "due";
        }

        if (!reminderType) continue;

        // Quota check
        if (effectiveLimit > 0 && currentUsage >= effectiveLimit) {
          totalSkippedQuota++;
          instSkipped++;
          continue;
        }

        const balancePaise = Number(inv.amount_due) - Number(inv.amount_paid);
        const parentName = inv.student.guardian_name || inv.student.full_name || "Parent/Guardian";

        const params = formatTemplateParameters("fee_reminder", {
          guardian_name: parentName,
          student_name: inv.student.full_name,
          invoice_no: inv.invoice_no,
          amount_due: formatCurrency(balancePaise),
          due_date: formatDate(inv.due_date),
        }, inst.name || "School Portal");

        try {
          await dispatchWithRetry({
            phoneNumberId: inst.phone_number_id,
            accessToken: inst.whatsapp_token,
            recipientPhone: inv.student.guardian_phone,
            templateName: "fee_reminder",
            parameters: params,
          });

          // Mark reminder boolean as sent
          const updateField =
            reminderType === "7d" ? { reminder_7d_sent: true } :
            reminderType === "2d" ? { reminder_2d_sent: true } :
            { reminder_due_sent: true };

          await admin
            .from("fee_invoices")
            .update(updateField)
            .eq("id", inv.id);

          currentUsage++;
          instSent++;
          totalDispatched++;
        } catch (err) {
          console.error(`[Autopilot] Failed to send reminder for invoice ${inv.invoice_no}:`, err.message);
        }
      }

      // Update institute monthly usage
      if (instSent > 0) {
        await admin
          .from("institutes")
          .update({ messages_sent_this_month: currentUsage })
          .eq("id", inst.id);
      }

      instituteLogs.push({
        institute: inst.name,
        sent: instSent,
        skippedQuota: instSkipped,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalDispatched,
      totalSkippedQuota,
      institutes: instituteLogs,
    });
  } catch (err) {
    console.error("[Cron Fee Reminders] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
