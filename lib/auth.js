import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getAuthContext(request) {
  let user = null;
  const authHeader = request?.headers?.get("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        user = await res.json();
      }
    } catch (err) {
      console.error("[Auth] Token verification failed:", err);
    }
  }

  // Fallback to cookie-based session
  if (!user) {
    try {
      const supabase = createServerSupabase();
      const { data: { user: cookieUser } } = await supabase.auth.getUser();
      user = cookieUser;
    } catch (err) {
      console.error("[Auth] Cookie session lookup failed:", err);
    }
  }

  if (!user) {
    return { user: null, profile: null, error: "Unauthorized", status: 401 };
  }

  // Fetch user profile using admin client (bypasses RLS bootstrap)
  const admin = createAdminClient();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("*, institutes(*)")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    return { user, profile: null, error: "Profile not found", status: 404 };
  }

  if (!profile.is_active) {
    return { user, profile, error: "Account deactivated", status: 403 };
  }

  return {
    user,
    profile,
    role: profile.role,
    instituteId: profile.institute_id,
    institute: profile.institutes,
    isGlobalAdmin: profile.role === "global_admin",
    isInstituteAdmin: profile.role === "institute_admin",
    isTeacher: profile.role === "teacher",
  };
}

export function checkInstituteAccess(authContext, targetInstituteId) {
  if (authContext.isGlobalAdmin) return true;
  return authContext.instituteId === targetInstituteId;
}
