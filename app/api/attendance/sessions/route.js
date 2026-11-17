import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batch_id");
  const date = searchParams.get("date");

  if (!batchId) return Response.json({ error: "batch_id is required" }, { status: 400 });

  const admin = createAdminClient();

  // Teacher scoping check
  if (auth.isTeacher) {
    const { data: assignment } = await admin
      .from("teacher_batch_assignments")
      .select("id")
      .eq("teacher_id", auth.user.id)
      .eq("batch_id", batchId)
      .single();
    if (!assignment) return Response.json({ error: "Access denied to this batch" }, { status: 403 });
  }

  let query = admin
    .from("attendance_sessions")
    .select(`
      *,
      records:attendance_records(
        id, student_id, status,
        student:students(id, full_name, roll_no, guardian_phone)
      )
    `)
    .eq("batch_id", batchId)
    .eq("institute_id", auth.instituteId);

  if (date) {
    query = query.eq("date", date);
  } else {
    query = query.order("date", { ascending: false }).limit(30);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ data: date ? data?.[0] || null : data });
}

export async function POST(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { batch_id, date, is_holiday, holiday_title, notes, records } = body;

  if (!batch_id || !date) {
    return Response.json({ error: "batch_id and date are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Create or update session
  const { data: session, error: sessionErr } = await admin
    .from("attendance_sessions")
    .upsert(
      {
        institute_id: auth.instituteId,
        batch_id,
        date,
        is_holiday: Boolean(is_holiday),
        holiday_title: is_holiday ? holiday_title || "Holiday" : null,
        notes: notes || null,
        created_by: auth.user.id,
      },
      { onConflict: "batch_id,date" }
    )
    .select()
    .single();

  if (sessionErr) return Response.json({ error: sessionErr.message }, { status: 500 });

  // 2. If it's a holiday, remove any old student records for this day
  if (is_holiday) {
    await admin.from("attendance_records").delete().eq("session_id", session.id);
    return Response.json({
      success: true,
      data: session,
      message: `Date marked as holiday: ${holiday_title || "Holiday"}`,
    });
  }

  // 3. Insert / update student attendance records
  if (Array.isArray(records) && records.length > 0) {
    const recordsToInsert = records.map(r => ({
      session_id: session.id,
      student_id: r.student_id,
      status: r.status === "absent" ? "absent" : "present",
    }));

    const { error: recErr } = await admin
      .from("attendance_records")
      .upsert(recordsToInsert, { onConflict: "session_id,student_id" });

    if (recErr) return Response.json({ error: recErr.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    data: session,
    message: "Attendance saved successfully",
  });
}
