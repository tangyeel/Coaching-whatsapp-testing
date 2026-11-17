import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const today = new Date().toISOString().split("T")[0];

    // Reset messages_sent_this_month for institutes whose reset date is in a previous month
    const { data, error } = await admin
      .from("institutes")
      .update({
        messages_sent_this_month: 0,
        messages_month_reset_at: today,
      })
      .neq("messages_month_reset_at", today)
      .select("id, name");

    if (error) throw error;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      resetCount: data ? data.length : 0,
      institutes: data ? data.map(i => i.name) : [],
    });
  } catch (err) {
    console.error("[Cron Reset Quota] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
