import { normalizePhone } from "@/lib/utils";

export const META_API_VERSION = "v21.0";

/**
 * Standard WhatsApp template parameter schemas
 */
export function formatTemplateParameters(templateKey, data, schoolName = "School") {
  switch (templateKey) {
    case "marks_update":
      // Schema: student_name, test_name, max_marks, marks_obtained, test_date, school_name
      return [
        { type: "text", text: String(data.student_name || "Student").trim() },
        { type: "text", text: String(data.test_name || "Test").trim() },
        { type: "text", text: String(data.max_marks || "100").trim() },
        { type: "text", text: String(data.marks_obtained || "0").trim() },
        { type: "text", text: String(data.test_date || "Today").trim() },
        { type: "text", text: String(schoolName).trim() },
      ];

    case "attendance_absent":
      // Schema: student_name, batch_name, attendance_date, school_name
      return [
        { type: "text", text: String(data.student_name || "Student").trim() },
        { type: "text", text: String(data.batch_name || "Class").trim() },
        { type: "text", text: String(data.attendance_date || "Today").trim() },
        { type: "text", text: String(schoolName).trim() },
      ];

    case "fee_reminder":
      // Schema: guardian_name, student_name, invoice_no, amount_due, due_date, school_name
      return [
        { type: "text", text: String(data.guardian_name || "Parent/Guardian").trim() },
        { type: "text", text: String(data.student_name || "Student").trim() },
        { type: "text", text: String(data.invoice_no || "").trim() },
        { type: "text", text: String(data.amount_due || "0").trim() },
        { type: "text", text: String(data.due_date || "Immediate").trim() },
        { type: "text", text: String(schoolName).trim() },
      ];

    default:
      // Fallback for custom params
      if (Array.isArray(data.params)) {
        return data.params.map(p => ({ type: "text", text: String(p || " ").trim() || " " }));
      }
      return [];
  }
}

/**
 * Dispatches a WhatsApp template message to Meta Graph API
 */
export async function dispatchWhatsAppMessage({
  phoneNumberId,
  accessToken,
  recipientPhone,
  templateName,
  parameters,
  languageCode = "en",
}) {
  const normalizedTo = normalizePhone(recipientPhone);
  if (!normalizedTo) {
    throw new Error("Invalid recipient phone number");
  }

  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp credentials not configured for this institute");
  }

  const payload = {
    messaging_product: "whatsapp",
    to: normalizedTo,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: "body",
          parameters: parameters,
        },
      ],
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const resJson = await response.json();

  if (!response.ok) {
    const errorMsg =
      resJson.error?.error_data?.details ||
      resJson.error?.message ||
      "Unknown WhatsApp API Error";
    throw new Error(`WhatsApp API Error (${response.status}): ${errorMsg}`);
  }

  return {
    success: true,
    messageId: resJson.messages?.[0]?.id,
    data: resJson,
  };
}
