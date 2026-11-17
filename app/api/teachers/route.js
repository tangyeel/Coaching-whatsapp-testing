import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(`
      id, full_name, email, phone, is_active, created_at,
      teacher_batch_assignments(batch_id, batches(id, name))
    `)
    .eq("institute_id", auth.instituteId)
    .eq("role", "teacher")
    .order("full_name", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data: data || [] });
}

export async function POST(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  if (auth.isTeacher) return Response.json({ error: "Only institute admins can create teacher accounts" }, { status: 403 });

  const body = await request.json();
  const { full_name, email, password, phone, batch_ids } = body;

  if (!full_name?.trim() || !email?.trim() || !password) {
    return Response.json({ error: "Full name, email, and password are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Create auth user
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: email.trim(),
    password: password,
    email_confirm: true,
  });

  if (authErr) {
    return Response.json({ error: authErr.message }, { status: 400 });
  }

  // 2. Create teacher profile
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .upsert({
      id: authUser.user.id,
      institute_id: auth.instituteId,
      role: "teacher",
      full_name: full_name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      is_active: true,
    })
    .select()
    .single();

  if (profErr) {
    return Response.json({ error: profErr.message }, { status: 500 });
  }

  // 3. Optional batch assignments
  if (Array.isArray(batch_ids) && batch_ids.length > 0) {
    const assignments = batch_ids.map(bId => ({
      institute_id: auth.instituteId,
      teacher_id: authUser.user.id,
      batch_id: bId,
    }));
    await admin.from("teacher_batch_assignments").upsert(assignments, { onConflict: "teacher_id,batch_id" });
  }

  return Response.json({
    success: true,
    data: profile,
    message: `Teacher account created for ${full_name}`,
  });
}
