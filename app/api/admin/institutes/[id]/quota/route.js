import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request, { params }) {
  try {
    const auth = await getAuthContext(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    if (!auth.isGlobalAdmin) {
      return Response.json({ error: "Forbidden: Global Admin only" }, { status: 403 });
    }

    const { id } = params;
    if (!id) return Response.json({ error: "Institute ID required" }, { status: 400 });

    const body = await request.json();
    const { plan_tier, msg_limit_override } = body;

    const updates = {};
    if (plan_tier !== undefined) {
      const validTiers = ["starter", "growth", "pro", "enterprise", "custom"];
      if (!validTiers.includes(plan_tier)) {
        return Response.json({ error: `Invalid plan tier. Must be one of: ${validTiers.join(", ")}` }, { status: 400 });
      }
      updates.plan_tier = plan_tier;
    }

    if (msg_limit_override !== undefined) {
      // null means use plan default, number >= 0
      if (msg_limit_override === null || msg_limit_override === "" || isNaN(Number(msg_limit_override))) {
        updates.msg_limit_override = null;
      } else {
        updates.msg_limit_override = Math.max(0, parseInt(msg_limit_override, 10));
      }
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("institutes")
      .update(updates)
      .eq("id", id)
      .select("id, name, plan_tier, msg_limit_override, messages_sent_this_month, plan_defaults(*)")
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({
      success: true,
      data,
      message: `Quota and plan updated for ${data.name}`,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
