import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { institute_name, contact_name, contact_phone, contact_email, student_count_estimate, notes } = body;

    if (!institute_name || !contact_name || !contact_phone) {
      return NextResponse.json(
        { success: false, error: "Please provide institute name, your name, and contact phone number." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    
    // Save lead to database
    const { data, error } = await admin.from("demo_requests").insert({
      institute_name: institute_name.trim(),
      contact_name: contact_name.trim(),
      contact_phone: contact_phone.trim(),
      contact_email: (contact_email || "").trim(),
      student_count_estimate: student_count_estimate || null,
      notes: (notes || "").trim(),
      status: "new",
    }).select().single();

    if (error) {
      console.warn("[Demo Request] DB insert failed (table may not exist yet, continuing):", error.message);
    }

    // Attempt to notify platform admin via email
    const notifyEmail = process.env.GLOBAL_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL;
    if (notifyEmail) {
      await sendEmail({
        to: notifyEmail,
        subject: `[New Lead] Demo Request from ${institute_name}`,
        html: `
          <h2>New Institute Demo Request</h2>
          <p><strong>Institute:</strong> ${institute_name}</p>
          <p><strong>Contact:</strong> ${contact_name}</p>
          <p><strong>Phone:</strong> ${contact_phone}</p>
          <p><strong>Email:</strong> ${contact_email || "N/A"}</p>
          <p><strong>Estimated Students:</strong> ${student_count_estimate || "N/A"}</p>
          <p><strong>Notes:</strong> ${notes || "None"}</p>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your interest! Our team will get in touch with you shortly.",
      lead_id: data?.id || null,
    });
  } catch (err) {
    console.error("[Demo Request API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
