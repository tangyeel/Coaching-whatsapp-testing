import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const targetInstituteId = searchParams.get("institute_id") || auth.instituteId;

  if (!auth.isGlobalAdmin && targetInstituteId !== auth.instituteId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let query = admin
    .from("batches")
    .select(`
      *,
      students:students(count),
      teacher_batch_assignments(teacher_id, profiles(id, full_name, email))
    `)
    .eq("institute_id", targetInstituteId)
    .order("name", { ascending: true });

  // If role is teacher, restrict strictly to assigned batches
  if (auth.isTeacher) {
    const { data: assignments } = await admin
      .from("teacher_batch_assignments")
      .select("batch_id")
      .eq("teacher_id", auth.user.id);

    const assignedBatchIds = (assignments || []).map(a => a.batch_id);
    query = query.in("id", assignedBatchIds.length > 0 ? assignedBatchIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const formatted = (data || []).map(b => ({
    ...b,
    student_count: b.students?.[0]?.count || 0,
    assigned_teachers: b.teacher_batch_assignments?.map(t => t.profiles) || [],
  }));

  return Response.json({ data: formatted });
}

export async function POST(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  if (auth.isTeacher) {
    return Response.json({ error: "Teachers cannot create batches" }, { status: 403 });
  }

  const body = await request.json();
  const { name, academic_year, subject_tags, institute_id } = body;
  const targetInstituteId = institute_id || auth.instituteId;

  if (!name?.trim()) {
    return Response.json({ error: "Batch name is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("batches")
    .insert([
      {
        institute_id: targetInstituteId,
        name: name.trim(),
        academic_year: academic_year || "2026-2027",
        subject_tags: Array.isArray(subject_tags) ? subject_tags : [],
        is_active: true,
      },
    ])
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, data });
}

export async function PATCH(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  if (auth.isTeacher) {
    return Response.json({ error: "Teachers cannot edit batches" }, { status: 403 });
  }

  const body = await request.json();
  const { id, name, academic_year, subject_tags, is_active } = body;
  if (!id) return Response.json({ error: "Batch ID required" }, { status: 400 });

  const admin = createAdminClient();
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (academic_year !== undefined) updates.academic_year = academic_year;
  if (subject_tags !== undefined) updates.subject_tags = subject_tags;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await admin
    .from("batches")
    .update(updates)
    .eq("id", id)
    .eq("institute_id", auth.isGlobalAdmin ? undefined : auth.instituteId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, data });
}
