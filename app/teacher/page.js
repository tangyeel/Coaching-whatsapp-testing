"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import ReportCardModal from "@/components/ReportCardModal";
import { toast } from "@/components/Toast";
import {
  Calendar, Check, X, Send, Award, FileText,
  Users, AlertCircle, Sparkles, CheckCircle2, Plus, UploadCloud,
  Download, TrendingUp, BarChart2
} from "lucide-react";

export default function TeacherPortal() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);

  // Batches
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [students, setStudents] = useState([]);

  // Active Tab: "attendance" | "marks" | "students"
  const [activeTab, setActiveTab] = useState("attendance");

  // Attendance State
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayTitle, setHolidayTitle] = useState("");
  const [attendance, setAttendance] = useState({}); // { studentId: "present" | "absent" }
  const [savingAtt, setSavingAtt] = useState(false);
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [attMessage, setAttMessage] = useState("");

  // Marks State
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [marksState, setMarksState] = useState({}); // { studentId: score }
  const [savingMarks, setSavingMarks] = useState(false);
  const [sendingMarks, setSendingMarks] = useState(false);
  const [marksMessage, setMarksMessage] = useState("");
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const excelMarksInputRef = useRef(null);
  const [newAssessment, setNewAssessment] = useState({
    title: "",
    subject: "Maths",
    max_marks: "100",
    date: new Date().toISOString().split("T")[0],
  });

  // Report Card Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [studentReportData, setStudentReportData] = useState({ stats: null, results: [] });

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
      setProfile(data.profile);
      setInstitute(data.institute);
      setLoading(false);

      fetchTeacherBatches();
    }
    init();
  }, []);

  async function fetchTeacherBatches() {
    try {
      const res = await fetch("/api/batches");
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        setBatches(json.data);
        setSelectedBatchId(json.data[0].id);
      }
    } catch (err) {
      console.error("Batches error:", err);
    }
  }

  // When selected batch changes, fetch its students and assessments
  useEffect(() => {
    if (!selectedBatchId) return;
    fetchStudents(selectedBatchId);
    fetchAssessments(selectedBatchId);
    fetchAttendanceForDate(selectedBatchId, attDate);
  }, [selectedBatchId]);

  // When date changes, refresh attendance session for that date
  useEffect(() => {
    if (selectedBatchId && attDate) {
      fetchAttendanceForDate(selectedBatchId, attDate);
    }
  }, [attDate]);

  async function fetchStudents(batchId) {
    try {
      const res = await fetch(`/api/students?batch_id=${batchId}`);
      const json = await res.json();
      if (json.data) {
        setStudents(json.data);
        // Default attendance state to all present if empty
        const initial = {};
        json.data.forEach(s => { initial[s.id] = "present"; });
        setAttendance(initial);
      }
    } catch (err) {
      console.error("Students error:", err);
    }
  }

  async function fetchAttendanceForDate(batchId, date) {
    try {
      const res = await fetch(`/api/attendance/sessions?batch_id=${batchId}&date=${date}`);
      const json = await res.json();
      if (json.data) {
        setIsHoliday(Boolean(json.data.is_holiday));
        setHolidayTitle(json.data.holiday_title || "");
        if (json.data.records) {
          const map = {};
          json.data.records.forEach(r => { map[r.student_id] = r.status; });
          setAttendance(prev => ({ ...prev, ...map }));
        }
      } else {
        setIsHoliday(false);
        setHolidayTitle("");
      }
    } catch (err) {
      console.error("Attendance fetch error:", err);
    }
  }

  async function fetchAssessments(batchId) {
    try {
      const res = await fetch(`/api/assessments?batch_id=${batchId}`);
      const json = await res.json();
      if (json.data) {
        setAssessments(json.data);
        if (json.data.length > 0) {
          setSelectedAssessmentId(json.data[0].id);
          fetchAssessmentResults(json.data[0].id);
        } else {
          setSelectedAssessmentId("");
          setMarksState({});
        }
      }
    } catch (err) {
      console.error("Assessments error:", err);
    }
  }

  async function fetchAssessmentResults(assessmentId) {
    if (!assessmentId) return;
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/results`);
      const json = await res.json();
      if (json.results) {
        const scores = {};
        json.results.forEach(r => { scores[r.student_id] = r.marks_obtained; });
        setMarksState(scores);
      }
    } catch (err) {
      console.error("Results fetch error:", err);
    }
  }

  // --- Attendance Actions ---
  function markAllPresent() {
    const updated = {};
    students.forEach(s => { updated[s.id] = "present"; });
    setAttendance(updated);
  }

  function toggleAttendance(studentId) {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === "absent" ? "present" : "absent",
    }));
  }

  async function handleSaveAttendance() {
    setSavingAtt(true);
    setAttMessage("");
    try {
      const records = students.map(s => ({
        student_id: s.id,
        status: attendance[s.id] || "present",
      }));

      const res = await fetch("/api/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_id: selectedBatchId,
          date: attDate,
          is_holiday: isHoliday,
          holiday_title: holidayTitle,
          records,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setAttMessage(isHoliday ? "✔ Marked as holiday" : "✔ Attendance saved successfully");
      } else {
        setAttMessage(`✘ Failed: ${json.error}`);
      }
    } catch (err) {
      setAttMessage(`✘ Error: ${err.message}`);
    } finally {
      setSavingAtt(false);
    }
  }

  async function handleSendAbsenceAlerts() {
    const absents = students.filter(s => attendance[s.id] === "absent");
    if (absents.length === 0) {
      toast.info("No students marked absent.");
      return;
    }

    if (!confirm(`Send WhatsApp alerts to parents of ${absents.length} absent students?`)) {
      return;
    }

    setSendingAlerts(true);
    try {
      const currentBatchName = batches.find(b => b.id === selectedBatchId)?.name || "Class";
      const recipients = absents.map(s => ({
        student_id: s.id,
        student_name: s.full_name,
        guardian_phone: s.guardian_phone,
        batch_name: currentBatchName,
        attendance_date: attDate,
      }));

      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: "attendance_absent",
          recipients,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Dispatched absence alerts: ${json.successCount} sent, ${json.failedCount} failed.`);
      } else {
        toast.error(`Failed to dispatch: ${json.error}`);
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSendingAlerts(false);
    }
  }

  // --- Marks Actions ---
  function handleExcelMarksUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(sheet);

        if (rawJson.length === 0) {
          toast.error("Excel file is empty");
          return;
        }

        const newScores = { ...marksState };
        let matchedCount = 0;

        rawJson.forEach(row => {
          const lower = {};
          Object.keys(row).forEach(k => {
            lower[k.toLowerCase().replace(/[^a-z0-9]/g, "")] = row[k];
          });

          const rollVal = String(lower.roll || lower.rollno || "").trim();
          const nameVal = String(lower.name || lower.studentname || "").toLowerCase().trim();
          const scoreVal = lower.marks !== undefined ? lower.marks : lower.score;

          if (scoreVal === undefined) return;

          const matchedStudent = students.find(s => {
            if (rollVal && s.roll_no && String(s.roll_no).trim() === rollVal) return true;
            if (nameVal && s.full_name?.toLowerCase().trim() === nameVal) return true;
            return false;
          });

          if (matchedStudent) {
            newScores[matchedStudent.id] = Number(scoreVal);
            matchedCount++;
          }
        });

        setMarksState(newScores);
        toast.success(`✔ Auto-filled scores for ${matchedCount} students from Excel`);
      } catch (err) {
        toast.error("Failed to parse marks Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleExportMarksExcel() {
    const curAssessment = assessments.find(a => a.id === selectedAssessmentId);
    if (!curAssessment) return;

    const rows = students.map(s => {
      const score = marksState[s.id] ?? "";
      const max = curAssessment.max_marks;
      let grade = "—";
      if (score !== "") {
        const pct = (Number(score) / max) * 100;
        if (pct >= 90) grade = "A+";
        else if (pct >= 80) grade = "A";
        else if (pct >= 70) grade = "B+";
        else if (pct >= 60) grade = "B";
        else if (pct >= 50) grade = "C";
        else if (pct >= 35) grade = "D";
        else grade = "F";
      }
      return {
        "Roll No": s.roll_no || "",
        "Student Name": s.full_name,
        "Guardian Phone": s.guardian_phone,
        "Marks Obtained": score,
        "Max Marks": max,
        "Grade": grade,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scores");
    XLSX.writeFile(wb, `${curAssessment.title.replace(/[^a-z0-9]/gi, "_")}_Scores.xlsx`);
  }

  async function handleCreateAssessment(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_id: selectedBatchId,
          ...newAssessment,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowNewAssessment(false);
        fetchAssessments(selectedBatchId);
        toast.success("Assessment created successfully!");
      } else {
        toast.error(json.error || "Failed to create assessment");
      }
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleSaveMarks() {
    if (!selectedAssessmentId) return;
    setSavingMarks(true);
    setMarksMessage("");

    try {
      const results = Object.entries(marksState).map(([studentId, score]) => ({
        student_id: studentId,
        marks_obtained: Number(score),
      }));

      const res = await fetch(`/api/assessments/${selectedAssessmentId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });

      const json = await res.json();
      if (json.success) {
        setMarksMessage("✔ Marks saved successfully");
        toast.success("Marks saved successfully!");
      } else {
        setMarksMessage(`✘ ${json.error}`);
        toast.error(`Failed to save marks: ${json.error}`);
      }
    } catch (err) {
      setMarksMessage(`✘ Error: ${err.message}`);
      toast.error(`Error: ${err.message}`);
    } finally {
      setSavingMarks(false);
    }
  }

  async function handleSendMarksAlerts() {
    const assessment = assessments.find(a => a.id === selectedAssessmentId);
    if (!assessment) return;

    const scoredStudents = students.filter(s => marksState[s.id] !== undefined && marksState[s.id] !== "");
    if (scoredStudents.length === 0) {
      toast.info("No marks entered to dispatch.");
      return;
    }

    if (!confirm(`Dispatch WhatsApp marks updates to ${scoredStudents.length} parents?`)) {
      return;
    }

    setSendingMarks(true);
    try {
      const recipients = scoredStudents.map(s => ({
        student_id: s.id,
        student_name: s.full_name,
        guardian_phone: s.guardian_phone,
        test_name: assessment.title,
        max_marks: assessment.max_marks,
        marks_obtained: marksState[s.id],
        test_date: assessment.date,
      }));

      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: "marks_update",
          recipients,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Dispatched marks: ${json.successCount} sent, ${json.failedCount} failed.`);
      } else {
        toast.error(`Failed: ${json.error}`);
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSendingMarks(false);
    }
  }

  // --- Report Card View ---
  async function openReportCard(student) {
    setSelectedStudentForReport(student);
    try {
      // Mock / quick stats calculation
      setStudentReportData({
        stats: { total: 45, holidays: 5, present: 38 },
        results: assessments.map(a => ({
          id: a.id,
          marks_obtained: marksState[student.id] || 78,
          grade: "A",
          assessment: a,
        })),
      });
      setReportModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar profile={profile} institute={institute} />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Top Control Bar: Batch Selector & Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Batch:</span>
            <select
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus:border-emerald-500"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.academic_year || "2026-2027"})
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 hidden md:inline">
              ({students.length} students enrolled)
            </span>
          </div>

          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            {[
              { id: "attendance", label: "Attendance Tick", icon: Calendar },
              { id: "marks", label: "Marks Entry", icon: Award },
              { id: "students", label: "Report Cards", icon: FileText },
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: ATTENDANCE TICKING GRID (ONE-CLICK TICK & HOLIDAYS)    */}
        {/* ============================================================ */}
        {activeTab === "attendance" && (
          <div className="space-y-4 fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              {/* Controls Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Session Date
                    </label>
                    <input
                      type="date"
                      value={attDate}
                      onChange={e => setAttDate(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* One-Click Holiday Switch */}
                  <div className="pt-4 flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isHoliday}
                        onChange={e => setIsHoliday(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0"
                      />
                      <span className="text-xs font-semibold text-amber-400">Mark Date as Holiday</span>
                    </label>
                    {isHoliday && (
                      <input
                        type="text"
                        value={holidayTitle}
                        onChange={e => setHolidayTitle(e.target.value)}
                        placeholder="e.g. Festival Holiday / Break"
                        className="bg-slate-950 border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none w-48"
                      />
                    )}
                  </div>
                </div>

                {!isHoliday && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={markAllPresent}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                    >
                      Mark All Present
                    </button>
                    <span className="text-xs text-slate-500 font-mono">
                      {students.filter(s => attendance[s.id] === "absent").length} Absent
                    </span>
                  </div>
                )}
              </div>

              {/* Ticking Grid */}
              {isHoliday ? (
                <div className="py-12 text-center bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <h4 className="text-sm font-semibold text-amber-300">
                    {holidayTitle || "Holiday Marked"}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    This date will be automatically excluded from active class counts in attendance % calculations.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/70 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Roll</th>
                        <th className="py-2.5 px-4">Student Name</th>
                        <th className="py-2.5 px-4">Guardian Phone</th>
                        <th className="py-2.5 px-4 text-center">Status (Tick to Toggle)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {students.map(s => {
                        const isAbsent = attendance[s.id] === "absent";
                        return (
                          <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-4 font-mono text-xs text-slate-500">{s.roll_no || "—"}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-200">{s.full_name}</td>
                            <td className="py-2.5 px-4 font-mono text-xs text-slate-400">{s.guardian_phone}</td>
                            <td className="py-2.5 px-4 text-center">
                              <button
                                onClick={() => toggleAttendance(s.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all shadow-sm ${
                                  isAbsent
                                    ? "bg-rose-500 text-white shadow-rose-900/40"
                                    : "bg-emerald-600 text-white shadow-emerald-900/30"
                                }`}
                              >
                                {isAbsent ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                <span>{isAbsent ? "Absent" : "Present"}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <span className="text-xs font-medium text-emerald-400">{attMessage}</span>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {!isHoliday && (
                    <button
                      onClick={handleSendAbsenceAlerts}
                      disabled={sendingAlerts || students.filter(s => attendance[s.id] === "absent").length === 0}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-rose-900/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{sendingAlerts ? "Sending Alerts..." : "Send Absence WhatsApp Alerts"}</span>
                    </button>
                  )}
                  <button
                    onClick={handleSaveAttendance}
                    disabled={savingAtt}
                    className="flex-1 sm:flex-initial px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                  >
                    {savingAtt ? "Saving Records..." : "Save Attendance"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: MARKS & ASSESSMENT SCORING                             */}
        {/* ============================================================ */}
        {activeTab === "marks" && (
          <div className="space-y-4 fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              {/* Assessment Selector & New Assessment Button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select Test:</label>
                  <select
                    value={selectedAssessmentId}
                    onChange={e => {
                      setSelectedAssessmentId(e.target.value);
                      fetchAssessmentResults(e.target.value);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    {assessments.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.subject} &bull; Max: {a.max_marks})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => excelMarksInputRef.current?.click()}
                    disabled={!selectedAssessmentId}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Import Scores (Excel)</span>
                  </button>
                  <input
                    ref={excelMarksInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelMarksUpload}
                    className="hidden"
                  />
                  <button
                    onClick={handleExportMarksExcel}
                    disabled={!selectedAssessmentId}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => setShowNewAssessment(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Assessment</span>
                  </button>
                </div>
              </div>

              {/* Assessment Table & Analytics */}
              {selectedAssessmentId ? (() => {
                const curAssessment = assessments.find(a => a.id === selectedAssessmentId);
                const enteredScores = Object.values(marksState).filter(v => v !== "" && v !== undefined).map(Number);
                const avgScore = enteredScores.length > 0 ? (enteredScores.reduce((a, b) => a + b, 0) / enteredScores.length).toFixed(1) : 0;
                const maxScore = enteredScores.length > 0 ? Math.max(...enteredScores) : 0;
                const minScore = enteredScores.length > 0 ? Math.min(...enteredScores) : 0;
                const passCount = enteredScores.filter(s => s >= ((curAssessment?.max_marks || 100) * 0.35)).length;
                const passRate = enteredScores.length > 0 ? Math.round((passCount / enteredScores.length) * 100) : 0;

                return (
                  <>
                    {/* Performance Analytics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-semibold uppercase text-slate-500 block">Class Average</span>
                        <div className="text-lg font-bold font-mono text-blue-400 mt-0.5">
                          {avgScore} <span className="text-xs text-slate-500 font-normal">/ {curAssessment?.max_marks}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-semibold uppercase text-slate-500 block">Highest Score</span>
                        <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                          {maxScore}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-semibold uppercase text-slate-500 block">Lowest Score</span>
                        <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                          {minScore}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-semibold uppercase text-slate-500 block">Pass Rate (≥35%)</span>
                        <div className="text-lg font-bold font-mono text-purple-400 mt-0.5">
                          {passRate}%
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/70 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="py-2.5 px-4">Roll</th>
                            <th className="py-2.5 px-4">Student Name</th>
                            <th className="py-2.5 px-4 text-right">Max Marks</th>
                            <th className="py-2.5 px-4 text-center">Marks Obtained</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {students.map(s => {
                            const maxMarks = curAssessment?.max_marks || 100;
                            return (
                            <tr key={s.id} className="hover:bg-slate-800/30">
                              <td className="py-2.5 px-4 font-mono text-xs text-slate-500">{s.roll_no || "—"}</td>
                              <td className="py-2.5 px-4 font-medium text-slate-200">{s.full_name}</td>
                              <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-400">{maxMarks}</td>
                              <td className="py-2.5 px-4 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={maxMarks}
                                  value={marksState[s.id] ?? ""}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setMarksState(prev => ({ ...prev, [s.id]: val }));
                                  }}
                                  placeholder="0"
                                  className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-center font-mono font-bold text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <span className="text-xs font-medium text-blue-400">{marksMessage}</span>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={handleSendMarksAlerts}
                        disabled={sendingMarks}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/20"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{sendingMarks ? "Dispatching..." : "Send WhatsApp Marks Updates"}</span>
                      </button>
                      <button
                        onClick={handleSaveMarks}
                        disabled={savingMarks}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                      >
                        {savingMarks ? "Saving..." : "Save Scores"}
                      </button>
                    </div>
                  </div>
                </>
              ); })() : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No assessments created yet for this batch. Click "New Assessment" to begin.
                </div>
              )}
            </div>

            {/* Modal: New Assessment */}
            {showNewAssessment && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="font-semibold text-sm text-white">Create Assessment</h3>
                    <button onClick={() => setShowNewAssessment(false)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateAssessment} className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Test Title</label>
                      <input
                        type="text"
                        required
                        value={newAssessment.title}
                        onChange={e => setNewAssessment({ ...newAssessment, title: e.target.value })}
                        placeholder="e.g. Unit Test 03 - Mechanics"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Subject</label>
                        <input
                          type="text"
                          required
                          value={newAssessment.subject}
                          onChange={e => setNewAssessment({ ...newAssessment, subject: e.target.value })}
                          placeholder="Physics"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Maximum Marks</label>
                        <input
                          type="number"
                          required
                          value={newAssessment.max_marks}
                          onChange={e => setNewAssessment({ ...newAssessment, max_marks: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Test Date</label>
                      <input
                        type="date"
                        required
                        value={newAssessment.date}
                        onChange={e => setNewAssessment({ ...newAssessment, date: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowNewAssessment(false)}
                        className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                        Create
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: STUDENTS & PRINTABLE REPORT CARDS                      */}
        {/* ============================================================ */}
        {activeTab === "students" && (
          <div className="space-y-4 fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Student Academic Roster</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Generate and print official student report cards</p>
                </div>
                <span className="text-xs text-slate-500 font-mono">{students.length} Total Students</span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/70 text-slate-400 text-[10px] uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Roll</th>
                      <th className="py-2.5 px-4">Student Name</th>
                      <th className="py-2.5 px-4">Guardian Phone</th>
                      <th className="py-2.5 px-4 text-right">Report Card</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">{s.roll_no || "—"}</td>
                        <td className="py-3 px-4 font-medium text-slate-200">{s.full_name}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-400">{s.guardian_phone}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openReportCard(s)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 text-xs font-medium rounded-lg transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Report Card</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Report Card Modal */}
      <ReportCardModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        student={selectedStudentForReport}
        institute={institute}
        attendanceStats={studentReportData.stats}
        assessmentResults={studentReportData.results}
      />
    </div>
  );
}
