"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, LogOut, Shield, School, UserCheck } from "lucide-react";

export default function Navbar({ profile, institute }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const roleLabels = {
    global_admin: { label: "Global Admin", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Shield },
    institute_admin: { label: "Admin", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: School },
    teacher: { label: "Teacher", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: UserCheck },
  };

  const roleInfo = roleLabels[profile?.role] || roleLabels.teacher;
  const RoleIcon = roleInfo.icon;

  return (
    <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {institute?.logo_url && profile?.role !== "global_admin" ? (
            <img
              src={institute.logo_url}
              alt={institute.name || "Logo"}
              className="h-9 w-auto max-w-[44px] max-h-9 object-contain rounded-lg bg-white/5 p-0.5"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md text-white font-bold text-sm"
              style={{
                backgroundColor: profile?.role === "global_admin" ? "#7c3aed" : (institute?.banner_color || "#2563eb")
              }}
            >
              {profile?.role === "global_admin" ? (
                <Shield className="w-5 h-5 text-white" />
              ) : (
                <GraduationCap className="w-5 h-5 text-white" />
              )}
            </div>
          )}
          <div>
            <span className="font-semibold text-sm tracking-tight text-white block">
              {profile?.role === "global_admin" ? "Global Admin Portal" : (institute?.name || "Institute Portal")}
            </span>
            {institute?.contact_phone && profile?.role !== "global_admin" && (
              <span className="text-[10px] text-slate-500 block">{institute.contact_phone}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${roleInfo.color}`}>
            <RoleIcon className="w-3.5 h-3.5" />
            <span>{roleInfo.label}</span>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-slate-200">{profile?.full_name || "User"}</div>
            <div className="text-[10px] text-slate-500">{profile?.email}</div>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
