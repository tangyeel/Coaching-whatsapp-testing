"use client";
import { formatDate } from "@/lib/utils";
import { Printer, X, Award, CheckCircle, BarChart3, GraduationCap } from "lucide-react";

export default function ReportCardModal({ isOpen, onClose, student, institute, attendanceStats, assessmentResults }) {
  if (!isOpen || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  const netActive = Math.max(0, (attendanceStats?.total || 0) - (attendanceStats?.holidays || 0));
  const attendancePct = netActive > 0 ? Math.round(((attendanceStats?.present || 0) / netActive) * 100) : 100;

  // Calculate marks aggregate
  let totalMax = 0;
  let totalObtained = 0;
  (assessmentResults || []).forEach(r => {
    totalMax += Number(r.assessment?.max_marks || 0);
    totalObtained += Number(r.marks_obtained || 0);
  });
  const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative">
        {/* Modal Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50 no-print">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold text-white">Student Academic Report Card</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report Card</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Card */}
        <div className="p-8 bg-white text-slate-900 printable-card">
          {/* Header */}
          <div
            className="flex justify-between items-start border-b-4 pb-5 mb-6"
            style={{ borderColor: institute?.banner_color || "#0f172a" }}
          >
            <div className="flex items-center gap-4">
              {institute?.logo_url ? (
                <img
                  src={institute.logo_url}
                  alt={institute.name || "Institute"}
                  className="h-14 w-auto max-w-[100px] object-contain rounded"
                />
              ) : (
                <div
                  className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-sm"
                  style={{ backgroundColor: institute?.banner_color || "#1e3a5f" }}
                >
                  {institute?.name?.[0]?.toUpperCase() || "I"}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{institute?.name || "Educational Institute"}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{institute?.address || "Main Campus"}</p>
                {institute?.contact_phone && (
                  <p className="text-xs text-slate-600">Contact: {institute.contact_phone}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-900 font-bold text-xs uppercase tracking-wider rounded border border-blue-200">
                OFFICIAL REPORT CARD
              </span>
              <div className="text-xs text-slate-500 mt-1">Generated: {formatDate(new Date())}</div>
            </div>
          </div>

          {/* Student Header */}
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">Student Name</span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5">{student.full_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">Roll No & Batch</span>
              <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                {student.roll_no ? `${student.roll_no} &bull; ` : ""}{student.batches?.name || "General"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">Guardian Contact</span>
              <span className="text-slate-700 block mt-0.5 font-mono">
                {student.guardian_name ? `${student.guardian_name} (${student.guardian_phone})` : student.guardian_phone}
              </span>
            </div>
          </div>

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Attendance Rate</span>
                <span className="text-xs text-emerald-700 mt-0.5 block">
                  {attendanceStats?.present || 0} present of {netActive} active sessions
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  ({attendanceStats?.holidays || 0} holidays excluded)
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-700 font-mono">{attendancePct}%</div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">Overall Marks</span>
                <span className="text-xs text-blue-700 mt-0.5 block">
                  {totalObtained} / {totalMax} total marks
                </span>
                <span className="text-[10px] text-blue-600 block mt-0.5">
                  Across {(assessmentResults || []).length} assessments
                </span>
              </div>
              <div className="text-3xl font-black text-blue-700 font-mono">{overallPct}%</div>
            </div>
          </div>

          {/* Assessment Table */}
          <div className="mb-8">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Assessment Results</h4>
            <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Test Title</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3 text-right">Max</th>
                  <th className="py-2.5 px-3 text-right">Obtained</th>
                  <th className="py-2.5 px-3 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(assessmentResults || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No assessment results recorded for this student yet.
                    </td>
                  </tr>
                ) : (
                  assessmentResults.map(r => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(r.assessment?.date)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{r.assessment?.title}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.assessment?.subject}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">{r.assessment?.max_marks}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{r.marks_obtained}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-100 text-slate-800 font-mono">
                          {r.grade || "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Teacher Remarks & Signatures */}
          <div className="border-t border-slate-200 pt-6 grid grid-cols-2 gap-8 text-xs text-slate-500">
            <div>
              <span className="font-semibold text-slate-700 block mb-1">Teacher Remarks:</span>
              <p className="italic text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
                {attendancePct >= 85 && overallPct >= 75
                  ? "Demonstrates excellent consistency and strong conceptual grasp. Keep up the high standard!"
                  : attendancePct < 75
                  ? "Attendance is below target. Regular attendance is recommended to improve test performance."
                  : "Good progress. Continued revision and practice tests will yield higher scores."}
              </p>
            </div>
            <div className="flex flex-col justify-end items-end">
              <div className="border-t border-slate-400 pt-1.5 min-w-[160px] text-center font-medium text-slate-700">
                Authorized Signatory / Teacher
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
