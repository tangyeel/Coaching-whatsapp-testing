import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!authContext.isGlobalAdmin && !authContext.isInstituteAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));
    const targetInstituteId = authContext.isGlobalAdmin && searchParams.get("institute_id")
      ? searchParams.get("institute_id")
      : authContext.profile?.institute_id;

    const admin = createAdminClient();
    let query = admin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (targetInstituteId) {
      query = query.eq("institute_id", targetInstituteId);
    }

    const { data: logs, error } = await query;

    if (error) {
      // Table may not have been created yet via migrations
      return NextResponse.json({ success: true, logs: [], warning: error.message });
    }

    return NextResponse.json({
      success: true,
      count: logs?.length || 0,
      logs: logs || [],
    });
  } catch (err) {
    console.error("[Audit API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
