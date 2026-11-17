import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  if (!auth.isGlobalAdmin) return Response.json({ error: "Forbidden: Global Admin only" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("institutes")
    .select(`
      *,
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
    // Rollback institute
    await admin.from("institutes").delete().eq("id", institute.id);
    return Response.json({ error: authErr.message }, { status: 400 });
  }

  // 3. Create institute admin profile
  const { error: profErr } = await admin.from("profiles").upsert({
    id: authUser.user.id,
    institute_id: institute.id,
    role: "institute_admin",
    full_name: admin_name?.trim() || `${name} Admin`,
    email: email.trim(),
    is_active: true,
  });

  if (profErr) {
    return Response.json({ error: profErr.message }, { status: 500 });
  }

  // 4. Auto-seed an initial default batch for fast start
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
  if (!auth.isGlobalAdmin) return Response.json({ error: "Forbidden: Global Admin only" }, { status: 403 });

  const body = await request.json();
  const { id, is_active, whatsapp_token, phone_number_id, name, invoice_prefix, receipt_prefix } = body;

  if (!id) return Response.json({ error: "Institute ID required" }, { status: 400 });

  const updates = {};
  if (is_active !== undefined) updates.is_active = is_active;
  if (whatsapp_token !== undefined) updates.whatsapp_token = whatsapp_token;
  if (phone_number_id !== undefined) updates.phone_number_id = phone_number_id;
  if (name !== undefined) updates.name = name;
  if (invoice_prefix !== undefined) updates.invoice_prefix = invoice_prefix;
  if (receipt_prefix !== undefined) updates.receipt_prefix = receipt_prefix;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("institutes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, data });
}
