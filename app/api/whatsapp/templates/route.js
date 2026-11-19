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

    if (!authContext.isInstituteAdmin && !authContext.isGlobalAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetInstituteId = authContext.isGlobalAdmin && searchParams.get("institute_id")
      ? searchParams.get("institute_id")
      : authContext.profile?.institute_id;

    const admin = createAdminClient();
    const { data: inst, error: instErr } = await admin
      .from("institutes")
      .select("id, name, whatsapp_token, phone_number_id, waba_id")
      .eq("id", targetInstituteId)
      .single();

    if (instErr || !inst) {
      return NextResponse.json({ success: false, error: "Institute record not found" }, { status: 404 });
    }

    if (!inst.whatsapp_token || !inst.phone_number_id) {
      return NextResponse.json({
        success: true,
        configured: false,
        message: "WhatsApp credentials not yet configured for this institute.",
        templates: [],
      });
    }

    let wabaId = inst.waba_id;

    // Auto-discover WABA ID from phone_number_id if not explicitly set
    if (!wabaId) {
      try {
        const phoneRes = await fetch(
          `https://graph.facebook.com/v19.0/${inst.phone_number_id}?fields=whatsapp_business_account`,
          {
            headers: { Authorization: `Bearer ${inst.whatsapp_token}` },
          }
        );
        if (phoneRes.ok) {
          const phoneData = await phoneRes.json();
          wabaId = phoneData?.whatsapp_business_account?.id;
          if (wabaId) {
            // Cache discovered WABA ID back into institute record
            await admin.from("institutes").update({ waba_id: wabaId }).eq("id", inst.id);
          }
        }
      } catch (discErr) {
        console.warn("[WhatsApp Templates] WABA auto-discovery failed:", discErr);
      }
    }

    if (!wabaId) {
      return NextResponse.json({
        success: true,
        configured: true,
        waba_discovered: false,
        message: "Phone Number ID is set, but WABA ID could not be resolved automatically. Provide WABA ID in institute settings.",
        templates: [],
      });
    }

    // Query Meta Graph API for message templates
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/message_templates?fields=name,status,category,language,components&limit=50`,
      {
        headers: { Authorization: `Bearer ${inst.whatsapp_token}` },
        next: { revalidate: 60 }, // Cache up to 60 seconds
      }
    );

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      return NextResponse.json({
        success: false,
        error: metaData?.error?.message || "Failed to query Meta message templates",
        metaError: metaData?.error,
      }, { status: metaRes.status || 500 });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      waba_id: wabaId,
      count: metaData.data?.length || 0,
      templates: (metaData.data || []).map((t) => ({
        name: t.name,
        status: t.status, // APPROVED, PENDING, REJECTED, PAUSED
        category: t.category,
        language: t.language,
        id: t.id,
      })),
    });
  } catch (err) {
    console.error("[WhatsApp Templates API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
