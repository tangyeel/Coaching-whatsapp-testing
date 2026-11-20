import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TEMPLATES } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!authContext.isInstituteAdmin && !authContext.isGlobalAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin required" }, { status: 403 });
    }

    const instituteId = authContext.profile?.institute_id;
    const admin = createAdminClient();

    const { data: savedTemplates } = await admin
      .from("message_templates")
      .select("*")
      .eq("institute_id", instituteId);

    const savedMap = {};
    (savedTemplates || []).forEach((t) => {
      savedMap[t.template_key] = t;
    });

    const result = Object.values(DEFAULT_TEMPLATES).map((def) => {
      const saved = savedMap[def.key];
      return {
        key: def.key,
        label: def.label,
        category: def.category,
        variables: def.variables,
        defaultBody: def.defaultBody,
        currentBody: saved?.body || def.defaultBody,
        isCustomized: Boolean(saved?.body),
        is_active: saved ? saved.is_active : true,
      };
    });

    return NextResponse.json({ success: true, templates: result });
  } catch (err) {
    console.error("[Custom Templates GET] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!authContext.isInstituteAdmin && !authContext.isGlobalAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { template_key, body: templateBody, is_active } = body;

    if (!template_key || !DEFAULT_TEMPLATES[template_key]) {
      return NextResponse.json({ success: false, error: "Invalid template key" }, { status: 400 });
    }

    if (!templateBody?.trim()) {
      return NextResponse.json({ success: false, error: "Template body cannot be empty" }, { status: 400 });
    }

    const instituteId = authContext.profile?.institute_id;
    const admin = createAdminClient();

    const def = DEFAULT_TEMPLATES[template_key];

    const { data, error } = await admin
      .from("message_templates")
      .upsert(
        {
          institute_id: instituteId,
          template_key,
          body: templateBody.trim(),
          variables: def.variables,
          is_active: is_active !== undefined ? is_active : true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "institute_id, template_key" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Template updated successfully",
      data,
    });
  } catch (err) {
    console.error("[Custom Templates PUT] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
