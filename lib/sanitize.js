/**
 * WhatsApp message & template parameter sanitization helper.
 * Prevents control character injection, trims whitespace, and bounds length.
 */

export function sanitizeWhatsAppParam(str, maxLength = 250) {
  if (str === null || str === undefined) return "";

  return String(str)
    .replace(/[\r\n\t]+/g, " ") // Collapse newlines and tabs into single space
    .replace(/[<>]/g, "")        // Remove HTML-like tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Strip control characters
    .trim()
    .slice(0, maxLength);
}

export function sanitizeBroadcastBody(body, maxLength = 1000) {
  if (!body) return "";

  return String(body)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "") // Strip dangerous non-printable chars
    .trim()
    .slice(0, maxLength);
}
