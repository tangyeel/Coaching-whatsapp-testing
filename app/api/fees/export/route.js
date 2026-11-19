import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = await getAuthContext(request);
    if (auth.error) return new Response(auth.error, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "csv").toLowerCase();
    const batchId = searchParams.get("batch_id");
    const statusFilter = searchParams.get("status") || "outstanding"; // "outstanding" | "all"

    const admin = createAdminClient();
    let query = admin
      .from("fee_invoices")
      .select(`
        id,
        invoice_no,
        title,
        amount_due,
        amount_paid,
        due_date,
        status,
        created_at,
        student:students(id, full_name, roll_no, guardian_name, guardian_phone, batch_id, batches(name))
      `)
      .eq("institute_id", auth.instituteId)
      .order("due_date", { ascending: true });

    if (statusFilter === "outstanding") {
      query = query.in("status", ["unpaid", "partial"]);
    }

    const { data: invoices, error } = await query;
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter by batch if specified
    const filtered = (invoices || []).filter((inv) => {
      if (!inv.student) return false;
      if (batchId && inv.student.batch_id !== batchId) return false;
      return true;
    });

    // Transform into clean tabular rows
    const rows = filtered.map((inv) => {
      const dueDate = new Date(inv.due_date);
      const isOverdue = dueDate < today && inv.status !== "paid";
      const daysOverdue = isOverdue ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
      const totalRupees = (inv.amount_due || 0) / 100;
      const paidRupees = (inv.amount_paid || 0) / 100;
      const balanceRupees = Math.max(0, totalRupees - paidRupees);

      return {
        "Student Name": inv.student?.full_name || "N/A",
        "Roll No": inv.student?.roll_no || "N/A",
        "Batch": inv.student?.batches?.name || "Unassigned",
        "Guardian Name": inv.student?.guardian_name || "N/A",
        "Guardian Phone": inv.student?.guardian_phone || "N/A",
        "Invoice No": inv.invoice_no,
        "Fee Title": inv.title,
        "Due Date": inv.due_date,
        "Status": inv.status.toUpperCase(),
        "Total Fee (INR)": totalRupees,
        "Paid (INR)": paidRupees,
        "Balance Due (INR)": balanceRupees,
        "Days Overdue": daysOverdue > 0 ? daysOverdue : 0,
        "Overdue Flag": daysOverdue > 0 ? "OVERDUE" : "CURRENT",
      };
    });

    const filenameDate = new Date().toISOString().split("T")[0];

    if (format === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fee Defaulters");
      
      // Auto-size columns
      const colWidths = Object.keys(rows[0] || {}).map((key) => ({
        wch: Math.max(key.length, 14),
      }));
      worksheet["!cols"] = colWidths;

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new Response(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="fee_defaulters_${filenameDate}.xlsx"`,
        },
      });
    }

    // Default to CSV
    if (rows.length === 0) {
      return new Response("No outstanding fee records found", {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="fee_defaulters_${filenameDate}.csv"`,
        },
      });
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = String(row[h] ?? "");
            // Escape quotes and commas
            if (val.includes(",") || val.includes('"') || val.includes("\n")) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          })
          .join(",")
      ),
    ];

    return new Response(csvLines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fee_defaulters_${filenameDate}.csv"`,
      },
    });
  } catch (err) {
    console.error("[Fee Export API] Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
