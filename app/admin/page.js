"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { formatDate } from "@/lib/utils";
import {
  ShieldCheck, Plus, School, Users, Layers, AlertCircle,
  CheckCircle2, XCircle, Search, KeyRound, ExternalLink, Activity,
  Sliders, MessageSquare, TrendingUp, TrendingDown, Clock, X
} from "lucide-react";

export default function GlobalAdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [platformStats, setPlatformStats] = useState(null);
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
    plan_tier: "starter",
    msg_limit_override: "",
  });
  const [onboarding, setOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState("");

  // Edit Plan & Quota Modal
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [selectedInstForQuota, setSelectedInstForQuota] = useState(null);
  const [quotaForm, setQuotaForm] = useState({
    plan_tier: "starter",
    msg_limit_override: "",
  });
  const [savingQuota, setSavingQuota] = useState(false);

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
  }, [router]);

  async function fetchInstitutes() {
    try {
      const res = await fetch("/api/admin/institutes?stats=true");
      const json = await res.json();
      if (json.success && json.institutes) {
        setInstitutes(json.institutes);
        setPlatformStats(json.platform);
      } else if (json.data) {
        setInstitutes(json.data);
      }
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
          plan_tier: "starter",
          msg_limit_override: "",
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

  async function handleSaveQuota(e) {
    e.preventDefault();
    if (!selectedInstForQuota) return;
    setSavingQuota(true);

    try {
      const res = await fetch(`/api/admin/institutes/${selectedInstForQuota.id}/quota`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_tier: quotaForm.plan_tier,
          msg_limit_override: quotaForm.msg_limit_override === "" ? null : quotaForm.msg_limit_override,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowQuotaModal(false);
        fetchInstitutes();
      } else {
        alert(json.error || "Failed to update quota");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingQuota(false);
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

  const totalTenants = platformStats?.totalInstitutes ?? institutes.length;
  const activeTenants = platformStats?.activeInstitutes ?? institutes.filter(i => i.is_active).length;
  const dormantTenants = platformStats?.dormantInstitutes ?? 0;
  const totalPlatformStudents = platformStats?.totalStudents ?? 0;
  const totalPlatformTeachers = platformStats?.totalTeachers ?? 0;
  const messagesThisMonth = platformStats?.messagesThisMonth ?? 0;
  const messagesPrevMonth = platformStats?.messagesPrevMonth ?? 0;

  let msgGrowth = 0;
  if (messagesPrevMonth > 0) {
    msgGrowth = Math.round(((messagesThisMonth - messagesPrevMonth) / messagesPrevMonth) * 100);
  }

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
              Multi-tenant management &bull; Zero-leakage RLS isolation &bull; Instant onboarding &bull; Meta Quota Governance
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

        {/* Overview Stats (Platform Health Panel) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">Total Institutes</span>
              <School className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-white">{totalTenants}</div>
            <div className="text-xs text-emerald-400 mt-1 font-medium">
              {activeTenants} active &bull; {totalTenants - activeTenants} suspended
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">Total Students</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-black text-white">{totalPlatformStudents}</div>
            <div className="text-xs text-slate-500 mt-1">Across {totalPlatformTeachers} active teachers</div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">WhatsApp Messages (Month)</span>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white font-mono">{messagesThisMonth.toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              {msgGrowth >= 0 ? (
                <span className="text-emerald-400 inline-flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +{msgGrowth}%
                </span>
              ) : (
                <span className="text-rose-400 inline-flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> {msgGrowth}%
                </span>
              )}
              <span className="text-slate-500">vs prev month ({messagesPrevMonth.toLocaleString()})</span>
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">Retention & Health</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            {dormantTenants > 0 ? (
              <div>
                <div className="text-3xl font-black text-amber-400">{dormantTenants}</div>
                <div className="text-xs text-amber-400/90 mt-1 font-medium">
                  Institutes dormant (&gt;14d inactivity)
                </div>
              </div>
            ) : (
              <div>
                <div className="text-lg font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All Active</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Zero dormant tenants flagged</div>
              </div>
            )}
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
                  <th className="py-3 px-4">Institute</th>
                  <th className="py-3 px-4">Admin Email</th>
                  <th className="py-3 px-4">Plan & Monthly Quota</th>
                  <th className="py-3 px-4">WhatsApp API</th>
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
                    const studentCount = inst.studentCount ?? (inst.students_count?.[0]?.count || 0);
                    const batchCount = inst.batchCount ?? (inst.batches_count?.[0]?.count || 0);

                    const effectiveLimit = inst.effectiveLimit ?? (inst.msg_limit_override || inst.plan_defaults?.msg_limit || 500);
                    const used = inst.messages_sent_this_month || 0;
                    const usagePct = effectiveLimit > 0 ? Math.min(100, Math.round((used / effectiveLimit) * 100)) : 0;

                    const barColor =
                      usagePct >= 100 ? "bg-rose-500" :
                      usagePct >= 90 ? "bg-orange-500" :
                      usagePct >= 75 ? "bg-amber-400" :
                      "bg-blue-500";

                    return (
                      <tr key={inst.id} className="hover:bg-slate-800/30">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {inst.logo_url ? (
                              <img src={inst.logo_url} alt="" className="w-6 h-6 rounded object-contain bg-white/5" />
                            ) : (
                              <div
                                className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold text-white"
                                style={{ backgroundColor: inst.banner_color || "#3b82f6" }}
                              >
                                {inst.name?.[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-white text-sm">{inst.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {inst.slug} &bull; {batchCount}b / {studentCount}s
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                          <div>{adminProfile?.email || "—"}</div>
                          {adminProfile?.password_changed === false && (
                            <span className="text-[10px] text-amber-400">⚠ Awaiting 1st login</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="capitalize font-bold text-slate-200">
                              {inst.plan_tier || "Starter"}
                              {inst.msg_limit_override !== null && inst.msg_limit_override !== undefined && (
                                <span className="text-purple-400 font-normal ml-1">(Custom)</span>
                              )}
                            </span>
                            <span className="font-mono text-slate-400">
                              {used.toLocaleString()} / {effectiveLimit === 0 ? "∞" : effectiveLimit.toLocaleString()}
                            </span>
                          </div>
                          {effectiveLimit > 0 ? (
                            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                              <div className={`h-full ${barColor} transition-all`} style={{ width: `${usagePct}%` }} />
                            </div>
                          ) : (
                            <div className="text-[10px] text-emerald-400 font-semibold">Unlimited Allowance</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium ${
                            hasWhatsApp
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            <KeyRound className="w-3 h-3" />
                            <span>{hasWhatsApp ? "Live" : "No Creds"}</span>
                          </span>
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

                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedInstForQuota(inst);
                              setQuotaForm({
                                plan_tier: inst.plan_tier || "starter",
                                msg_limit_override: inst.msg_limit_override !== null && inst.msg_limit_override !== undefined
                                  ? String(inst.msg_limit_override)
                                  : "",
                              });
                              setShowQuotaModal(true);
                            }}
                            className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Edit Plan</span>
                          </button>

                          <button
                            onClick={() => toggleInstituteActive(inst)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                              inst.is_active
                                ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {inst.is_active ? "Suspend" : "Activate"}
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

      {/* --- MODAL: EDIT PLAN & QUOTA --- */}
      {showQuotaModal && selectedInstForQuota && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-sm text-white">Edit Plan & WhatsApp Quota</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedInstForQuota.name}</p>
              </div>
              <button onClick={() => setShowQuotaModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuota} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Plan Tier</label>
                <select
                  value={quotaForm.plan_tier}
                  onChange={e => setQuotaForm({ ...quotaForm, plan_tier: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="starter">Starter (Default: 500 msgs/mo)</option>
                  <option value="growth">Growth (Default: 2,000 msgs/mo)</option>
                  <option value="pro">Pro (Default: 5,000 msgs/mo)</option>
                  <option value="enterprise">Enterprise (Default: 15,000 msgs/mo)</option>
                  <option value="custom">Custom Deal (Custom limit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Custom Monthly Limit Override
                </label>
                <input
                  type="number"
                  placeholder="Leave blank to use plan default"
                  value={quotaForm.msg_limit_override}
                  onChange={e => setQuotaForm({ ...quotaForm, msg_limit_override: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Leave blank to use plan default. Set to 0 for unlimited enterprise access.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="text-slate-400 flex justify-between">
                  <span>Current usage this month:</span>
                  <span className="font-mono font-bold text-white">
                    {selectedInstForQuota.messages_sent_this_month || 0} messages
                  </span>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Resets on 1st of next month automatically.
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuotaModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuota}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {savingQuota ? "Saving..." : "Save Quota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ONBOARD NEW INSTITUTE --- */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 my-8 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-sm text-white">Onboard New Coaching Institute</h3>
                <p className="text-xs text-slate-400 mt-0.5">Automated provisioning in 60s with isolated RLS partition</p>
              </div>
              <button onClick={() => setShowOnboardModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {onboardError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{onboardError}</span>
              </div>
            )}

            <form onSubmit={handleOnboard} className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Institute Details</h4>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Institute Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex IIT Academy"
                    value={onboardForm.name}
                    onChange={e => setOnboardForm({ ...onboardForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Plan Tier</label>
                    <select
                      value={onboardForm.plan_tier}
                      onChange={e => setOnboardForm({ ...onboardForm, plan_tier: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="starter">Starter (500 msgs)</option>
                      <option value="growth">Growth (2,000 msgs)</option>
                      <option value="pro">Pro (5,000 msgs)</option>
                      <option value="enterprise">Enterprise (15,000 msgs)</option>
                      <option value="custom">Custom Deal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Custom Limit (Optional)</label>
                    <input
                      type="number"
                      placeholder="Blank for default"
                      value={onboardForm.msg_limit_override}
                      onChange={e => setOnboardForm({ ...onboardForm, msg_limit_override: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={onboardForm.contact_phone}
                      onChange={e => setOnboardForm({ ...onboardForm, contact_phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Campus City / Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Pune, MH"
                      value={onboardForm.address}
                      onChange={e => setOnboardForm({ ...onboardForm, address: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-800 pt-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Admin Account Credentials</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Admin Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Ramesh Gupta"
                      value={onboardForm.admin_name}
                      onChange={e => setOnboardForm({ ...onboardForm, admin_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Admin Email</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@apex.com"
                      value={onboardForm.email}
                      onChange={e => setOnboardForm({ ...onboardForm, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Min. 6 characters"
                    value={onboardForm.password}
                    onChange={e => setOnboardForm({ ...onboardForm, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    The admin will be prompted to set their permanent password on first login.
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-800 pt-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Meta WhatsApp Cloud API (Developer Managed)
                  </h4>
                  <span className="text-[10px] text-slate-500">Only Global Admin sees this</span>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Permanent Meta Access Token</label>
                  <input
                    type="password"
                    placeholder="EAAB..."
                    value={onboardForm.whatsapp_token}
                    onChange={e => setOnboardForm({ ...onboardForm, whatsapp_token: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone Number ID</label>
                  <input
                    type="text"
                    placeholder="1092837465..."
                    value={onboardForm.phone_number_id}
                    onChange={e => setOnboardForm({ ...onboardForm, phone_number_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboarding}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50"
                >
                  {onboarding ? "Provisioning..." : "Launch Institute (60s)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
