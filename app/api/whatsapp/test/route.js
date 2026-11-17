import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWithRetry, formatTemplateParameters } from "@/lib/whatsapp";

export async function POST(request) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!authContext.isInstituteAdmin && !authContext.isGlobalAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const admin = createAdminClient();

    // Fetch institute to verify current credentials or use provided overrides if GA
    let targetInstitute = authContext.institute;
    if (authContext.isGlobalAdmin && body.institute_id) {
      const { data: inst } = await admin
        .from("institutes")
        .select("*")
        .eq("id", body.institute_id)
        .single();
      if (inst) targetInstitute = inst;
    }

    if (!targetInstitute) {
      return NextResponse.json({ success: false, error: "Institute not found" }, { status: 404 });
    }

    // Credentials strictly resolved from server-side stored institute data (or GA override)
    const phoneNumberId = authContext.isGlobalAdmin && body.phone_number_id 
      ? body.phone_number_id 
      : targetInstitute.phone_number_id;

    const accessToken = authContext.isGlobalAdmin && body.whatsapp_token 
      ? body.whatsapp_token 
      : targetInstitute.whatsapp_token;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json({
        success: false,
        error: "WhatsApp API credentials are not configured for this institute. Contact Platform Admin.",
      }, { status: 400 });
    }

    // Test destination phone: use provided test phone, fallback to institute's contact phone
    const testToPhone = body.test_to_phone || targetInstitute.contact_phone;
    if (!testToPhone) {
      return NextResponse.json({
        success: false,
        error: "Please provide a valid test phone number or configure an Institute contact phone.",
      }, { status: 400 });
    }

    // Prepare test message using attendance_absent template (which exists in all instances)
    const testParams = formatTemplateParameters("attendance_absent", {
      student_name: "Test Recipient",
      batch_name: "Connectivity Check",
      attendance_date: new Date().toISOString().split("T")[0],
    }, targetInstitute.name || "School Portal");

    const result = await dispatchWithRetry({
      phoneNumberId,
      accessToken,
      recipientPhone: testToPhone,
      templateName: "attendance_absent",
      parameters: testParams,
    });

    return NextResponse.json({
      success: true,
      message: `Test WhatsApp message successfully dispatched to ${testToPhone}`,
      messageId: result.messageId,
    });
  } catch (err) {
    console.error("[WhatsApp Test] Error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to dispatch test message",
      metaCode: err.metaCode,
      status: err.status,
    }, { status: 500 });
  }
}
