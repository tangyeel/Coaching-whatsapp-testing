import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

export async function GET(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batch_id");
  const includeArchived = searchParams.get("include_archived") === "true";
  const admin = createAdminClient();

  let query = admin
    .from("students")
    .select("*, batches(id, name)")
    .eq("institute_id", auth.instituteId)
    .order("full_name", { ascending: true });

  if (!includeArchived) {
    query = query.is("deleted_at", null).eq("is_active", true);
  }

  if (batchId) {
    query = query.eq("batch_id", batchId);
  }

  // Teacher scoping check
  if (auth.isTeacher) {
    const { data: assignments } = await admin
      .from("teacher_batch_assignments")
      .select("batch_id")
      .eq("teacher_id", auth.user.id);
    const assignedIds = (assignments || []).map(a => a.batch_id);

    if (batchId && !assignedIds.includes(batchId)) {
      return Response.json({ error: "Access denied to this batch" }, { status: 403 });
    }
    query = query.in("batch_id", assignedIds.length > 0 ? assignedIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function POST(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { batch_id, students } = body;

  if (!batch_id) return Response.json({ error: "batch_id is required" }, { status: 400 });

  const admin = createAdminClient();

  // If adding a single student
  if (body.full_name) {
    const phone = normalizePhone(body.guardian_phone || body.phone);
    if (!phone) return Response.json({ error: "Valid 10-digit guardian phone required" }, { status: 400 });

    const { data, error } = await admin
      .from("students")
      .insert([
        {
          institute_id: auth.instituteId,
          batch_id,
          full_name: body.full_name.trim(),
          roll_no: body.roll_no?.trim() || null,
          guardian_name: body.guardian_name?.trim() || null,
          guardian_phone: phone,
          student_phone: normalizePhone(body.student_phone) || null,
          enrollment_date: body.enrollment_date || new Date().toISOString().split("T")[0],
          is_active: true,
          deleted_at: null,
        },
      ])
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    
    await logAudit({
      institute_id: auth.instituteId,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      action: "student.created",
      entity_type: "student",
      entity_id: data.id,
      entity_name: data.full_name,
      metadata: { roll_no: data.roll_no, batch_id: data.batch_id },
    });

    return Response.json({ success: true, data });
  }

  // If bulk updating/saving student list (ATOMIC SAFE UPSERT, NEVER DELETE)
  if (Array.isArray(students)) {
    const recordsToUpsert = students
      .filter(s => s.name?.trim() || s.full_name?.trim())
      .map(s => {
        const phone = normalizePhone(s.guardian_phone || s.phone);
        const record = {
          institute_id: auth.instituteId,
          batch_id,
          full_name: (s.full_name || s.name).trim(),
          guardian_phone: phone,
          roll_no: s.roll_no || null,
          is_active: true,
          deleted_at: null,
        };
        // If it's an existing student with a real UUID, preserve it
        if (s.id && !String(s.id).startsWith("new-")) {
          record.id = s.id;
        }
        return record;
      });

    const { data, error } = await admin
      .from("students")
      .upsert(recordsToUpsert)
      .select();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    
    await logAudit({
      institute_id: auth.instituteId,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      action: "student.created",
      entity_type: "student",
      entity_id: data.id,
      entity_name: data.full_name,
      metadata: { roll_no: data.roll_no, batch_id: data.batch_id },
    });

    return Response.json({ success: true, data });
  }

  return Response.json({ error: "Invalid payload" }, { status: 400 });
}

export async function PATCH(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { id, full_name, roll_no, guardian_name, guardian_phone, student_phone, is_active, restore } = body;
  if (!id) return Response.json({ error: "Student ID required" }, { status: 400 });

  const updates = {};
  if (full_name !== undefined) updates.full_name = full_name.trim();
  if (roll_no !== undefined) updates.roll_no = roll_no?.trim() || null;
  if (guardian_name !== undefined) updates.guardian_name = guardian_name?.trim() || null;
  if (guardian_phone !== undefined) updates.guardian_phone = normalizePhone(guardian_phone);
  if (student_phone !== undefined) updates.student_phone = normalizePhone(student_phone);
  if (is_active !== undefined) updates.is_active = is_active;
  if (restore === true) {
    updates.deleted_at = null;
    updates.is_active = true;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("students")
    .update(updates)
    .eq("id", id)
    .eq("institute_id", auth.instituteId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logAudit({
    institute_id: auth.instituteId,
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    action: restore ? "student.restored" : "student.updated",
    entity_type: "student",
    entity_id: data.id,
    entity_name: data.full_name,
    metadata: updates,
  });

  return Response.json({ success: true, data });
}

export async function DELETE(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  if (auth.isTeacher) {
    return Response.json({ error: "Teachers cannot delete or archive students" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Student ID is required" }, { status: 400 });

  const admin = createAdminClient();

  // Perform soft delete: preserve all past attendance, marks, and fee payment audits
  const { data, error } = await admin
    .from("students")
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", id)
    .eq("institute_id", auth.instituteId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logAudit({
    institute_id: auth.instituteId,
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    action: "student.archived",
    entity_type: "student",
    entity_id: data.id,
    entity_name: data.full_name,
    metadata: { reason: "admin soft-delete" },
  });

  return Response.json({
    success: true,
    data,
    message: `${data.full_name} has been archived. All academic and fee records are preserved.`,
  });
}
