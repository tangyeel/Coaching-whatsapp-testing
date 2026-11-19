import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseIntent, buildInboundReply } from "@/lib/replyHandler";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Verification handshake for Meta Cloud API webhook subscription.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "school_portal_verify_token";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[Meta Webhook] Successfully verified webhook subscription.");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden: Verification token mismatch", { status: 403 });
}

/**
 * Inbound webhook event handler for Meta WhatsApp messages & delivery receipts.
 */
export async function POST(request) {
  try {
    const rawBody = await request.text();
    const appSecret = process.env.META_APP_SECRET;

    // Optional cryptographic signature check if META_APP_SECRET is configured
    if (appSecret) {
      const signature = request.headers.get("x-hub-signature-256");
      if (signature) {
        const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
        if (signature !== expected) {
          console.warn("[Meta Webhook] Signature verification failed.");
          return new Response("Invalid signature", { status: 403 });
        }
      }
    }

    const body = JSON.parse(rawBody || "{}");

    // Fast ACK: Meta expects 200 OK within 3 seconds
    // Process asynchronously if needed
    if (body.object === "whatsapp_business_account") {
      const entries = body.entry || [];
      const admin = createAdminClient();

      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (!value) continue;

          const metadata = value.metadata;
          const phoneNumberId = metadata?.phone_number_id;
          const messages = value.messages || [];

          for (const msg of messages) {
            if (msg.type !== "text") continue; // Process text commands

            const senderPhone = msg.from;
            const textContent = msg.text?.body?.trim() || "";

            // Find matching institute by phone_number_id
            let institute = null;
            if (phoneNumberId) {
              const { data: inst } = await admin
                .from("institutes")
                .select("*")
                .eq("phone_number_id", phoneNumberId)
                .single();
              institute = inst;
            }

            if (!institute) continue;

            // Search for student with matching parent phone
            const cleanedPhone = senderPhone.replace(/\D/g, "");
            const last10Digits = cleanedPhone.slice(-10);

            const { data: matchedStudents } = await admin
              .from("students")
              .select("id, full_name, guardian_phone, student_phone, batch_id")
              .eq("institute_id", institute.id)
              .or(`guardian_phone.ilike.%${last10Digits}%,student_phone.ilike.%${last10Digits}%`)
              .is("deleted_at", null)
              .limit(1);

            const student = matchedStudents?.[0] || null;

            // Fetch fees and attendance if student matched
            let invoices = [];
            let attendanceRecords = [];

            if (student) {
              const { data: invs } = await admin
                .from("fee_invoices")
                .select("*")
                .eq("student_id", student.id)
                .order("due_date", { ascending: true });
              invoices = invs || [];

              const { data: atts } = await admin
                .from("attendance_records")
                .select("status, created_at")
                .eq("student_id", student.id)
                .order("created_at", { ascending: false })
                .limit(30);
              attendanceRecords = atts || [];
            }

            const intent = parseIntent(textContent);
            const replyText = buildInboundReply({
              intent,
              student,
              institute,
              invoices,
              attendanceRecords,
            });

            // Dispatch response back via Meta Cloud API
            if (institute.whatsapp_token && institute.phone_number_id) {
              try {
                await fetch(`https://graph.facebook.com/v19.0/${institute.phone_number_id}/messages`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${institute.whatsapp_token}`,
                  },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: senderPhone,
                    type: "text",
                    text: { body: replyText },
                  }),
                });
              } catch (dispatchErr) {
                console.error("[Inbound Reply] Dispatch failed:", dispatchErr);
              }
            }

            // Log inbound interaction into message_jobs
            await admin.from("message_jobs").insert({
              institute_id: institute.id,
              recipient_phone: senderPhone,
              template_name: `inbound_${intent}`,
              status: "delivered",
            });
          }
        }
      }
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("[Meta Webhook API] Error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
