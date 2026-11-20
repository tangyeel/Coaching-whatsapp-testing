import crypto from "crypto";

/**
 * Native serverless Razorpay REST client & signature verification
 * (Zero extra dependencies, uses native fetch and Node crypto)
 */

export async function createRazorpayOrder({ amountPaise, currency = "INR", receipt, notes = {} }) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    // Graceful fallback for local development or demo mode
    console.warn("[Razorpay] Keys not configured. Generating mock order ID for testing.");
    return {
      id: `order_mock_${Date.now()}`,
      amount: amountPaise,
      currency,
      receipt,
      mock: true,
    };
  }

  const authString = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authString}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency,
      receipt: receipt || `rec_${Date.now()}`,
      notes,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.description || "Failed to create Razorpay order");
  }

  return data;
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    // If testing without live keys
    return true;
  }

  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generatedSignature === signature;
}
