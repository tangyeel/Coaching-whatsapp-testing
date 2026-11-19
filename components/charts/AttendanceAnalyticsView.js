"use client";
import { useState, useEffect } from "react";
import { TrendingUp, AlertTriangle, Users, Calendar, ArrowUpRight, CheckCircle2, MessageSquare } from "lucide-react";

export default function AttendanceAnalyticsView({ batches }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState("");

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const url = `/api/analytics/attendance${selectedBatchId ? `?batch_id=${selectedBatchId}` : ""}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load attendance analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [selectedBatchId]);

  if (loading) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Synthesizing 30-day attendance trends...</p>
      </div>
    );
  }

  const dailyTrend = data?.dailyTrend || [];
  const batchComparison = data?.batchComparison || [];
  const atRiskStudents = data?.atRiskStudents || [];

  return (
    <div className="space-y-6 fade-in">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span>Attendance Intelligence & Retention Trends</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            30-day attendance patterns, batch health comparisons, and retention drop-off alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filter Batch:</span>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Batches</option>
            {(batches || []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: 30-Day Trend & Batch Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 30-Day Trend Timeline (SVG Sparkline / Bar Graph) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>30-Day Attendance Timeline</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {dailyTrend.length} Sessions Analyzed
            </span>
          </div>

          {dailyTrend.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No attendance sessions recorded in the last 30 days.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="flex items-end gap-1.5 h-36 border-b border-slate-800 pb-2 overflow-x-auto">
                {dailyTrend.map((d, idx) => {
                  const barHeight = Math.max(8, Math.round((d.pct / 100) * 110));
                  const isHigh = d.pct >= 85;
                  const isLow = d.pct < 65;

                  return (
                    <div
                      key={idx}
                      className="flex-1 min-w-[14px] flex flex-col items-center justify-end group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                        <div className="bg-slate-950 border border-slate-700 text-white text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                          {d.date}: {d.pct}% ({d.present}/{d.total})
                        </div>
                      </div>

                      <div
                        style={{ height: `${barHeight}px` }}
                        className={`w-full rounded-t transition-all ${
                          isLow
                            ? "bg-rose-500/80 group-hover:bg-rose-400"
                            : isHigh
                            ? "bg-emerald-500/80 group-hover:bg-emerald-400"
                            : "bg-blue-500/80 group-hover:bg-blue-400"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>{dailyTrend[0]?.date}</span>
                <span>{dailyTrend[dailyTrend.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Batch Health Ranking */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Batch Health Index</span>
          </h3>

          {batchComparison.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No batch sessions recorded yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-56 overflow-y-auto">
              {batchComparison.map((b, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{b.batch_name}</span>
                    <span className="font-mono text-slate-400 font-bold">{b.avg_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${b.avg_pct}%` }}
                      className={`h-full transition-all duration-500 ${
                        b.avg_pct >= 80 ? "bg-emerald-500" : b.avg_pct >= 60 ? "bg-blue-500" : "bg-amber-500"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* At-Risk Absentee Alert Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Retention Alert: Frequent Absentees (3+ Absences in 30 Days)
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
            {atRiskStudents.length} Students At Risk
          </span>
        </div>

        {atRiskStudents.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Excellent! No students have accumulated 3 or more absences this month.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Roll No</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3 text-center">Absences</th>
                  <th className="py-2.5 px-3">Parent Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {atRiskStudents.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans font-semibold text-white">{s.student_name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{s.roll_no || "—"}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-sans">{s.batch}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                        {s.absence_count} Days
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{s.phone || "No phone"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
