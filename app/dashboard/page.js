"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import InvoiceReceiptModal from "@/components/InvoiceReceiptModal";
import TransferStudentModal from "@/components/TransferStudentModal";
import ExcelStudentImportModal from "@/components/ExcelStudentImportModal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Users, Layers, Receipt, Settings, Plus, Search,
  ArrowRightLeft, FileText, CheckCircle2, AlertCircle,
  IndianRupee, Printer, Send, ShieldAlert, School, CreditCard,
  UserPlus, UserCheck, MessageSquare, UploadCloud, X
} from "lucide-react";

export default function InstituteAdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tabs: "overview" | "batches" | "students" | "teachers" | "fees" | "messages" | "settings"
  const [activeTab, setActiveTab] = useState("overview");

  // Domain Data
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [messageJobs, setMessageJobs] = useState([]);
  const [searchStudent, setSearchStudent] = useState("");
  const [filterBatchId, setFilterBatchId] = useState("");

  // Modals & Sub-actions
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedStudentForTransfer, setSelectedStudentForTransfer] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [modalDocData, setModalDocData] = useState(null);
  const [modalDocType, setModalDocType] = useState("receipt");
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);

  // New Batch State
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchYear, setNewBatchYear] = useState("2026-2027");

  // New Student State
  const [showNewStudentModal, setShowNewStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    batch_id: "",
    full_name: "",
    roll_no: "",
    guardian_phone: "",
    guardian_name: "",
  });

  // New Teacher State
  const [showNewTeacherModal, setShowNewTeacherModal] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    batch_ids: [],
  });
  const [creatingTeacher, setCreatingTeacher] = useState(false);

  // Assign Teacher to Batch State
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
  const [selectedBatchForAssign, setSelectedBatchForAssign] = useState(null);
  const [selectedTeacherIdToAssign, setSelectedTeacherIdToAssign] = useState("");

  // New Invoice State
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    student_id: "",
    title: "Tuition Fee",
    amount_due: "",
    due_date: new Date().toISOString().split("T")[0],
  });

  // Record Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_mode: "cash",
    reference_no: "",
    notes: "",
  });

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    contact_phone: "",
    address: "",
    whatsapp_token: "",
    phone_number_id: "",
    invoice_prefix: "INV",
    receipt_prefix: "REC",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
      if (data.role === "teacher") { router.replace("/teacher"); return; }
      if (data.role === "global_admin") { router.replace("/admin"); return; }

      setProfile(data.profile);
      setInstitute(data.institute);
      if (data.institute) {
        setSettingsForm({
          name: data.institute.name || "",
          contact_phone: data.institute.contact_phone || "",
          address: data.institute.address || "",
          whatsapp_token: data.institute.whatsapp_token || "",
          phone_number_id: data.institute.phone_number_id || "",
          invoice_prefix: data.institute.invoice_prefix || "INV",
          receipt_prefix: data.institute.receipt_prefix || "REC",
        });
      }
      setLoading(false);

      fetchBatches();
      fetchStudents();
      fetchTeachers();
      fetchInvoices();
      fetchMessageJobs();
    }
    init();
  }, []);

  async function fetchBatches() {
    try {
      const res = await fetch("/api/batches");
      const json = await res.json();
      if (json.data) setBatches(json.data);
    } catch (err) { console.error(err); }
  }

  async function fetchStudents() {
    try {
      const res = await fetch("/api/students");
      const json = await res.json();
      if (json.data) setStudents(json.data);
    } catch (err) { console.error(err); }
  }

  async function fetchTeachers() {
    try {
      const res = await fetch("/api/teachers");
      const json = await res.json();
      if (json.data) setTeachers(json.data);
    } catch (err) { console.error(err); }
  }

  async function fetchInvoices() {
    try {
      const res = await fetch("/api/fees/invoices");
      const json = await res.json();
      if (json.data) setInvoices(json.data);
    } catch (err) { console.error(err); }
  }

  async function fetchMessageJobs() {
    try {
      const res = await fetch("/api/messages/history");
      const json = await res.json();
      if (json.data) setMessageJobs(json.data);
    } catch (err) { console.error(err); }
  }

  // --- Handlers: Batches & Teachers ---
  async function handleCreateBatch(e) {
    e.preventDefault();
    if (!newBatchName.trim()) return;
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBatchName, academic_year: newBatchYear }),
      });
      const json = await res.json();
      if (json.success) {
        setShowNewBatchModal(false);
        setNewBatchName("");
        fetchBatches();
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
  }

  async function handleCreateTeacher(e) {
    e.preventDefault();
    setCreatingTeacher(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTeacher),
      });
      const json = await res.json();
      if (json.success) {
        setShowNewTeacherModal(false);
        setNewTeacher({ full_name: "", email: "", password: "", phone: "", batch_ids: [] });
        fetchTeachers();
        fetchBatches();
        alert(json.message);
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
    finally { setCreatingTeacher(false); }
  }

  async function handleAssignTeacher(e) {
    e.preventDefault();
    if (!selectedBatchForAssign || !selectedTeacherIdToAssign) return;
    try {
      const res = await fetch(`/api/batches/${selectedBatchForAssign.id}/teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_id: selectedTeacherIdToAssign }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAssignTeacherModal(false);
        fetchBatches();
        fetchTeachers();
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
  }

  // --- Handlers: Students ---
  async function handleCreateStudent(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudent),
      });
      const json = await res.json();
      if (json.success) {
        setShowNewStudentModal(false);
        setNewStudent({ batch_id: "", full_name: "", roll_no: "", guardian_phone: "", guardian_name: "" });
        fetchStudents();
        fetchBatches();
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
  }

  // --- Handlers: Invoices & Payments ---
  async function handleCreateInvoice(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/fees/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInvoice),
      });
      const json = await res.json();
      if (json.success) {
        setShowNewInvoiceModal(false);
        setNewInvoice({ student_id: "", title: "Tuition Fee", amount_due: "", due_date: new Date().toISOString().split("T")[0] });
        fetchInvoices();
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
  }

  async function handleRecordPayment(e) {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;
    try {
      const res = await fetch("/api/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: selectedInvoiceForPayment.id,
          ...paymentForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowPaymentModal(false);
        setPaymentForm({ amount: "", payment_mode: "cash", reference_no: "", notes: "" });
        fetchInvoices();
        setModalDocData(json.data);
        setModalDocType("receipt");
        setReceiptModalOpen(true);
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
  }

  // --- Handlers: Settings ---
  async function handleSaveSettings(e) {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/admin/institutes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: institute.id, ...settingsForm }),
      });
      const json = await res.json();
      if (json.success) {
        setInstitute(json.data);
        alert("Institute settings updated successfully!");
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
    finally { setIsSavingSettings(false); }
  }

  // Computed Overview Metrics
  const totalStudents = students.length;
  const totalBatches = batches.length;
  const totalTeachers = teachers.length;
  let totalRevenueCollectedPaise = 0;
  let totalRevenueDuePaise = 0;
  invoices.forEach(inv => {
    totalRevenueCollectedPaise += Number(inv.amount_paid || 0);
    totalRevenueDuePaise += Number(inv.amount_due || 0);
  });

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.guardian_phone?.includes(searchStudent) || s.roll_no?.includes(searchStudent);
    const matchesBatch = filterBatchId ? s.batch_id === filterBatchId : true;
    return matchesSearch && matchesBatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar profile={profile} institute={institute} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: School },
            { id: "batches", label: "Batches", icon: Layers },
            { id: "students", label: "Students", icon: Users },
            { id: "teachers", label: "Staff & Teachers", icon: UserCheck },
            { id: "fees", label: "Fees & Invoices", icon: Receipt },
            { id: "messages", label: "WhatsApp Outbox", icon: MessageSquare },
            { id: "settings", label: "Institute Settings", icon: Settings },
          ].map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW METRICS                                      */}
        {/* ============================================================ */}
        {activeTab === "overview" && (
          <div className="space-y-6 fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Total Students</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-white">{totalStudents}</div>
                <div className="text-xs text-slate-500 mt-1">Across {totalBatches} active batches</div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Total Batches</span>
                  <Layers className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white">{totalBatches}</div>
                <div className="text-xs text-slate-500 mt-1">{totalTeachers} assigned teachers</div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Fees Collected</span>
                  <IndianRupee className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  {formatCurrency(totalRevenueCollectedPaise)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Recorded via Cash, UPI & Online</div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Pending Dues</span>
                  <Receipt className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-amber-400 font-mono">
                  {formatCurrency(Math.max(0, totalRevenueDuePaise - totalRevenueCollectedPaise))}
                </div>
                <div className="text-xs text-slate-500 mt-1">Outstanding invoices</div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Quick Operations</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowNewStudentModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enroll Student</span>
                </button>
                <button
                  onClick={() => setShowExcelImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-900/20"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Import Students from Excel</span>
                </button>
                <button
                  onClick={() => setShowNewTeacherModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Teacher Account</span>
                </button>
                <button
                  onClick={() => setShowNewBatchModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Batch</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: BATCHES MANAGEMENT                                    */}
        {/* ============================================================ */}
        {activeTab === "batches" && (
          <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">Batches Roster</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage coaching cohorts and assign teachers</p>
              </div>
              <button
                onClick={() => setShowNewBatchModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Batch</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map(b => (
                <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-bold text-white">{b.name}</h4>
                      <span className="text-xs text-slate-500">{b.academic_year || "2026-2027"}</span>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                      {b.student_count || 0} Students
                    </span>
                  </div>

                  <div className="border-t border-slate-800/80 pt-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Assigned Teachers
                      </span>
                      <button
                        onClick={() => {
                          setSelectedBatchForAssign(b);
                          setSelectedTeacherIdToAssign("");
                          setShowAssignTeacherModal(true);
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        + Assign
                      </button>
                    </div>
                    <div className="text-xs text-slate-300">
                      {b.assigned_teachers?.length > 0
                        ? b.assigned_teachers.map(t => t.full_name).join(", ")
                        : <span className="text-slate-500 italic">No teacher assigned yet</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: STUDENTS DIRECTORY & EXCEL IMPORT                     */}
        {/* ============================================================ */}
        {activeTab === "students" && (
          <div className="space-y-6 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Students Directory</h2>
                <p className="text-xs text-slate-400 mt-0.5">Search, enroll, import via Excel, and transfer between batches</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExcelImportModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Import Excel</span>
                </button>
                <button
                  onClick={() => setShowNewStudentModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enroll Student</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student by name, roll, or phone..."
                  value={searchStudent}
                  onChange={e => setSearchStudent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={filterBatchId}
                onChange={e => setFilterBatchId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Students Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/70 text-slate-400 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Roll</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Guardian Contact</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(s => (
                      <tr key={s.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">{s.roll_no || "—"}</td>
                        <td className="py-3 px-4 font-semibold text-slate-200">{s.full_name}</td>
                        <td className="py-3 px-4 text-xs text-slate-300 font-medium">
                          {s.batches?.name || "General"}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-400">
                          {s.guardian_phone}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedStudentForTransfer(s);
                              setTransferModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-lg transition-colors"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Transfer Batch</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: TEACHERS & STAFF MANAGEMENT                           */}
        {/* ============================================================ */}
        {activeTab === "teachers" && (
          <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">Teachers & Staff</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage instructor accounts and assigned rosters</p>
              </div>
              <button
                onClick={() => setShowNewTeacherModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-purple-900/20"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Teacher</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map(t => {
                const assignedBatchList = t.teacher_batch_assignments?.map(a => a.batches?.name).filter(Boolean) || [];
                return (
                  <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold text-white">{t.full_name}</h4>
                        <span className="text-xs text-slate-400 font-mono">{t.email}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold uppercase">
                        Active
                      </span>
                    </div>

                    <div className="border-t border-slate-800/80 pt-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                        Assigned Batches ({assignedBatchList.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {assignedBatchList.length > 0 ? (
                          assignedBatchList.map((bName, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 bg-slate-800 rounded-lg text-slate-200">
                              {bName}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">No batches assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: FEES, INVOICES & PAYMENT RECEIPTS                     */}
        {/* ============================================================ */}
        {activeTab === "fees" && (
          <div className="space-y-6 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Fees, Invoicing & Receipts</h2>
                <p className="text-xs text-slate-400 mt-0.5">Track collections, record cash/online payments, and print official receipts</p>
              </div>
              <button
                onClick={() => setShowNewInvoiceModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Issue Invoice</span>
              </button>
            </div>

            {/* Invoices Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/70 text-slate-400 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4 text-right">Amount Due</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        No invoices issued yet. Click "Issue Invoice" to begin.
                      </td>
                    </tr>
                  ) : (
                    invoices.map(inv => {
                      const isFullyPaid = inv.status === "paid";
                      return (
                        <tr key={inv.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-mono text-xs font-bold text-blue-400">{inv.invoice_no}</td>
                          <td className="py-3 px-4 font-medium text-slate-200">{inv.student?.full_name}</td>
                          <td className="py-3 px-4 text-xs text-slate-400">{inv.title}</td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-200">
                            {formatCurrency(inv.amount_due)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs font-bold text-emerald-400">
                            {formatCurrency(inv.amount_paid)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isFullyPaid
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            {!isFullyPaid && (
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForPayment(inv);
                                  setPaymentForm({
                                    amount: String((Number(inv.amount_due) - Number(inv.amount_paid)) / 100),
                                    payment_mode: "cash",
                                    reference_no: "",
                                    notes: "",
                                  });
                                  setShowPaymentModal(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                              >
                                Record Payment
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setModalDocData(inv);
                                setModalDocType("invoice");
                                setReceiptModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                            >
                              Print Invoice
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
        )}

        {/* ============================================================ */}
        {/* TAB 6: WHATSAPP DISPATCH OUTBOX / AUDIT LOGS                 */}
        {/* ============================================================ */}
        {activeTab === "messages" && (
          <div className="space-y-6 fade-in">
            <div>
              <h2 className="text-lg font-bold text-white">WhatsApp Outbox & Message History</h2>
              <p className="text-xs text-slate-400 mt-0.5">Auditable log of marks alerts, absence notifications, and fee reminders</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/70 text-slate-400 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Template</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Success / Failed</th>
                    <th className="py-3 px-4">Dispatched By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {messageJobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                        No WhatsApp message jobs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    messageJobs.map(job => (
                      <tr key={job.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-xs font-mono text-slate-400">
                          {formatDate(job.created_at)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-bold text-blue-400">
                          {job.template_key}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs">
                          <span className="text-emerald-400 font-bold">{job.success_count}</span>
                          {" / "}
                          <span className="text-rose-400 font-bold">{job.failed_count}</span>
                          <span className="text-slate-500"> ({job.total_count} total)</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300">
                          {job.creator?.full_name || "Admin"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 7: INSTITUTE & WHATSAPP SETTINGS                          */}
        {/* ============================================================ */}
        {activeTab === "settings" && (
          <div className="space-y-6 fade-in max-w-2xl">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Institute & WhatsApp Setup</h3>
                <p className="text-xs text-slate-400 mt-0.5">Configure your school identity and Meta Cloud API credentials</p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Institute Display Name</label>
                  <input
                    type="text"
                    value={settingsForm.name}
                    onChange={e => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={settingsForm.contact_phone}
                      onChange={e => setSettingsForm({ ...settingsForm, contact_phone: e.target.value })}
                      placeholder="e.g. +91 9876543210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Campus Address</label>
                    <input
                      type="text"
                      value={settingsForm.address}
                      onChange={e => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      placeholder="e.g. MG Road, Bengaluru"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Meta WhatsApp Cloud API Credentials
                  </h4>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Permanent Meta Access Token</label>
                    <input
                      type="password"
                      value={settingsForm.whatsapp_token}
                      onChange={e => setSettingsForm({ ...settingsForm, whatsapp_token: e.target.value })}
                      placeholder="EAAB..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Phone Number ID</label>
                    <input
                      type="text"
                      value={settingsForm.phone_number_id}
                      onChange={e => setSettingsForm({ ...settingsForm, phone_number_id: e.target.value })}
                      placeholder="e.g. 1092837465..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Invoice Prefix</label>
                    <input
                      type="text"
                      value={settingsForm.invoice_prefix}
                      onChange={e => setSettingsForm({ ...settingsForm, invoice_prefix: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Receipt Prefix</label>
                    <input
                      type="text"
                      value={settingsForm.receipt_prefix}
                      onChange={e => setSettingsForm({ ...settingsForm, receipt_prefix: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-blue-900/20"
                >
                  {isSavingSettings ? "Saving Settings..." : "Save Institute Settings"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* Modal: Create Batch */}
      {showNewBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-sm text-white">Create New Batch</h3>
            <form onSubmit={handleCreateBatch} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 10 - Batch A (Morning)"
                  value={newBatchName}
                  onChange={e => setNewBatchName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Academic Year</label>
                <input
                  type="text"
                  value={newBatchYear}
                  onChange={e => setNewBatchYear(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBatchModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enroll Student */}
      {showNewStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-sm text-white">Enroll New Student</h3>
            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Batch</label>
                <select
                  required
                  value={newStudent.batch_id}
                  onChange={e => setNewStudent({ ...newStudent, batch_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Choose batch...</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Aarav Sharma"
                  value={newStudent.full_name}
                  onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Roll Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 101"
                    value={newStudent.roll_no}
                    onChange={e => setNewStudent({ ...newStudent, roll_no: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Guardian Phone (WhatsApp)</label>
                  <input
                    type="text"
                    required
                    placeholder="919876543210"
                    value={newStudent.guardian_phone}
                    onChange={e => setNewStudent({ ...newStudent, guardian_phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Guardian Name</label>
                <input
                  type="text"
                  placeholder="Parent / Guardian"
                  value={newStudent.guardian_name}
                  onChange={e => setNewStudent({ ...newStudent, guardian_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewStudentModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Teacher */}
      {showNewTeacherModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-white">Create Teacher Account</h3>
              <button onClick={() => setShowNewTeacherModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Prof. Rajesh Verma"
                  value={newTeacher.full_name}
                  onChange={e => setNewTeacher({ ...newTeacher, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="teacher@school.com"
                    value={newTeacher.email}
                    onChange={e => setNewTeacher({ ...newTeacher, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newTeacher.password}
                    onChange={e => setNewTeacher({ ...newTeacher, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Assign Initial Batches</label>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  {batches.map(b => (
                    <label key={b.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTeacher.batch_ids.includes(b.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewTeacher({ ...newTeacher, batch_ids: [...newTeacher.batch_ids, b.id] });
                          } else {
                            setNewTeacher({ ...newTeacher, batch_ids: newTeacher.batch_ids.filter(id => id !== b.id) });
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-0"
                      />
                      <span>{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTeacherModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTeacher}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold"
                >
                  {creatingTeacher ? "Creating..." : "Create Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Teacher to Batch */}
      {showAssignTeacherModal && selectedBatchForAssign && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-sm text-white">Assign Teacher to {selectedBatchForAssign.name}</h3>
            <form onSubmit={handleAssignTeacher} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Teacher</label>
                <select
                  required
                  value={selectedTeacherIdToAssign}
                  onChange={e => setSelectedTeacherIdToAssign(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Choose teacher...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignTeacherModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                  Confirm Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Invoice */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-sm text-white">Issue Fee Invoice</h3>
            <form onSubmit={handleCreateInvoice} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Student</label>
                <select
                  required
                  value={newInvoice.student_id}
                  onChange={e => setNewInvoice({ ...newInvoice, student_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select student...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.batches?.name || "General"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fee Description</label>
                <input
                  type="text"
                  required
                  value={newInvoice.title}
                  onChange={e => setNewInvoice({ ...newInvoice, title: e.target.value })}
                  placeholder="Term 1 Tuition Fee"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount Due (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="2500"
                    value={newInvoice.amount_due}
                    onChange={e => setNewInvoice({ ...newInvoice, amount_due: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newInvoice.due_date}
                    onChange={e => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewInvoiceModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Payment */}
      {showPaymentModal && selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-sm text-white">Record Fee Payment</h3>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div><span className="text-slate-500">Invoice:</span> {selectedInvoiceForPayment.invoice_no}</div>
              <div><span className="text-slate-500">Student:</span> {selectedInvoiceForPayment.student?.full_name}</div>
              <div>
                <span className="text-slate-500">Remaining Balance:</span>{" "}
                <span className="font-bold text-amber-400 font-mono">
                  {formatCurrency(Number(selectedInvoiceForPayment.amount_due) - Number(selectedInvoiceForPayment.amount_paid))}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Payment Mode</label>
                <select
                  value={paymentForm.payment_mode}
                  onChange={e => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="bank_transfer">Bank Transfer / IMPS / NEFT</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment Gateway</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Reference / Transaction # (Optional)</label>
                <input
                  type="text"
                  placeholder="UPI Txn ID, Cheque #, or Receipt Ref"
                  value={paymentForm.reference_no}
                  onChange={e => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Bulk Import Modal */}
      <ExcelStudentImportModal
        isOpen={showExcelImportModal}
        onClose={() => setShowExcelImportModal(false)}
        batches={batches}
        onImportSuccess={() => {
          fetchStudents();
          fetchBatches();
        }}
      />

      {/* Transfer Student Safeguard Modal */}
      <TransferStudentModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        student={selectedStudentForTransfer}
        batches={batches}
        onTransferSuccess={() => {
          fetchStudents();
          fetchBatches();
        }}
      />

      {/* Printable Invoice & Receipt Modal */}
      <InvoiceReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        data={modalDocData}
        institute={institute}
        type={modalDocType}
      />
    </div>
  );
}
