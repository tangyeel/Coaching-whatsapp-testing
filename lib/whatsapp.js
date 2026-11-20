import { normalizePhone } from "@/lib/utils";
import { sanitizeWhatsAppParam } from "@/lib/sanitize";

export const META_API_VERSION = "v21.0";
export const WHATSAPP_BATCH_SIZE = 10;
export const WHATSAPP_CHUNK_DELAY_MS = 500;

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Standard WhatsApp template parameter schemas
 */
export function formatTemplateParameters(templateKey, data, schoolName = "School") {
  const cleanSchool = sanitizeWhatsAppParam(schoolName);

  switch (templateKey) {
    case "marks_update":
      // Schema: student_name, test_name, max_marks, marks_obtained, test_date, school_name
      return [
        { type: "text", text: sanitizeWhatsAppParam(data.student_name || "Student") },
        { type: "text", text: sanitizeWhatsAppParam(data.test_name || "Test") },
        { type: "text", text: sanitizeWhatsAppParam(data.max_marks || "100") },
        { type: "text", text: sanitizeWhatsAppParam(data.marks_obtained || "0") },
        { type: "text", text: sanitizeWhatsAppParam(data.test_date || "Today") },
        { type: "text", text: cleanSchool },
      ];

    case "attendance_absent":
      // Schema: student_name, batch_name, attendance_date, school_name
      return [
        { type: "text", text: sanitizeWhatsAppParam(data.student_name || "Student") },
        { type: "text", text: sanitizeWhatsAppParam(data.batch_name || "Class") },
        { type: "text", text: sanitizeWhatsAppParam(data.attendance_date || "Today") },
        { type: "text", text: cleanSchool },
      ];

    case "attendance_summary":
      // Schema: student_name, period_label, present_count, absent_count, attendance_percentage, school_name
      return [
        { type: "text", text: sanitizeWhatsAppParam(data.student_name || "Student") },
        { type: "text", text: sanitizeWhatsAppParam(data.period_label || "This Month") },
        { type: "text", text: sanitizeWhatsAppParam(data.present_count || "0") },
        { type: "text", text: sanitizeWhatsAppParam(data.absent_count || "0") },
        { type: "text", text: sanitizeWhatsAppParam(data.attendance_percentage || "100%") },
        { type: "text", text: cleanSchool },
      ];

    case "fee_reminder":
      // Schema: guardian_name, student_name, invoice_no, amount_due, due_date, school_name
      return [
        { type: "text", text: sanitizeWhatsAppParam(data.guardian_name || "Parent/Guardian") },
        { type: "text", text: sanitizeWhatsAppParam(data.student_name || "Student") },
        { type: "text", text: sanitizeWhatsAppParam(data.invoice_no || "") },
        { type: "text", text: sanitizeWhatsAppParam(data.amount_due || "0") },
        { type: "text", text: sanitizeWhatsAppParam(data.due_date || "Immediate") },
        { type: "text", text: cleanSchool },
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
    const metaCode = resJson.error?.code;
    const err = new Error(`WhatsApp API Error (${response.status}): ${errorMsg}`);
    err.status = response.status;
    err.metaCode = metaCode;
    err.data = resJson;
    throw err;
  }

  return {
    success: true,
    messageId: resJson.messages?.[0]?.id,
    data: resJson,
  };
}

/**
 * Dispatches WhatsApp message with exponential backoff retry for rate limits
 */
export async function dispatchWithRetry(params, maxRetries = 3) {
  let delay = 1000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await dispatchWhatsAppMessage(params);
    } catch (err) {
      const isRateLimit = err.status === 429 || err.metaCode === 80007;
      if (!isRateLimit || attempt === maxRetries) {
        throw err;
      }
      // Exponential backoff with jitter
      await sleep(delay + Math.random() * 500);
      delay *= 2;
    }
  }
}
