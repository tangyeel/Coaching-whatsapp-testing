import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("message_jobs")
    .select(`
      *,
      creator:profiles(full_name),
      recipients:message_recipients(
        id, phone, status, provider_message_id, error_message, sent_at,
        student:students(full_name)
      )
    `)
    .eq("institute_id", auth.instituteId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data: data || [] });
}
