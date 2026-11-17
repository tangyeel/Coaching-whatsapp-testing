"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch("/api/auth/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        const data = await res.json();
        const role = data.role;

        // If newly onboarded institute admin hasn't set their permanent password yet
        if (role === "institute_admin" && data.profile?.password_changed === false) {
          router.replace("/setup-password");
          return;
        }

        if (role === "global_admin") {
          router.replace("/admin");
        } else if (role === "teacher") {
          router.replace("/teacher");
        } else {
          router.replace("/dashboard");
        }
      } catch (err) {
        console.error("Routing error:", err);
        router.replace("/login");
      }
    }

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading your portal...</p>
      </div>
    </div>
  );
}
