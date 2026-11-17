import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const auth = await getAuthContext(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  return Response.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
    },
    profile: auth.profile,
    institute: auth.institute,
    role: auth.role,
  });
}

export async function PATCH(request) {
  const auth = await getAuthContext(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const updates = {};
  if (body.password_changed !== undefined) updates.password_changed = Boolean(body.password_changed);
  if (body.full_name !== undefined) updates.full_name = String(body.full_name).trim();
  if (body.phone !== undefined) updates.phone = String(body.phone).trim();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", auth.user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, profile: data });
}
