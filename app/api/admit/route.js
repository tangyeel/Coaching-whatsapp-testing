import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWithRetry, formatTemplateParameters } from "@/lib/whatsapp";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      institute_id,
      student_name,
      student_dob,
      parent_name,
      parent_phone,
      parent_email,
      address,
      batch_id,
      notes,
    } = body;

    if (!institute_id || !student_name?.trim() || !parent_name?.trim() || !parent_phone?.trim()) {
      return NextResponse.json(
        { success: false, error: "Please fill in all mandatory applicant details." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Fetch institute
    const { data: institute, error: instErr } = await admin
      .from("institutes")
      .select("id, name, whatsapp_token, phone_number_id, contact_phone")
      .eq("id", institute_id)
      .single();

    if (instErr || !institute) {
      return NextResponse.json({ success: false, error: "Institute not found" }, { status: 404 });
    }

    // 2. Insert admission lead
    const { data: lead, error: insertErr } = await admin
      .from("admissions")
      .insert({
        institute_id: institute.id,
        student_name: student_name.trim(),
        student_dob: student_dob || null,
        parent_name: parent_name.trim(),
        parent_phone: parent_phone.trim(),
        parent_email: (parent_email || "").trim(),
        address: (address || "").trim(),
        batch_id: batch_id || null,
        notes: (notes || "").trim(),
        status: "pending",
      })
      .select()
      .single();

    if (insertErr) {
      console.warn("[Admissions API] Table insert error (table may be pending migration):", insertErr.message);
    }

    // 3. Dispatch automated WhatsApp acknowledgment to parent if configured
    if (institute.whatsapp_token && institute.phone_number_id) {
      try {
        const params = formatTemplateParameters(
          "test_message",
          {
            institute_name: institute.name,
            message_body: `Thank you for your admission request for ${student_name.trim()}! Our desk will contact you within 24 hours.`,
            student_name: student_name.trim(),
          },
          institute.name
        );

        await dispatchWithRetry({
          phoneNumberId: institute.phone_number_id,
          accessToken: institute.whatsapp_token,
          recipientPhone: parent_phone.trim(),
          templateName: "test_message",
          parameters: params,
        });
      } catch (waErr) {
        console.warn("[Admission WhatsApp] Notification skipped:", waErr.message);
      }
    }

    // 4. Audit Log
    await logAudit({
      institute_id: institute.id,
      actor_email: "parent_applicant",
      action: "admission.submitted",
      entity_type: "admission",
      entity_id: lead?.id || null,
      entity_name: student_name.trim(),
      metadata: { parent_phone, batch_id },
    });

    return NextResponse.json({
      success: true,
      message: `Admission application received! ${institute.name} administration will contact you shortly.`,
      lead_id: lead?.id || null,
    });
  } catch (err) {
    console.error("[Admissions API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
