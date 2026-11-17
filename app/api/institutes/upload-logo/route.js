import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const auth = await getAuthContext(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

    if (!auth.isInstituteAdmin && !auth.isGlobalAdmin) {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") || formData.get("logo");
    const bannerColor = formData.get("banner_color");
    const instituteId = auth.isGlobalAdmin && formData.get("institute_id") 
      ? formData.get("institute_id") 
      : auth.instituteId;

    if (!instituteId) {
      return Response.json({ error: "Institute ID required" }, { status: 400 });
    }

    const admin = createAdminClient();
    let finalLogoUrl = null;

    if (file && typeof file === "object" && file.size > 0) {
      // Validate file size (< 2MB)
      if (file.size > 2 * 1024 * 1024) {
        return Response.json({ error: "Logo image must be smaller than 2MB" }, { status: 400 });
      }

      const mimeType = file.type || "image/png";
      const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
      if (!validTypes.includes(mimeType)) {
        return Response.json({ error: "Supported image formats: PNG, JPG, WebP, SVG" }, { status: 400 });
      }

      const ext = mimeType.split("/")[1]?.replace("+xml", "") || "png";
      const filePath = `${instituteId}/logo.${ext}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      try {
        // Attempt upload to Supabase Storage 'institute-assets' bucket
        const { error: uploadError } = await admin.storage
          .from("institute-assets")
          .upload(filePath, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadError) {
          const { data: { publicUrl } } = admin.storage
            .from("institute-assets")
            .getPublicUrl(filePath);
          finalLogoUrl = publicUrl;
        } else {
          // Resilient fallback: base64 data URI if bucket not yet created
          finalLogoUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
        }
      } catch (storageErr) {
        // Fallback to base64
        finalLogoUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
      }
    }

    const updates = {};
    if (finalLogoUrl) updates.logo_url = finalLogoUrl;
    if (bannerColor) updates.banner_color = String(bannerColor).trim();

    if (Object.keys(updates).length > 0) {
      const { data, error: updateErr } = await admin
        .from("institutes")
        .update(updates)
        .eq("id", instituteId)
        .select()
        .single();

      if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

      return Response.json({
        success: true,
        logo_url: data.logo_url,
        banner_color: data.banner_color,
        message: "Branding updated successfully",
      });
    }

    return Response.json({ success: true, message: "No updates provided" });
  } catch (err) {
    console.error("[Upload Logo] Error:", err);
    return Response.json({ error: err.message || "Failed to process logo upload" }, { status: 500 });
  }
}
