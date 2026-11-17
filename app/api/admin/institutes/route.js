import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  if (!auth.isGlobalAdmin) return Response.json({ error: "Forbidden: Global Admin only" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const includeStats = searchParams.get("stats") === "true";
  const admin = createAdminClient();

  if (includeStats) {
    // 1. Fetch all institutes with plan defaults and profile counts
    const { data: institutes, error: instErr } = await admin
      .from("institutes")
      .select(`
        *,
        plan_defaults(*),
        batches_count:batches(count),
        students_count:students(count),
        profiles(id, full_name, email, role, is_active)
      `)
      .order("created_at", { ascending: false });

    if (instErr) return Response.json({ error: instErr.message }, { status: 500 });

    // 2. Fetch active students count across all institutes
    const { count: totalStudents } = await admin
      .from("students")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("is_active", true);

    // 3. Fetch teachers count
    const { count: totalTeachers } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher")
      .eq("is_active", true);

    // 4. Fetch latest message jobs to calculate messages this month & previous month
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const { data: thisMonthJobs } = await admin
      .from("message_jobs")
      .select("success_count")
      .gte("created_at", firstDayThisMonth);

    const { data: prevMonthJobs } = await admin
      .from("message_jobs")
      .select("success_count")
      .gte("created_at", firstDayPrevMonth)
      .lt("created_at", firstDayThisMonth);

    const messagesThisMonth = (thisMonthJobs || []).reduce((acc, j) => acc + (j.success_count || 0), 0);
    const messagesPrevMonth = (prevMonthJobs || []).reduce((acc, j) => acc + (j.success_count || 0), 0);

    // 5. Calculate per-institute metrics
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const formattedInstitutes = await Promise.all(
      (institutes || []).map(async (inst) => {
        // Find latest message job date
        const { data: latestJob } = await admin
          .from("message_jobs")
          .select("created_at")
          .eq("institute_id", inst.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastActivity = latestJob?.created_at || inst.created_at;
        const isDormant = new Date(lastActivity) < fourteenDaysAgo && (inst.students_count?.[0]?.count || 0) > 0;

        const effectiveLimit = inst.msg_limit_override !== null && inst.msg_limit_override !== undefined
          ? inst.msg_limit_override
          : (inst.plan_defaults?.msg_limit || 500);

        const used = inst.messages_sent_this_month || 0;
        const usagePct = effectiveLimit > 0 ? Math.min(100, Math.round((used / effectiveLimit) * 100)) : 0;

        return {
          ...inst,
          effectiveLimit,
          usagePct,
          lastActivity,
          isDormant,
          studentCount: inst.students_count?.[0]?.count || 0,
          batchCount: inst.batches_count?.[0]?.count || 0,
        };
      })
    );

    const activeCount = formattedInstitutes.filter(i => i.is_active).length;
    const dormantCount = formattedInstitutes.filter(i => i.isDormant).length;

    return Response.json({
      success: true,
      platform: {
        totalInstitutes: formattedInstitutes.length,
        activeInstitutes: activeCount,
        dormantInstitutes: dormantCount,
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        messagesThisMonth,
        messagesPrevMonth,
      },
      institutes: formattedInstitutes,
    });
  }

  // Standard GET
  const { data, error } = await admin
    .from("institutes")
    .select(`
      *,
      plan_defaults(*),
      batches_count:batches(count),
      students_count:students(count),
      profiles(id, full_name, email, role, is_active)
    `)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function POST(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  if (!auth.isGlobalAdmin) return Response.json({ error: "Forbidden: Global Admin only" }, { status: 403 });

  const body = await request.json();
  const {
    name,
    admin_name,
    email,
    password,
    whatsapp_token,
    phone_number_id,
    address,
    contact_phone,
    invoice_prefix,
    receipt_prefix,
    plan_tier = "starter",
    msg_limit_override = null,
  } = body;

  if (!name?.trim() || !email?.trim() || !password) {
    return Response.json({ error: "Institute name, admin email, and password are required" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") + "-" + Math.floor(100 + Math.random() * 900);

  const admin = createAdminClient();

  // 1. Create institute record
  const { data: institute, error: instErr } = await admin
    .from("institutes")
    .insert([
      {
        name: name.trim(),
        slug,
        address: address?.trim() || null,
        contact_phone: contact_phone?.trim() || null,
        whatsapp_token: whatsapp_token?.trim() || null,
        phone_number_id: phone_number_id?.trim() || null,
        invoice_prefix: (invoice_prefix || "INV").toUpperCase(),
        receipt_prefix: (receipt_prefix || "REC").toUpperCase(),
        plan_tier: plan_tier || "starter",
        msg_limit_override: msg_limit_override ? Number(msg_limit_override) : null,
        is_active: true,
      },
    ])
    .select()
    .single();

  if (instErr) return Response.json({ error: instErr.message }, { status: 500 });

  // 2. Create Supabase Auth user
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: email.trim(),
    password: password,
    email_confirm: true,
  });

  if (authErr) {
    await admin.from("institutes").delete().eq("id", institute.id);
    return Response.json({ error: authErr.message }, { status: 400 });
  }

  // 3. Create institute admin profile (marked password_changed = false for first-time setup prompt)
  const { error: profErr } = await admin.from("profiles").upsert({
    id: authUser.user.id,
    institute_id: institute.id,
    role: "institute_admin",
    full_name: admin_name?.trim() || `${name} Admin`,
    email: email.trim(),
    is_active: true,
    password_changed: false,
  });

  if (profErr) {
    return Response.json({ error: profErr.message }, { status: 500 });
  }

  // 4. Auto-seed an initial default batch
  await admin.from("batches").insert([
    {
      institute_id: institute.id,
      name: "Batch 01 - Morning",
      academic_year: "2026-2027",
      is_active: true,
    },
  ]);

  return Response.json({
    success: true,
    institute,
    message: `Institute ${name} provisioned successfully in 60 seconds!`,
  });
}

export async function PATCH(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const {
    id,
    is_active,
    whatsapp_token,
    phone_number_id,
    name,
    address,
    contact_phone,
    invoice_prefix,
    receipt_prefix,
    fee_reminder_autopilot,
    banner_color,
  } = body;

  const targetId = id || auth.instituteId;
  if (!targetId) return Response.json({ error: "Institute ID required" }, { status: 400 });

  // Check permission: Global Admin can edit any; Institute Admin can edit their own basic settings
  if (!auth.isGlobalAdmin && auth.instituteId !== targetId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (address !== undefined) updates.address = address;
  if (contact_phone !== undefined) updates.contact_phone = contact_phone;
  if (invoice_prefix !== undefined) updates.invoice_prefix = invoice_prefix;
  if (receipt_prefix !== undefined) updates.receipt_prefix = receipt_prefix;
  if (fee_reminder_autopilot !== undefined) updates.fee_reminder_autopilot = Boolean(fee_reminder_autopilot);
  if (banner_color !== undefined) updates.banner_color = banner_color;

  // Sensitive fields: ONLY Global Admin can update credentials or active status
  if (auth.isGlobalAdmin) {
    if (is_active !== undefined) updates.is_active = is_active;
    if (whatsapp_token !== undefined) updates.whatsapp_token = whatsapp_token;
    if (phone_number_id !== undefined) updates.phone_number_id = phone_number_id;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("institutes")
    .update(updates)
    .eq("id", targetId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, data });
}
