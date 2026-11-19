import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batch_id");
    const admin = createAdminClient();
    const instituteId = auth.instituteId;

    // 1. Fetch sessions for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDateStr = thirtyDaysAgo.toISOString().split("T")[0];

    let sessionQuery = admin
      .from("attendance_sessions")
      .select(`
        id,
        session_date,
        batch_id,
        batches(id, name),
        records:attendance_records(id, student_id, status, student:students(id, full_name, roll_no, guardian_phone))
      `)
      .eq("institute_id", instituteId)
      .gte("session_date", startDateStr)
      .order("session_date", { ascending: true });

    if (batchId) {
      sessionQuery = sessionQuery.eq("batch_id", batchId);
    }

    const { data: sessions, error } = await sessionQuery;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 2. Aggregate daily trend data
    const dailyMap = {};
    const batchMap = {};
    const studentAbsenceMap = {};

    (sessions || []).forEach((session) => {
      const date = session.session_date;
      const batchName = session.batches?.name || "Unassigned";

      if (!dailyMap[date]) {
        dailyMap[date] = { date, present: 0, absent: 0, total: 0 };
      }

      if (!batchMap[batchName]) {
        batchMap[batchName] = { batch_name: batchName, present: 0, total: 0 };
      }

      (session.records || []).forEach((rec) => {
        dailyMap[date].total += 1;
        batchMap[batchName].total += 1;

        if (rec.status === "present") {
          dailyMap[date].present += 1;
          batchMap[batchName].present += 1;
        } else if (rec.status === "absent") {
          dailyMap[date].absent += 1;

          // Track consecutive / high absences
          if (rec.student?.id) {
            const sid = rec.student.id;
            if (!studentAbsenceMap[sid]) {
              studentAbsenceMap[sid] = {
                student_id: sid,
                student_name: rec.student.full_name,
                roll_no: rec.student.roll_no,
                phone: rec.student.guardian_phone,
                batch: batchName,
                absence_count: 0,
              };
            }
            studentAbsenceMap[sid].absence_count += 1;
          }
        }
      });
    });

    const dailyTrend = Object.values(dailyMap).map((d) => ({
      ...d,
      pct: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
    }));

    const batchComparison = Object.values(batchMap).map((b) => ({
      ...b,
      avg_pct: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0,
    }));

    // Identify at-risk students (3 or more absences in the period)
    const atRiskStudents = Object.values(studentAbsenceMap)
      .filter((s) => s.absence_count >= 3)
      .sort((a, b) => b.absence_count - a.absence_count)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      dailyTrend,
      batchComparison,
      atRiskStudents,
      totalSessionsAnalyzed: sessions?.length || 0,
    });
  } catch (err) {
    console.error("[Attendance Analytics API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
