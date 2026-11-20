import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { PLANS } from "@/lib/plans";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!authContext.isInstituteAdmin && !authContext.isGlobalAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_tier } = body;

    const plan = PLANS[plan_tier];
    if (!plan) {
      return NextResponse.json({ success: false, error: "Invalid plan tier" }, { status: 400 });
    }

    // Verify cryptographic signature (or allow mock if testing)
    const isMock = razorpay_order_id?.startsWith("order_mock_");
    if (!isMock) {
      const isValid = verifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isValid) {
        return NextResponse.json({ success: false, error: "Invalid payment signature verification" }, { status: 400 });
      }
    }

    const instituteId = authContext.profile?.institute_id;
    const admin = createAdminClient();

    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30); // 30-day billing cycle

    // 1. Record in subscriptions table
    await admin.from("subscriptions").insert({
      institute_id: instituteId,
      plan_tier,
      amount_paise: plan.price_paise,
      razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id || `pay_mock_${Date.now()}`,
      razorpay_signature: razorpay_signature || "mock_signature",
      status: "paid",
      valid_from: validFrom.toISOString(),
      valid_until: validUntil.toISOString(),
    });

    // 2. Upgrade institute plan_tier
    const { data: updatedInst, error: updateErr } = await admin
      .from("institutes")
      .update({
        plan_tier,
        trial_ends_at: null, // Clear trial flag since paid
      })
      .eq("id", instituteId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    // 3. Send payment receipt email
    await sendEmail({
      to: authContext.user.email,
      subject: `Subscription Activated: ${plan.name} for ${updatedInst?.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Subscription Payment Confirmed</h2>
          <p>Thank you! Your coaching academy has been upgraded to the <strong>${plan.name}</strong>.</p>
          <p><strong>Monthly Quota:</strong> ${plan.quota.toLocaleString('en-IN')} WhatsApp Messages</p>
          <p><strong>Amount Paid:</strong> ₹${plan.price_inr.toLocaleString('en-IN')}</p>
          <p><strong>Valid Until:</strong> ${validUntil.toLocaleDateString('en-IN')}</p>
        </div>
      `,
    });

    // 4. Audit Log
    await logAudit({
      institute_id: instituteId,
      actor_id: authContext.profile?.id,
      actor_email: authContext.user.email,
      action: "subscription.activated",
      entity_type: "subscription",
      entity_name: plan.name,
      metadata: { plan_tier, amount_paise: plan.price_paise, order_id: razorpay_order_id },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to the ${plan.name}! Your new message allowance is now active.`,
      institute: updatedInst,
    });
  } catch (err) {
    console.error("[Verify Payment API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
