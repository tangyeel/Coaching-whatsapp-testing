"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, Calendar, Receipt, Award, LogOut, CheckCircle2, AlertCircle, School, ArrowRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function StudentPortalPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("attendance");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadStudentData() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch("/api/student/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          setErrorMsg(json.error || "Failed to load student profile");
          return;
        }

        setData(json);
      } catch (err) {
        setErrorMsg("Failed to connect to student records");
      } finally {
        setLoading(false);
      }
    }

    loadStudentData();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold">Student Record Not Found</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">{errorMsg}</p>
        <button
          onClick={handleSignOut}
          className="mt-6 px-4 py-2 bg-slate-800 text-xs text-white rounded-xl hover:bg-slate-700"
        >
          Sign Out & Return to Login
        </button>
      </div>
    );
  }

  const { student, attendance, invoices, assessments } = data;
  const accentColor = student.institute?.banner_color || "#2563eb";

  // Calculate outstanding balance
  const totalDuePaise = invoices
    .filter((i) => i.status !== "paid")
    .reduce((acc, i) => acc + (i.amount_due - (i.amount_paid || 0)), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {student.institute?.logo_url ? (
              <img
                src={student.institute.logo_url}
                alt={student.institute.name}
                className="w-9 h-9 rounded-xl bg-white object-contain p-1"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <School className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">{student.name}</h1>
              <p className="text-[11px] text-slate-400">{student.institute?.name || "Student Portal"} &bull; {student.batch}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto w-full px-4 py-6 space-y-6 flex-1">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400">Attendance Rate</span>
            <div className="text-2xl font-black text-white mt-1">
              <span className={attendance.percentage >= 80 ? "text-emerald-400" : "text-amber-400"}>
                {attendance.percentage}%
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{attendance.present} of {attendance.total} sessions</div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400">Outstanding Due</span>
            <div className="text-2xl font-black text-white mt-1 font-mono">
              ₹{(totalDuePaise / 100).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {totalDuePaise === 0 ? "All fees cleared" : "Installment pending"}
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400">Tests Recorded</span>
            <div className="text-2xl font-black text-white mt-1">{assessments.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Assessment scorecards</div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400">Roll Number</span>
            <div className="text-2xl font-black text-blue-400 mt-1 font-mono">{student.roll_no || "—"}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{student.academic_year || "Active"}</div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          {[
            { id: "attendance", label: "Attendance Record", icon: Calendar },
            { id: "fees", label: "Fees & Receipts", icon: Receipt },
            { id: "marks", label: "Exam Scorecards", icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: ATTENDANCE */}
        {activeTab === "attendance" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Class Sessions</h3>
            {attendance.recentSessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No attendance records logged yet.</div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
                {attendance.recentSessions.map((rec, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">
                        {rec.session?.session_date ? formatDate(rec.session.session_date) : "Recent Session"}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(rec.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        rec.status === "present"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FEES */}
        {activeTab === "fees" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tuition Invoices & Payment Ledger</h3>
            {invoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No invoices issued for this student.</div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
                {invoices.map((inv) => {
                  const total = (inv.amount_due || 0) / 100;
                  const paid = (inv.amount_paid || 0) / 100;
                  const balance = Math.max(0, total - paid);

                  return (
                    <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">{inv.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Invoice: {inv.invoice_no} &bull; Due: {formatDate(inv.due_date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-white">₹{total.toLocaleString("en-IN")}</div>
                        <div className="text-[10px] mt-0.5">
                          {inv.status === "paid" ? (
                            <span className="text-emerald-400 font-semibold">Fully Paid</span>
                          ) : (
                            <span className="text-rose-400 font-semibold">₹{balance.toLocaleString("en-IN")} Due</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MARKS */}
        {activeTab === "marks" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Assessment Performance</h3>
            {assessments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No examination scorecards recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
                {assessments.map((res) => {
                  const max = res.assessment?.max_marks || 100;
                  const obtained = res.marks_obtained || 0;
                  const pct = Math.round((obtained / max) * 100);

                  return (
                    <div key={res.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">{res.assessment?.title || "Test"}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {res.assessment?.test_date ? formatDate(res.assessment.test_date) : "Completed"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-white">
                          {obtained} / {max}
                        </div>
                        <div className="text-[10px] text-blue-400 font-bold">{pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-800 text-center text-xs text-slate-500">
        Student Self-Service Portal &bull; CoachingPulse System
      </footer>
    </div>
  );
}
