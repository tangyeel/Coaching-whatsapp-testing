"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import InvoiceReceiptModal from "@/components/InvoiceReceiptModal";
import TransferStudentModal from "@/components/TransferStudentModal";
import ExcelStudentImportModal from "@/components/ExcelStudentImportModal";
import StudentProfileModal from "@/components/StudentProfileModal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Users, Layers, Receipt, Settings, Plus, Search,
  ArrowRightLeft, FileText, CheckCircle2, AlertCircle,
  IndianRupee, Printer, Send, ShieldAlert, School, CreditCard,
  UserPlus, UserCheck, MessageSquare, UploadCloud, X,
  Archive, RotateCcw, AlertTriangle, KeyRound, Sparkles, Sliders,
  Palette, Image as ImageIcon, ExternalLink, Lock
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

  // Archive & Soft Delete States
  const [showArchivedStudents, setShowArchivedStudents] = useState(false);
  const [showArchivedBatches, setShowArchivedBatches] = useState(false);
  const [archiveModalStudent, setArchiveModalStudent] = useState(null);
  const [archiveModalBatch, setArchiveModalBatch] = useState(null);

  // Modals & Sub-actions
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedStudentForTransfer, setSelectedStudentForTransfer] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [modalDocData, setModalDocData] = useState(null);
  const [modalDocType, setModalDocType] = useState("receipt");
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState(null);

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

  // Settings State: Basic Info
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    contact_phone: "",
    address: "",
    invoice_prefix: "INV",
    receipt_prefix: "REC",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Settings State: Branding & Logo
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerColor, setBannerColor] = useState("#1e3a5f");
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState("");

  // Settings State: Fee Autopilot
  const [feeAutopilot, setFeeAutopilot] = useState(false);
  const [isUpdatingAutopilot, setIsUpdatingAutopilot] = useState(false);

  // Settings State: Test WhatsApp Connection
  const [testPhone, setTestPhone] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

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
          invoice_prefix: data.institute.invoice_prefix || "INV",
          receipt_prefix: data.institute.receipt_prefix || "REC",
        });
        setBannerColor(data.institute.banner_color || "#1e3a5f");
        setLogoPreview(data.institute.logo_url || null);
        setFeeAutopilot(Boolean(data.institute.fee_reminder_autopilot));
        setTestPhone(data.institute.contact_phone || "");
      }
      setLoading(false);

      fetchBatches(false);
      fetchStudents(false);
      fetchTeachers();
      fetchInvoices();
      fetchMessageJobs();
    }
    init();
  }, [router]);

  async function fetchBatches(includeArchived = showArchivedBatches) {
    try {
      const res = await fetch(`/api/batches?include_archived=${includeArchived}`);
      const json = await res.json();
      if (json.data) setBatches(json.data);
    } catch (err) { console.error(err); }
  }

  async function fetchStudents(includeArchived = showArchivedStudents) {
    try {
      const res = await fetch(`/api/students?include_archived=${includeArchived}`);
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
        fetchBatches(showArchivedBatches);
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
  }

  async function handleArchiveBatch(batch) {
    try {
      const res = await fetch(`/api/batches?id=${batch.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setArchiveModalBatch(null);
        fetchBatches(showArchivedBatches);
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
  }

  async function handleRestoreBatch(batch) {
    try {
      const res = await fetch("/api/batches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: batch.id, restore: true }),
      });
      const json = await res.json();
      if (json.success) {
        fetchBatches(showArchivedBatches);
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
        fetchBatches(showArchivedBatches);
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
        fetchBatches(showArchivedBatches);
        fetchTeachers();
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
  }

  // --- Handlers: Students & Soft Delete ---
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
        fetchStudents(showArchivedStudents);
        fetchBatches(showArchivedBatches);
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
  }

  async function handleArchiveStudent(student) {
    try {
      const res = await fetch(`/api/students?id=${student.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setArchiveModalStudent(null);
        fetchStudents(showArchivedStudents);
        fetchBatches(showArchivedBatches);
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
  }

  async function handleRestoreStudent(student) {
    try {
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student.id, restore: true }),
      });
      const json = await res.json();
      if (json.success) {
        fetchStudents(showArchivedStudents);
        fetchBatches(showArchivedBatches);
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

  async function handleSendFeeReminder(inv) {
    const parentName = inv.student?.guardian_name || inv.student?.full_name || "Parent";
    const balancePaise = Number(inv.amount_due) - Number(inv.amount_paid);
    if (!confirm(`Dispatch WhatsApp fee reminder to ${parentName} for ₹${(balancePaise / 100).toFixed(2)}?`)) return;

    setSendingReminderId(inv.id);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: "fee_reminder",
          recipients: [
            {
              student_id: inv.student_id,
              student_name: inv.student?.full_name,
              guardian_name: parentName,
              guardian_phone: inv.student?.guardian_phone,
              invoice_no: inv.invoice_no,
              amount_due: formatCurrency(balancePaise),
              due_date: formatDate(inv.due_date),
            },
          ],
        }),
      });

      const json = await res.json();
      if (json.success && json.successCount > 0) {
        alert(`✔ WhatsApp fee reminder sent to ${inv.student?.guardian_phone}`);
        if (json.usedThisMonth !== undefined && institute) {
          setInstitute({ ...institute, messages_sent_this_month: json.usedThisMonth });
        }
        fetchMessageJobs();
      } else {
        alert(`✘ Failed to send: ${json.error || "WhatsApp dispatch error"}`);
      }
    } catch (err) {
      alert(`✘ Error: ${err.message}`);
    } finally {
      setSendingReminderId(null);
    }
  }

  // --- Handlers: Settings & Branding ---
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
        alert("Basic institute settings updated!");
      } else { alert(json.error); }
    } catch (err) { alert(err.message); }
    finally { setIsSavingSettings(false); }
  }

  async function handleLogoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo must be under 2MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSaveBranding(e) {
    e.preventDefault();
    setIsSavingBranding(true);
    setBrandingSuccess("");
    try {
      const formData = new FormData();
      if (logoFile) formData.append("file", logoFile);
      formData.append("banner_color", bannerColor);

      const res = await fetch("/api/institutes/upload-logo", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        if (json.logo_url) {
          setInstitute(prev => ({ ...prev, logo_url: json.logo_url, banner_color: json.banner_color }));
        }
        setBrandingSuccess("Branding successfully updated and active on all receipts & report cards!");
        setTimeout(() => setBrandingSuccess(""), 4000);
      } else {
        alert(json.error || "Failed to update branding");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSavingBranding(false);
    }
  }

  async function handleToggleAutopilot() {
    const nextVal = !feeAutopilot;
    setIsUpdatingAutopilot(true);
    try {
      const res = await fetch("/api/admin/institutes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: institute.id, fee_reminder_autopilot: nextVal }),
      });
      const json = await res.json();
      if (json.success) {
        setFeeAutopilot(nextVal);
        setInstitute(prev => ({ ...prev, fee_reminder_autopilot: nextVal }));
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUpdatingAutopilot(false);
    }
  }

  async function handleTestWhatsApp(e) {
    e.preventDefault();
    if (!testPhone.trim()) {
      alert("Please provide a destination phone number");
      return;
    }
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_to_phone: testPhone }),
      });
      const json = await res.json();
      setTestResult(json);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestingConnection(false);
    }
  }

  // Computed Quota Metrics for WhatsApp Outbox
  const effectiveLimit = institute?.msg_limit_override !== null && institute?.msg_limit_override !== undefined
    ? institute.msg_limit_override
    : (institute?.plan_defaults?.msg_limit || 500);

  const messagesUsedThisMonth = institute?.messages_sent_this_month || 0;
  const isQuotaReached = effectiveLimit > 0 && messagesUsedThisMonth >= effectiveLimit;
  const usagePercentage = effectiveLimit > 0 ? Math.min(100, Math.round((messagesUsedThisMonth / effectiveLimit) * 100)) : 0;

  const usageBarColor =
    usagePercentage >= 100 ? "bg-rose-500" :
    usagePercentage >= 90 ? "bg-orange-500" :
    usagePercentage >= 75 ? "bg-amber-400" :
    "bg-blue-500";

  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@schoolportal.com";

  // Computed Overview Metrics
  const totalStudents = students.filter(s => !s.deleted_at && s.is_active).length;
  const totalBatches = batches.filter(b => !b.deleted_at && b.is_active).length;
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
                  <IndianRupee className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white font-mono">{formatCurrency(totalRevenueCollectedPaise)}</div>
                <div className="text-xs text-slate-500 mt-1">Recorded across cash & online</div>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Outstanding Fees</span>
                  <CreditCard className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-amber-400 font-mono">
                  {formatCurrency(Math.max(0, totalRevenueDuePaise - totalRevenueCollectedPaise))}
                </div>
                <div className="text-xs text-slate-500 mt-1">Across unpaid and partial bills</div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Quick Institute Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowNewStudentModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-900/20"
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Batches Roster</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage coaching cohorts and assign teachers</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showArchivedBatches}
                    onChange={e => {
                      setShowArchivedBatches(e.target.checked);
                      fetchBatches(e.target.checked);
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                  />
                  <span>Show Archived Batches</span>
                </label>

                <button
                  onClick={() => setShowNewBatchModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Batch</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map(b => {
                const isArchived = Boolean(b.deleted_at);
                return (
                  <div
                    key={b.id}
                    className={`border rounded-2xl p-5 space-y-4 transition-all ${
                      isArchived
                        ? "bg-slate-950/60 border-rose-500/20 opacity-70"
                        : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white">{b.name}</h4>
                          {isArchived && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded">
                              Archived
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{b.academic_year || "2026-2027"}</span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                        {b.student_count || 0} Students
                      </span>
                    </div>

                    <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                          Assigned Teachers
                        </span>
                        <span className="text-slate-300">
                          {b.assigned_teachers?.length > 0
                            ? b.assigned_teachers.map(t => t.full_name).join(", ")
                            : <span className="text-slate-500 italic">No teacher assigned</span>}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isArchived ? (
                          <>
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
                            <button
                              onClick={() => setArchiveModalBatch(b)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                              title="Archive Batch"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestoreBatch(b)}
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
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
        {/* TAB 3: STUDENTS DIRECTORY & EXCEL IMPORT                     */}
        {/* ============================================================ */}
        {activeTab === "students" && (
          <div className="space-y-6 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Students Directory</h2>
                <p className="text-xs text-slate-400 mt-0.5">Search, enroll, import via Excel, transfer, and safely archive students</p>
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
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
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

              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={showArchivedStudents}
                  onChange={e => {
                    setShowArchivedStudents(e.target.checked);
                    fetchStudents(e.target.checked);
                  }}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
                />
                <span>Show Archived Students</span>
              </label>
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
                    filteredStudents.map(s => {
                      const isArchived = Boolean(s.deleted_at);
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-slate-800/30 ${isArchived ? "bg-slate-950/40 text-slate-400" : ""}`}
                        >
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">{s.roll_no || "—"}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedStudentForProfile(s);
                                  setProfileModalOpen(true);
                                }}
                                className="font-semibold text-slate-200 hover:text-blue-400 transition-colors text-left"
                                title="View Student Profile & Ledger"
                              >
                                {s.full_name}
                              </button>
                              {isArchived && (
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
                                  Archived
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-300 font-medium">
                            {s.batches?.name || "General"}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-slate-400">
                            {s.guardian_phone}
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            {!isArchived ? (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedStudentForProfile(s);
                                    setProfileModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-medium rounded-lg transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Profile</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedStudentForTransfer(s);
                                    setTransferModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-lg transition-colors"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  <span>Transfer</span>
                                </button>
                                <button
                                  onClick={() => setArchiveModalStudent(s)}
                                  className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors inline-flex items-center"
                                  title="Archive Student (Soft Delete)"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleRestoreStudent(s)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-lg transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                            )}
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
        {/* TAB 4: TEACHERS & STAFF MANAGEMENT                           */}
        {/* ============================================================ */}
        {activeTab === "teachers" && (
          <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">Teachers & Staff</h2>
                <p className="text-xs text-slate-400 mt-0.5">Faculty accounts scoped strictly to their assigned cohorts</p>
              </div>
              <button
                onClick={() => setShowNewTeacherModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-purple-900/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Teacher Account</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/70 text-slate-400 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Faculty Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Assigned Cohorts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teachers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                        No faculty members registered yet. Click "Add Teacher Account" to create credentials.
                      </td>
                    </tr>
                  ) : (
                    teachers.map(t => (
                      <tr key={t.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold text-slate-200">{t.full_name}</td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-400">{t.email}</td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-400">{t.phone || "—"}</td>
                        <td className="py-3 px-4 text-xs text-slate-300">
                          {t.assigned_batches?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {t.assigned_batches.map(b => (
                                <span key={b.id} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[11px] font-medium border border-purple-500/20">
                                  {b.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">No batches assigned yet</span>
                          )}
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
        {/* TAB 5: FEES & INVOICES LEDGER                                */}
        {/* ============================================================ */}
        {activeTab === "fees" && (
          <div className="space-y-6 fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Fee Invoices & Payments</h2>
                <p className="text-xs text-slate-400 mt-0.5">Issue tuition invoices, collect payments, and print branded receipts</p>
              </div>
              <button
                onClick={() => setShowNewInvoiceModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-900/20"
              >
                <Plus className="w-4 h-4" />
                <span>Issue Fee Invoice</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/70 text-slate-400 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Description</th>
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
                        No invoices generated yet. Click "Issue Fee Invoice" to create one.
                      </td>
                    </tr>
                  ) : (
                    invoices.map(inv => {
                      const balancePaise = Number(inv.amount_due) - Number(inv.amount_paid);
                      const isPaid = inv.status === "paid";
                      return (
                        <tr key={inv.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-mono text-xs font-bold text-slate-300">
                            {inv.invoice_no}
                          </td>
                          <td className="py-3 px-4 text-slate-200">
                            <div className="font-semibold">{inv.student?.full_name}</div>
                            <div className="text-[10px] text-slate-500">{inv.student?.batches?.name}</div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400">{inv.title}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                            {formatCurrency(inv.amount_due)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">
                            {formatCurrency(inv.amount_paid)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isPaid ? "bg-emerald-500/10 text-emerald-400" :
                              inv.status === "partial" ? "bg-amber-500/10 text-amber-400" :
                              "bg-rose-500/10 text-rose-400"
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            {!isPaid && (
                              <>
                                <button
                                  onClick={() => handleSendFeeReminder(inv)}
                                  disabled={sendingReminderId === inv.id || isQuotaReached}
                                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 text-emerald-400 border border-emerald-500/20 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1"
                                  title={isQuotaReached ? "WhatsApp quota reached" : "WhatsApp fee reminder to parent"}
                                >
                                  {isQuotaReached ? <Lock className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                                  <span>{sendingReminderId === inv.id ? "Sending..." : "Reminder"}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedInvoiceForPayment(inv);
                                    setPaymentForm({
                                      amount: (balancePaise / 100).toString(),
                                      payment_mode: "cash",
                                      reference_no: "",
                                      notes: "",
                                    });
                                    setShowPaymentModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  Collect
                                </button>
                              </>
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
        {/* TAB 6: WHATSAPP DISPATCH OUTBOX & USAGE METER                */}
        {/* ============================================================ */}
        {activeTab === "messages" && (
          <div className="space-y-6 fade-in">
            {/* Monthly Quota Governance Meter */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-sm text-white">Monthly WhatsApp Usage & Governance</h3>
                    <p className="text-[11px] text-slate-400">
                      Tier: <span className="capitalize font-semibold text-purple-400">{institute?.plan_tier || "Starter"} Plan</span>
                      {institute?.msg_limit_override !== null && institute?.msg_limit_override !== undefined && (
                        <span className="text-slate-500 ml-1">(Custom cap)</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-white">
                      {messagesUsedThisMonth.toLocaleString()} / {effectiveLimit === 0 ? "Unlimited" : `${effectiveLimit.toLocaleString()} msgs`}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {effectiveLimit > 0 ? `${usagePercentage}% utilized this cycle` : "Zero limits active"}
                    </div>
                  </div>

                  <a
                    href={`mailto:${supportEmail}?subject=WhatsApp Quota Upgrade Request - ${institute?.name}`}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Upgrade</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {effectiveLimit > 0 && (
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                  <div className={`h-full ${usageBarColor} transition-all duration-500`} style={{ width: `${usagePercentage}%` }} />
                </div>
              )}

              {usagePercentage >= 90 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {isQuotaReached
                        ? "You have reached your monthly WhatsApp limit. Outbound notifications are temporarily paused."
                        : "You are approaching your monthly message limit. Upgrade your plan to prevent dispatch disruption."}
                    </span>
                  </div>
                  <a
                    href={`mailto:${supportEmail}?subject=Urgent WhatsApp Quota Upgrade - ${institute?.name}`}
                    className="underline font-bold hover:text-amber-300 text-xs ml-2"
                  >
                    Contact Platform Admin
                  </a>
                </div>
              )}
            </div>

            {/* Outbox Table */}
            <div>
              <h2 className="text-lg font-bold text-white">Message Outbox History</h2>
              <p className="text-xs text-slate-400 mt-0.5">Auditable dispatch log of marks updates, absence notifications, and fee reminders</p>
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
        {/* TAB 7: INSTITUTE SETTINGS & BRANDING (REDESIGNED 2-COLUMN)   */}
        {/* ============================================================ */}
        {activeTab === "settings" && (
          <div className="space-y-6 fade-in">
            <div>
              <h2 className="text-lg font-bold text-white">Institute Settings & Custom Branding</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage your school details, brand styling (logo/banner), fee automations, and WhatsApp health
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Column 1: Basic Info & Automations */}
              <div className="space-y-6">
                {/* Card 1: Basic Info */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <School className="w-4 h-4 text-blue-400" />
                    <span>Basic Campus Information</span>
                  </h3>

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
                          placeholder="+91 9876543210"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Campus Address</label>
                        <input
                          type="text"
                          value={settingsForm.address}
                          onChange={e => setSettingsForm({ ...settingsForm, address: e.target.value })}
                          placeholder="MG Road, City"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-blue-900/20"
                    >
                      {isSavingSettings ? "Saving Info..." : "Save Campus Details"}
                    </button>
                  </form>
                </div>

                {/* Card 2: Automations (Fee Reminder Autopilot) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fee Reminder Autopilot</h3>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleAutopilot}
                      disabled={isUpdatingAutopilot}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        feeAutopilot ? "bg-purple-600" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          feeAutopilot ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automatically dispatches WhatsApp fee reminders to guardians <strong className="text-slate-200">7 days before</strong>, <strong className="text-slate-200">2 days before</strong>, and <strong className="text-slate-200">on the due date</strong> at 12:00 PM IST.
                  </p>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${feeAutopilot ? "text-emerald-400" : "text-slate-600"}`} />
                    <span>
                      {feeAutopilot
                        ? "Autopilot Active: Scheduled daily at 12:00 PM IST."
                        : "Autopilot Paused: Manual 'Send Reminder' button only."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Column 2: Custom Branding & WhatsApp Health */}
              <div className="space-y-6">
                {/* Card 3: Custom Branding (Logo & Accent Color) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-400" />
                    <span>White-Label Institute Branding</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Upload your institute's official logo and brand color. These propagate automatically to generated PDF receipts, official student report cards, and headers.
                  </p>

                  <form onSubmit={handleSaveBranding} className="space-y-4">
                    {/* Logo Dropzone & Preview */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Institute Logo</label>
                      <div className="flex items-center gap-4">
                        <div
                          className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden bg-slate-950 shrink-0"
                          style={{ borderColor: bannerColor }}
                        >
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-600" />
                          )}
                        </div>

                        <div className="flex-1">
                          <input
                            type="file"
                            id="logo-upload"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            onChange={handleLogoSelect}
                            className="hidden"
                          />
                          <label
                            htmlFor="logo-upload"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer transition-colors"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Select Logo Image</span>
                          </label>
                          <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, WebP or SVG up to 2MB</p>
                        </div>
                      </div>
                    </div>

                    {/* Brand Accent Color */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Brand Accent Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={bannerColor}
                          onChange={e => setBannerColor(e.target.value)}
                          className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={bannerColor}
                          onChange={e => setBannerColor(e.target.value)}
                          placeholder="#1e3a5f"
                          className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 uppercase"
                        />
                        <span className="text-xs text-slate-500">Used on report card borders & badges</span>
                      </div>
                    </div>

                    {brandingSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{brandingSuccess}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSavingBranding}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-emerald-900/20"
                    >
                      {isSavingBranding ? "Uploading & Applying..." : "Save Institute Branding"}
                    </button>
                  </form>
                </div>

                {/* Card 4: WhatsApp Connection Governance & Test Tool */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                      <span>WhatsApp Cloud API Governance</span>
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                      Managed by Platform
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Meta Cloud API tokens, phone registration, and webhook tunnels are professionally configured and managed by your platform provider.
                  </p>

                  <div className="border-t border-slate-800 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Test WhatsApp Connection</span>
                      <span className="text-[10px] text-slate-500">Live API Ping</span>
                    </div>

                    <form onSubmit={handleTestWhatsApp} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 919876543210"
                        value={testPhone}
                        onChange={e => setTestPhone(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={testingConnection}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
                      >
                        {testingConnection ? "Pinging..." : "Send Test Ping"}
                      </button>
                    </form>

                    {testResult && (
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        testResult.success
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      }`}>
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold">
                            {testResult.success ? "Meta WhatsApp API is Healthy!" : "Connection Test Failed"}
                          </div>
                          <div className="text-[11px] opacity-90 mt-0.5">
                            {testResult.message || testResult.error}
                          </div>
                          {testResult.messageId && (
                            <div className="text-[10px] font-mono text-slate-400 mt-1">
                              Msg ID: {testResult.messageId}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* Modal: Confirm Archive Student */}
      {archiveModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Archive {archiveModalStudent.full_name}?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                This student will be hidden from daily attendance and test lists. <strong className="text-slate-200">No data will be lost</strong>: historical marks, attendance percentages, and fee payment audits are permanently preserved and can be restored at any time.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setArchiveModalStudent(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchiveStudent(archiveModalStudent)}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Archive Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Archive Batch */}
      {archiveModalBatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Archive Batch "{archiveModalBatch.name}"?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                This cohort will be hidden from teacher dashboards. All past attendance sessions, assessments, and enrolled student histories will remain permanently intact and restorable.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setArchiveModalBatch(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchiveBatch(archiveModalBatch)}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Archive Batch
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {batches.filter(b => !b.deleted_at).map(b => (
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
                  {batches.filter(b => !b.deleted_at).map(b => (
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
                  {students.filter(s => !s.deleted_at).map(s => (
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
        batches={batches.filter(b => !b.deleted_at)}
        onImportSuccess={() => {
          fetchStudents(showArchivedStudents);
          fetchBatches(showArchivedBatches);
        }}
      />

      {/* Transfer Student Safeguard Modal */}
      <TransferStudentModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        student={selectedStudentForTransfer}
        batches={batches.filter(b => !b.deleted_at)}
        onTransferSuccess={() => {
          fetchStudents(showArchivedStudents);
          fetchBatches(showArchivedBatches);
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

      {/* Student Profile & History Modal */}
      <StudentProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        student={selectedStudentForProfile}
      />
    </div>
  );
}
