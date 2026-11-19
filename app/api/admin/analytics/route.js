import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!authContext.isGlobalAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden: Global Admin privileges required" }, { status: 403 });
    }

    const admin = createAdminClient();

    // 1. Fetch all institutes
    const { data: institutes, error: instErr } = await admin
      .from("institutes")
      .select("id, name, slug, plan_tier, is_active, messages_sent_this_month, created_at, trial_ends_at");

    if (instErr) {
      return NextResponse.json({ success: false, error: instErr.message }, { status: 500 });
    }

    // 2. Fetch total active students count
    const { count: totalStudents } = await admin
      .from("students")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("is_active", true);

    // 3. Compute MRR and Plan Breakdown
    let totalMRR = 0;
    let activeInstitutesCount = 0;
    let suspendedInstitutesCount = 0;
    let totalMessagesThisMonth = 0;
    const planCounts = {
      starter: 0,
      growth: 0,
      pro: 0,
      enterprise: 0,
      custom: 0,
    };

    const dormantInstitutes = [];

    (institutes || []).forEach((inst) => {
      if (inst.is_active) {
        activeInstitutesCount++;
        const tier = inst.plan_tier || "starter";
        if (planCounts[tier] !== undefined) planCounts[tier]++;
        const planPrice = PLANS[tier]?.price_inr || 0;
        totalMRR += planPrice;
      } else {
        suspendedInstitutesCount++;
      }

      const msgs = inst.messages_sent_this_month || 0;
      totalMessagesThisMonth += msgs;

      if (inst.is_active && msgs === 0) {
        dormantInstitutes.push({
          id: inst.id,
          name: inst.name,
          slug: inst.slug,
          tier: inst.plan_tier,
          created_at: inst.created_at,
        });
      }
    });

    // 4. Fetch recent platform audit logs
    const { data: auditLogs } = await admin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      analytics: {
        mrrINR: totalMRR,
        activeInstitutes: activeInstitutesCount,
        suspendedInstitutes: suspendedInstitutesCount,
        totalInstitutes: institutes?.length || 0,
        totalStudents: totalStudents || 0,
        totalMessagesThisMonth,
        planCounts,
        dormantCount: dormantInstitutes.length,
        dormantInstitutes: dormantInstitutes.slice(0, 5),
        recentAuditEvents: auditLogs || [],
      },
    });
  } catch (err) {
    console.error("[Admin Analytics API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
