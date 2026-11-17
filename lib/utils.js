import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountInPaise, currency = "INR") {
  const amount = (Number(amountInPaise || 0) / 100).toFixed(2);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateString;
  }
}

export function normalizePhone(rawPhone) {
  if (!rawPhone) return "";
  let digits = String(rawPhone).replace(/\D/g, "");
  if (digits.length === 10) {
    digits = "91" + digits;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    // Already normalized
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = "91" + digits.substring(1);
  }
  return digits;
}

export function calculateAttendancePercentage(presentCount, totalCount, holidayCount = 0) {
  const netActiveClasses = Math.max(0, (totalCount || 0) - (holidayCount || 0));
  if (netActiveClasses === 0) return 100; // No active classes yet
  return Math.min(100, Math.round(((presentCount || 0) / netActiveClasses) * 100));
}
