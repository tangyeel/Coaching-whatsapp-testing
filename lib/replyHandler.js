/**
 * Natural language intent parser & automated response builder
 * for inbound parent WhatsApp replies (e.g. "BALANCE", "FEES", "ATTENDANCE", "HELP")
 */

export function parseIntent(text) {
  if (!text) return "help";
  const clean = text.trim().toUpperCase();

  if (/^(BAL|BALANCE|FEE|FEES|PENDING|DUE|AMOUNT)/i.test(clean)) {
    return "balance";
  }

  if (/^(ATT|ATTENDANCE|PRESENT|ABSENT|CLASS|CLASSES)/i.test(clean)) {
    return "attendance";
  }

  if (/^(PAID|RECEIPT|PAYMENT|RECIEPT)/i.test(clean)) {
    return "receipt";
  }

  return "help";
}

export function buildInboundReply({ intent, student, institute, invoices = [], attendanceRecords = [] }) {
  const instituteName = institute?.name || "Coaching Institute";
  const studentName = student?.full_name || "Student";

  if (intent === "balance") {
    const unpaidInvoices = (invoices || []).filter((i) => i.status !== "paid");
    if (unpaidInvoices.length === 0) {
      return `Hello! All fee installments for *${studentName}* at ${instituteName} are fully cleared. No outstanding dues! Thank you.`;
    }

    const totalDuePaise = unpaidInvoices.reduce((acc, i) => acc + (i.amount_due - (i.amount_paid || 0)), 0);
    const totalDueRupees = (totalDuePaise / 100).toLocaleString("en-IN");
    const nextDue = unpaidInvoices[0]?.due_date || "Soon";

    return `*Fee Status for ${studentName}*\n\nOutstanding Balance: *₹${totalDueRupees}*\nEarliest Due Date: *${nextDue}*\nPending Invoices: ${unpaidInvoices.length}\n\nPlease contact ${instituteName} admin office for online payment or receipt queries.`;
  }

  if (intent === "attendance") {
    const total = attendanceRecords.length;
    if (total === 0) {
      return `*Attendance for ${studentName}*\n\nNo attendance records found for this current academic session yet at ${instituteName}.`;
    }

    const presentCount = attendanceRecords.filter((r) => r.status === "present").length;
    const pct = Math.round((presentCount / total) * 100);

    return `*Attendance Report for ${studentName}*\n\nAttended: *${presentCount}* of *${total}* classes\nAttendance Rate: *${pct}%*\n\nMaintained by ${instituteName}.`;
  }

  if (intent === "receipt") {
    const paidInvoices = (invoices || []).filter((i) => (i.amount_paid || 0) > 0);
    if (paidInvoices.length === 0) {
      return `No recent payment receipts found on file for *${studentName}*. Please check with ${instituteName} front desk.`;
    }

    const lastPaid = paidInvoices[0];
    const amountRupees = ((lastPaid.amount_paid || 0) / 100).toLocaleString("en-IN");

    return `*Last Payment Acknowledgment*\n\nStudent: ${studentName}\nInvoice: ${lastPaid.invoice_no}\nAmount Paid: *₹${amountRupees}*\nStatus: ${lastPaid.status.toUpperCase()}\n\nThank you for supporting ${instituteName}!`;
  }

  // Fallback: Help menu
  return `*Welcome to ${instituteName} Automated Desk*\n\nYou can reply with any of these keywords:\n\n• *FEES* - View outstanding fee balance\n• *ATTENDANCE* - Check current class attendance %\n• *PAID* - View recent payment receipt\n• *HELP* - Display this help guide\n\nFor personal assistance, please call ${institute?.contact_phone || "the institute office"}.`;
}
