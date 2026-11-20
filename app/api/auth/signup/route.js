import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { institute_name, admin_name, email, password, phone, plan_tier } = body;

    if (!institute_name?.trim() || !admin_name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: "Institute name, your name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Generate unique slug
    let baseSlug = institute_name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!baseSlug) baseSlug = "academy";

    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const { data: existing } = await admin.from("institutes").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 2. Create Auth User in Supabase
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: admin_name.trim() },
    });

    if (authErr) {
      return NextResponse.json({ success: false, error: authErr.message }, { status: 400 });
    }

    const userId = authData.user.id;
    const selectedTier = plan_tier || "starter";

    // 3. Set 14-day trial
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    // 4. Create Institute Record
    const { data: instData, error: instErr } = await admin
      .from("institutes")
      .insert({
        name: institute_name.trim(),
        slug,
        contact_phone: (phone || "").trim(),
        plan_tier: selectedTier,
        is_active: true,
        signup_source: "self",
        trial_ends_at: trialEnds.toISOString(),
      })
      .select()
      .single();

    if (instErr) {
      // Cleanup auth user on failure
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ success: false, error: instErr.message }, { status: 500 });
    }

    // 5. Create Profile Record
    const { error: profErr } = await admin.from("profiles").insert({
      id: userId,
      institute_id: instData.id,
      role: "institute_admin",
      full_name: admin_name.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || "").trim(),
      password_changed: true, // Permanent password supplied during registration
    });

    if (profErr) {
      console.error("[Self Signup] Profile creation error:", profErr);
    }

    // 6. Send Welcome Email via Resend
    await sendEmail({
      to: email.trim().toLowerCase(),
      subject: `Welcome to CoachingPulse — ${institute_name} is ready!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Welcome, ${admin_name}!</h2>
          <p>Your institutional tenant <strong>${institute_name}</strong> is live with a 14-day trial on the <strong>${selectedTier}</strong> tier.</p>
          <p>You can sign in immediately at your portal with your registered email.</p>
          <div style="margin: 24px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://schoolportal.local'}/login" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Sign In to Dashboard
            </a>
          </div>
        </div>
      `,
    });

    // 7. Audit Log
    await logAudit({
      institute_id: instData.id,
      actor_id: userId,
      actor_email: email.trim().toLowerCase(),
      action: "institute.self_signup",
      entity_type: "institute",
      entity_id: instData.id,
      entity_name: instData.name,
      metadata: { plan_tier: selectedTier, slug },
    });

    return NextResponse.json({
      success: true,
      message: "Institute account created successfully! You can now log in.",
      institute: { id: instData.id, name: instData.name, slug: instData.slug },
    });
  } catch (err) {
    console.error("[Signup API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
