// Default template definitions with placeholder variables
export const DEFAULT_TEMPLATES = {
  attendance_absent: {
    key: "attendance_absent",
    label: "Student Absent Alert",
    category: "attendance",
    variables: ["student_name", "date", "batch_name", "institute_name"],
    defaultBody:
      "Dear parent, {{student_name}} was marked absent on {{date}} for {{batch_name}} at {{institute_name}}.",
  },
  attendance_present: {
    key: "attendance_present",
    label: "Student Present Notification",
    category: "attendance",
    variables: ["student_name", "date", "batch_name", "institute_name"],
    defaultBody:
      "Dear parent, {{student_name}} attended {{batch_name}} on {{date}} at {{institute_name}}.",
  },
  marks_update: {
    key: "marks_update",
    label: "Assessment Scorecard",
    category: "academic",
    variables: ["student_name", "subject", "marks", "total", "percentage", "institute_name"],
    defaultBody:
      "Exam Result: {{student_name}} scored {{marks}}/{{total}} ({{percentage}}%) in {{subject}} at {{institute_name}}.",
  },
  fee_reminder: {
    key: "fee_reminder",
    label: "Fee Due Reminder",
    category: "fees",
    variables: ["student_name", "amount", "due_date", "institute_name"],
    defaultBody:
      "Fee Reminder: An installment of ₹{{amount}} is due on {{due_date}} for {{student_name}} at {{institute_name}}.",
  },
  fee_paid: {
    key: "fee_paid",
    label: "Payment Acknowledgment",
    category: "fees",
    variables: ["student_name", "amount", "payment_date", "receipt_no", "institute_name"],
    defaultBody:
      "Payment Received: Received ₹{{amount}} for {{student_name}} on {{payment_date}}. Receipt No: {{receipt_no}}. Thank you, {{institute_name}}.",
  },
  announcement: {
    key: "announcement",
    label: "General Announcement",
    category: "broadcast",
    variables: ["student_name", "message", "institute_name"],
    defaultBody:
      "Notice from {{institute_name}} for {{student_name}}: {{message}}",
  },
};

/**
 * Resolve template text for an institute and interpolate variables.
 */
export async function getInterpolatedTemplate(admin, instituteId, templateKey, variables = {}) {
  const fallback = DEFAULT_TEMPLATES[templateKey]?.defaultBody || "{{message}}";

  let body = fallback;

  if (admin && instituteId) {
    try {
      const { data } = await admin
        .from("message_templates")
        .select("body, is_active")
        .eq("institute_id", instituteId)
        .eq("template_key", templateKey)
        .eq("is_active", true)
        .maybeSingle();

      if (data?.body) {
        body = data.body;
      }
    } catch (err) {
      console.warn(`[Template Resolver] Fallback used for ${templateKey}:`, err.message);
    }
  }

  // Replace {{var_name}} with supplied variables
  let interpolated = body;
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    interpolated = interpolated.replace(regex, val ?? "");
  }

  return interpolated;
}
