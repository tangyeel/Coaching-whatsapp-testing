import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function calculateGrade(obtained, max) {
  const pct = (obtained / max) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 35) return "D";
  return "F";
}

export async function GET(request, { params }) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const assessmentId = params.id;
  const admin = createAdminClient();

  const { data: assessment, error: aErr } = await admin
    .from("assessments")
    .select("*, batches(name)")
    .eq("id", assessmentId)
    .eq("institute_id", auth.instituteId)
    .single();

  if (aErr || !assessment) {
    return Response.json({ error: "Assessment not found" }, { status: 404 });
  }

  const { data: results, error: rErr } = await admin
    .from("assessment_results")
    .select(`
      *,
      student:students(id, full_name, roll_no, guardian_phone)
    `)
    .eq("assessment_id", assessmentId);

  if (rErr) return Response.json({ error: rErr.message }, { status: 500 });

  return Response.json({
    assessment,
    results: results || [],
  });
}

export async function POST(request, { params }) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const assessmentId = params.id;
  const { results } = await request.json();

  if (!Array.isArray(results)) {
    return Response.json({ error: "results array is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify assessment exists and belongs to institute
  const { data: assessment, error: aErr } = await admin
    .from("assessments")
    .select("id, max_marks")
    .eq("id", assessmentId)
    .eq("institute_id", auth.instituteId)
    .single();

  if (aErr || !assessment) {
    return Response.json({ error: "Assessment not found" }, { status: 404 });
  }

  const maxMarks = Number(assessment.max_marks);

  // Validate and format scores
  const records = [];
  for (const r of results) {
    const marksObtained = Number(r.marks_obtained);
    if (isNaN(marksObtained)) continue;

    if (marksObtained < 0 || marksObtained > maxMarks) {
      return Response.json({
        error: `Invalid score ${marksObtained} for student. Must be between 0 and ${maxMarks}`,
      }, { status: 400 });
    }

    records.push({
      assessment_id: assessmentId,
      student_id: r.student_id,
      marks_obtained: marksObtained,
      grade: calculateGrade(marksObtained, maxMarks),
      remarks: r.remarks || null,
    });
  }

  if (records.length > 0) {
    const { error: upsertErr } = await admin
      .from("assessment_results")
      .upsert(records, { onConflict: "assessment_id,student_id" });

    if (upsertErr) return Response.json({ error: upsertErr.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    savedCount: records.length,
    message: "Assessment scores saved successfully",
  });
}
