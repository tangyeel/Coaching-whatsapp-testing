"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import {
  ShieldCheck, Plus, School, Users, Layers, AlertCircle,
  CheckCircle2, XCircle, Search, KeyRound, ExternalLink, Activity
} from "lucide-react";

export default function GlobalAdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [institutes, setInstitutes] = useState([]);
  const [search, setSearch] = useState("");

  // Onboard New Institute Modal
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    name: "",
    admin_name: "",
    email: "",
    password: "",
    contact_phone: "",
    address: "",
    whatsapp_token: "",
    phone_number_id: "",
    invoice_prefix: "INV",
    receipt_prefix: "REC",
  });
  const [onboarding, setOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState("");

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const res = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { router.replace("/login"); return; }

      const data = await res.json();
      if (data.role !== "global_admin") {
        router.replace(data.role === "teacher" ? "/teacher" : "/dashboard");
        return;
      }

      setProfile(data.profile);
      setLoading(false);
      fetchInstitutes();
    }
    init();
  }, []);

  async function fetchInstitutes() {
    try {
      const res = await fetch("/api/admin/institutes");
      const json = await res.json();
      if (json.data) setInstitutes(json.data);
    } catch (err) { console.error(err); }
  }

  async function handleOnboard(e) {
    e.preventDefault();
    setOnboarding(true);
    setOnboardError("");

    try {
      const res = await fetch("/api/admin/institutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(onboardForm),
      });

      const json = await res.json();
      if (json.success) {
        setShowOnboardModal(false);
        setOnboardForm({
          name: "",
          admin_name: "",
          email: "",
          password: "",
          contact_phone: "",
          address: "",
          whatsapp_token: "",
          phone_number_id: "",
          invoice_prefix: "INV",
          receipt_prefix: "REC",
        });
        fetchInstitutes();
        alert(json.message);
      } else {
        setOnboardError(json.error || "Onboarding failed");
      }
    } catch (err) {
      setOnboardError(err.message || "An unexpected error occurred");
    } finally {
      setOnboarding(false);
    }
  }

  async function toggleInstituteActive(institute) {
    if (!confirm(`Are you sure you want to ${institute.is_active ? "suspend" : "reactivate"} ${institute.name}?`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/institutes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: institute.id,
          is_active: !institute.is_active,
        }),
      });

      const json = await res.json();
      if (json.success) {
        fetchInstitutes();
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredInstitutes = institutes.filter(inst =>
    inst.name?.toLowerCase().includes(search.toLowerCase()) ||
    inst.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const totalTenants = institutes.length;
  const activeTenants = institutes.filter(i => i.is_active).length;
  let totalPlatformStudents = 0;
  institutes.forEach(i => {
    totalPlatformStudents += Number(i.students_count?.[0]?.count || 0);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar profile={profile} institute={{ name: "Global Admin Platform" }} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Platform Institutes & Tenants</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-tenant management &bull; Zero-leakage RLS isolation &bull; Instant onboarding
            </p>
          </div>

          <button
            onClick={() => setShowOnboardModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-purple-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New Institute (60s)</span>
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">Total Institutes</span>
              <School className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-white">{totalTenants}</div>
            <div className="text-xs text-emerald-400 mt-1 font-medium">{activeTenants} active &bull; {totalTenants - activeTenants} suspended</div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">Total Students</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-black text-white">{totalPlatformStudents}</div>
            <div className="text-xs text-slate-500 mt-1">Platform-wide student enrollments</div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">System Isolation</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>RLS Active</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Database-level tenant boundaries</div>
          </div>
        </div>

        {/* Search & Tenant Table */}
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by institute name or slug..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/70 text-slate-400 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Institute Name</th>
                  <th className="py-3 px-4">Admin Email</th>
                  <th className="py-3 px-4">WhatsApp Cloud API</th>
                  <th className="py-3 px-4 text-center">Batches / Students</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInstitutes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      No institutes registered yet. Click "Onboard New Institute" to provision the first one.
                    </td>
                  </tr>
                ) : (
                  filteredInstitutes.map(inst => {
                    const hasWhatsApp = Boolean(inst.whatsapp_token && inst.phone_number_id);
                    const adminProfile = inst.profiles?.find(p => p.role === "institute_admin");
                    const studentCount = inst.students_count?.[0]?.count || 0;
                    const batchCount = inst.batches_count?.[0]?.count || 0;

                    return (
                      <tr key={inst.id} className="hover:bg-slate-800/30">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{inst.name}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{inst.slug}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-300 font-mono">
                          {adminProfile?.email || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium ${
                            hasWhatsApp
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            <KeyRound className="w-3 h-3" />
                            <span>{hasWhatsApp ? "Configured" : "Missing Credentials"}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-300">
                          {batchCount} batches &bull; {studentCount} students
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inst.is_active
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {inst.is_active ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleInstituteActive(inst)}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                              inst.is_active
                                ? "bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white"
                                : "bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white"
                            }`}
                          >
                            {inst.is_active ? "Suspend" : "Reactivate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal: Rapid 60-Second Onboarding */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Onboard New Institute</h3>
                <p className="text-xs text-slate-400 mt-0.5">Provisions tenant, admin account & default batch in 60s</p>
              </div>
              <button onClick={() => setShowOnboardModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleOnboard} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Institute Name</label>
                <input
                  type="text"
                  required
                  placeholder="Omega Coaching Academy"
                  value={onboardForm.name}
                  onChange={e => setOnboardForm({ ...onboardForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Email</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@omega.com"
                    value={onboardForm.email}
                    onChange={e => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={onboardForm.password}
                    onChange={e => setOnboardForm({ ...onboardForm, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Meta WhatsApp Cloud API (Optional now, configurable later)
                </span>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Permanent Meta Access Token</label>
                  <input
                    type="password"
                    placeholder="EAAB..."
                    value={onboardForm.whatsapp_token}
                    onChange={e => setOnboardForm({ ...onboardForm, whatsapp_token: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone Number ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 1092837465..."
                    value={onboardForm.phone_number_id}
                    onChange={e => setOnboardForm({ ...onboardForm, phone_number_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {onboardError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                  {onboardError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboarding}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-900/30"
                >
                  {onboarding ? "Provisioning Tenant..." : "Complete Onboarding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
