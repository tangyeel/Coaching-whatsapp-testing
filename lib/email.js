/**
 * Email dispatch helper via Resend REST API (zero extra dependencies).
 * Requires RESEND_API_KEY and optionally RESEND_FROM_EMAIL in env.
 */

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "notifications@schoolportal.local";

  if (!apiKey) {
    console.warn("[Email Service] RESEND_API_KEY not configured. Skipping email dispatch to:", to);
    return { success: false, skipped: true, error: "RESEND_API_KEY missing" };
  }

  if (!to) {
    return { success: false, error: "Recipient email is required" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html || text,
        text: text,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[Email Service] Resend API error:", data);
      return { success: false, error: data?.message || "Failed to send email" };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error("[Email Service] Network/Runtime error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Pre-formatted templates for school communication fallback
 */
export const EmailTemplates = {
  attendanceAbsent: ({ studentName, date, batchName, instituteName }) => ({
    subject: `[Attendance Alert] ${studentName} was absent today (${date})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Attendance Alert</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          Dear Parent/Guardian,
        </p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          This is to notify you that <strong>${studentName}</strong> was marked <span style="color: #ef4444; font-weight: bold;">ABSENT</span> on <strong>${date}</strong> for the batch <strong>${batchName}</strong> at <strong>${instituteName}</strong>.
        </p>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          If this was an excused absence or you have questions, please reach out to the institute administration.
        </p>
      </div>
    `,
  }),

  feeReminder: ({ studentName, amountFormatted, dueDate, instituteName }) => ({
    subject: `[Fee Reminder] Pending fee installment for ${studentName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Fee Payment Reminder</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          Dear Parent/Guardian,
        </p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          This is a friendly reminder that an installment of <strong>${amountFormatted}</strong> for <strong>${studentName}</strong> is due on <strong>${dueDate}</strong> at <strong>${instituteName}</strong>.
        </p>
        <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #1e293b; font-weight: 600;">Due Amount: ${amountFormatted}</p>
          <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Due Date: ${dueDate}</p>
        </div>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          Please settle the outstanding balance promptly. Thank you for your continued support!
        </p>
      </div>
    `,
  }),
};
