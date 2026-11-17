import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const receiptNo = searchParams.get("receipt_no");
  const invoiceId = searchParams.get("invoice_id");

  const admin = createAdminClient();
  let query = admin
    .from("fee_payments")
    .select(`
      *,
      student:students(full_name, roll_no, guardian_name, guardian_phone, batches(name)),
      invoice:fee_invoices(invoice_no, title, amount_due, amount_paid, status),
      collector:profiles(full_name)
    `)
    .eq("institute_id", auth.instituteId)
    .order("created_at", { ascending: false });

  if (receiptNo) query = query.eq("receipt_no", receiptNo);
  if (invoiceId) query = query.eq("invoice_id", invoiceId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data: receiptNo ? data?.[0] || null : data });
}

export async function POST(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  if (auth.isTeacher) return Response.json({ error: "Only institute admins can record payments" }, { status: 403 });

  const body = await request.json();
  const { invoice_id, amount, payment_mode, reference_no, payment_date, notes } = body;

  if (!invoice_id || !amount || !payment_mode) {
    return Response.json({ error: "Invoice ID, amount, and payment mode are required" }, { status: 400 });
  }

  const validModes = ["cash", "upi", "bank_transfer", "cheque", "online"];
  if (!validModes.includes(payment_mode.toLowerCase())) {
    return Response.json({ error: `Invalid payment mode. Must be one of: ${validModes.join(", ")}` }, { status: 400 });
  }

  const amountInPaise = Math.round(Number(amount) * 100);
  if (isNaN(amountInPaise) || amountInPaise <= 0) {
    return Response.json({ error: "Amount must be a positive number" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Fetch invoice to verify student & institute
  const { data: invoice, error: invErr } = await admin
    .from("fee_invoices")
    .select("id, student_id, amount_due, amount_paid, status, student:students(full_name, roll_no)")
    .eq("id", invoice_id)
    .eq("institute_id", auth.instituteId)
    .single();

  if (invErr || !invoice) {
    return Response.json({ error: "Invoice not found in your institute" }, { status: 404 });
  }

  // 2. Generate Receipt Number: REC-YYYY-XXXXX
  const prefix = auth.institute?.receipt_prefix || "REC";
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const receiptNo = `${prefix}-${year}-${randomSuffix}`;

  // 3. Insert payment (the database trigger sync_invoice_balance will auto-update the invoice!)
  const { data: payment, error: payErr } = await admin
    .from("fee_payments")
    .insert([
      {
        institute_id: auth.instituteId,
        invoice_id,
        student_id: invoice.student_id,
        receipt_no: receiptNo,
        amount: amountInPaise,
        payment_mode: payment_mode.toLowerCase(),
        reference_no: reference_no?.trim() || null,
        payment_date: payment_date || new Date().toISOString().split("T")[0],
        collected_by: auth.user.id,
        notes: notes?.trim() || null,
      },
    ])
    .select(`
      *,
      student:students(full_name, roll_no, guardian_name, guardian_phone, batches(name)),
      invoice:fee_invoices(invoice_no, title, amount_due, amount_paid, status)
    `)
    .single();

  if (payErr) return Response.json({ error: payErr.message }, { status: 500 });

  return Response.json({
    success: true,
    data: payment,
    receipt_no: receiptNo,
    message: "Payment recorded successfully",
  });
}
