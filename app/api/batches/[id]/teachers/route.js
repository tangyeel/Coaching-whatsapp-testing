import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request, { params }) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  if (auth.isTeacher) return Response.json({ error: "Forbidden" }, { status: 403 });

  const batchId = params.id;
  const { teacher_id } = await request.json();
  if (!teacher_id) return Response.json({ error: "teacher_id is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("teacher_batch_assignments")
    .upsert(
      {
        institute_id: auth.instituteId,
        batch_id: batchId,
        teacher_id: teacher_id,
      },
      { onConflict: "teacher_id,batch_id" }
    )
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, data });
}

export async function DELETE(request, { params }) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  if (auth.isTeacher) return Response.json({ error: "Forbidden" }, { status: 403 });

  const batchId = params.id;
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacher_id");

  if (!teacherId) return Response.json({ error: "teacher_id is required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("teacher_batch_assignments")
    .delete()
    .eq("batch_id", batchId)
    .eq("teacher_id", teacherId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
