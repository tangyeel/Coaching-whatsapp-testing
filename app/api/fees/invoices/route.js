import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("student_id");
  const status = searchParams.get("status");

  const admin = createAdminClient();
  let query = admin
    .from("fee_invoices")
    .select(`
      *,
      student:students(id, full_name, roll_no, guardian_name, guardian_phone, batches(name)),
      payments:fee_payments(id, receipt_no, amount, payment_mode, payment_date, reference_no)
    `)
    .eq("institute_id", auth.instituteId)
    .order("created_at", { ascending: false });

  if (studentId) query = query.eq("student_id", studentId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function POST(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  if (auth.isTeacher) return Response.json({ error: "Only institute admins can create invoices" }, { status: 403 });

  const body = await request.json();
  const { student_id, bulk_batch_id, title, amount_due, due_date } = body;

  if (!title?.trim() || !amount_due || !due_date) {
    return Response.json({ error: "Title, amount_due, and due_date are required" }, { status: 400 });
  }

  const amountInPaise = Math.round(Number(amount_due) * 100);
  if (isNaN(amountInPaise) || amountInPaise <= 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }

  const admin = createAdminClient();
  const prefix = auth.institute?.invoice_prefix || "INV";
  const year = new Date().getFullYear();

  // --- BRANCH 1: BULK INVOICE FOR AN ENTIRE BATCH ---
  if (bulk_batch_id) {
    const { data: batchStudents, error: fetchErr } = await admin
      .from("students")
      .select("id, full_name, roll_no")
      .eq("institute_id", auth.instituteId)
      .eq("batch_id", bulk_batch_id)
      .is("deleted_at", null);

    if (fetchErr) return Response.json({ error: fetchErr.message }, { status: 500 });
    if (!batchStudents || batchStudents.length === 0) {
      return Response.json({ error: "No active students found in the selected batch" }, { status: 400 });
    }

    const rows = batchStudents.map((s, idx) => {
      const randomSuffix = Math.floor(10000 + Math.random() * 89999);
      const invoiceNo = `${prefix}-${year}-${randomSuffix}${idx}`;
      return {
        institute_id: auth.instituteId,
        student_id: s.id,
        invoice_no: invoiceNo,
        title: title.trim(),
        amount_due: amountInPaise,
        amount_paid: 0,
        due_date,
        status: "unpaid",
        created_by: auth.user.id,
        fee_reminder_autopilot: Boolean(auth.institute?.fee_reminder_autopilot),
      };
    });

    const { data: createdInvoices, error: insertErr } = await admin
      .from("fee_invoices")
      .insert(rows)
      .select(`
        *,
        student:students(full_name, roll_no, guardian_name, guardian_phone, batches(name))
      `);

    if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

    return Response.json({
      success: true,
      bulk: true,
      createdCount: createdInvoices.length,
      data: createdInvoices,
    });
  }

  // --- BRANCH 2: INDIVIDUAL STUDENT INVOICE ---
  if (!student_id) {
    return Response.json({ error: "Student ID or Batch ID is required" }, { status: 400 });
  }

  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const invoiceNo = `${prefix}-${year}-${randomSuffix}`;

  const { data, error } = await admin
    .from("fee_invoices")
    .insert([
      {
        institute_id: auth.instituteId,
        student_id,
        invoice_no: invoiceNo,
        title: title.trim(),
        amount_due: amountInPaise,
        amount_paid: 0,
        due_date,
        status: "unpaid",
        created_by: auth.user.id,
        fee_reminder_autopilot: Boolean(auth.institute?.fee_reminder_autopilot),
      },
    ])
    .select(`
      *,
      student:students(full_name, roll_no, guardian_name, guardian_phone, batches(name))
    `)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, data });
}
