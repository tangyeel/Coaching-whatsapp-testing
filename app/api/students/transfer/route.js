import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  if (auth.isTeacher) return Response.json({ error: "Only institute admins can transfer students" }, { status: 403 });

  const body = await request.json();
  const { student_id, to_batch_id, reason } = body;

  if (!student_id || !to_batch_id) {
    return Response.json({ error: "student_id and to_batch_id are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Fetch current student and verify ownership
  const { data: student, error: studentErr } = await admin
    .from("students")
    .select("id, batch_id, full_name, institute_id")
    .eq("id", student_id)
    .eq("institute_id", auth.instituteId)
    .single();

  if (studentErr || !student) {
    return Response.json({ error: "Student not found in your institute" }, { status: 404 });
  }

  const fromBatchId = student.batch_id;
  if (fromBatchId === to_batch_id) {
    return Response.json({ error: "Student is already in this batch" }, { status: 400 });
  }

  // 2. Verify destination batch exists in same institute
  const { data: destBatch, error: batchErr } = await admin
    .from("batches")
    .select("id, name")
    .eq("id", to_batch_id)
    .eq("institute_id", auth.instituteId)
    .single();

  if (batchErr || !destBatch) {
    return Response.json({ error: "Target batch not found in your institute" }, { status: 404 });
  }

  // 3. Update student's batch
  const { error: updateErr } = await admin
    .from("students")
    .update({ batch_id: to_batch_id, updated_at: new Date().toISOString() })
    .eq("id", student_id);

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  // 4. Log the transfer in student_batch_transfers
  await admin.from("student_batch_transfers").insert([
    {
      institute_id: auth.instituteId,
      student_id: student.id,
      from_batch_id: fromBatchId,
      to_batch_id: to_batch_id,
      transferred_by: auth.user.id,
      transfer_reason: reason || "Batch transfer by administrator",
    },
  ]);

  return Response.json({
    success: true,
    message: `${student.full_name} transferred successfully to ${destBatch.name}`,
  });
}
