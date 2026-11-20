import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createRazorpayOrder } from "@/lib/razorpay";
import { PLANS } from "@/lib/plans";

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
    const { plan_tier } = body;

    const plan = PLANS[plan_tier];
    if (!plan) {
      return NextResponse.json({ success: false, error: "Invalid plan tier selected" }, { status: 400 });
    }

    const institute = authContext.profile?.institute_id;

    const order = await createRazorpayOrder({
      amountPaise: plan.price_paise,
      currency: "INR",
      receipt: `sub_${plan_tier}_${Date.now()}`,
      notes: {
        institute_id: institute,
        plan_tier,
        user_email: authContext.user.email,
      },
    });

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: plan.price_paise,
      currency: "INR",
      plan_name: plan.name,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
      mock: Boolean(order.mock),
    });
  } catch (err) {
    console.error("[Create Order API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
