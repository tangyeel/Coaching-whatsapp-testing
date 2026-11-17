import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batch_id");
  if (!batchId) return Response.json({ error: "batch_id is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("assessments")
    .select(`
      *,
      results_count:assessment_results(count)
    `)
    .eq("batch_id", batchId)
    .eq("institute_id", auth.instituteId)
    .order("date", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function POST(request) {
  const auth = await getAuthContext(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { batch_id, title, subject, max_marks, date } = body;

  if (!batch_id || !title?.trim() || !max_marks || !date) {
    return Response.json({ error: "Title, subject, max_marks, and date are required" }, { status: 400 });
  }

  const numericMaxMarks = Number(max_marks);
  if (isNaN(numericMaxMarks) || numericMaxMarks <= 0) {
    return Response.json({ error: "Max marks must be a positive number" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("assessments")
    .insert([
      {
        institute_id: auth.instituteId,
        batch_id,
        title: title.trim(),
        subject: (subject || "General").trim(),
        max_marks: numericMaxMarks,
        date,
        created_by: auth.user.id,
      },
    ])
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, data });
}
