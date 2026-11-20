import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const userEmail = authContext.user.email?.toLowerCase();
    const userId = authContext.user.id;

    // Find student either by auth_user_id or by email or profile phone
    let student = null;

    const { data: s1 } = await admin
      .from("students")
      .select("*, batches(id, name, academic_year), institutes(id, name, logo_url, banner_color, contact_phone)")
      .eq("auth_user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (s1) {
      student = s1;
    } else if (userEmail) {
      const { data: s2 } = await admin
        .from("students")
        .select("*, batches(id, name, academic_year), institutes(id, name, logo_url, banner_color, contact_phone)")
        .eq("email", userEmail)
        .is("deleted_at", null)
        .maybeSingle();
      student = s2;
    }

    if (!student) {
      return NextResponse.json({
        success: false,
        error: "No active student enrollment profile linked with your account. Contact your institute administrator.",
      }, { status: 404 });
    }

    // 1. Fetch attendance records
    const { data: attendance } = await admin
      .from("attendance_records")
      .select("id, status, created_at, session:attendance_sessions(session_date)")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .limit(60);

    const totalAttendance = attendance?.length || 0;
    const presentAttendance = (attendance || []).filter((a) => a.status === "present").length;
    const attendancePct = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 100;

    // 2. Fetch fee invoices
    const { data: invoices } = await admin
      .from("fee_invoices")
      .select("id, invoice_no, title, amount_due, amount_paid, due_date, status, created_at")
      .eq("student_id", student.id)
      .order("due_date", { ascending: false });

    // 3. Fetch assessment marks
    const { data: results } = await admin
      .from("assessment_results")
      .select("id, marks_obtained, is_absent, remarks, assessment:assessments(id, title, max_marks, test_date)")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.full_name,
        roll_no: student.roll_no,
        batch: student.batches?.name || "Unassigned",
        academic_year: student.batches?.academic_year || "",
        institute: student.institutes,
      },
      attendance: {
        total: totalAttendance,
        present: presentAttendance,
        percentage: attendancePct,
        recentSessions: attendance || [],
      },
      invoices: invoices || [],
      assessments: results || [],
    });
  } catch (err) {
    console.error("[Student Profile API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
