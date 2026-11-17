"use client";
import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  User, Calendar, Receipt, Award, ArrowRightLeft,
  X, CheckCircle2, AlertCircle, Phone, Clock
} from "lucide-react";

export default function StudentProfileModal({ isOpen, onClose, student }) {
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!student || !isOpen) return;

    async function fetchStudentHistory() {
      setLoading(true);
      try {
        const invRes = await fetch(`/api/fees/invoices?student_id=${student.id}`);
        const invJson = await invRes.json();
        if (invJson.data) setInvoices(invJson.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchStudentHistory();
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  let totalDue = 0;
  let totalPaid = 0;
  invoices.forEach(inv => {
    totalDue += Number(inv.amount_due || 0);
    totalPaid += Number(inv.amount_paid || 0);
  });
  const balanceRemaining = Math.max(0, totalDue - totalPaid);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
              {student.full_name?.charAt(0) || "S"}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{student.full_name}</h3>
              <p className="text-xs text-slate-400">
                {student.batches?.name || "General Batch"} {student.roll_no ? `&bull; Roll #${student.roll_no}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-800 px-6 gap-6 bg-slate-950/20 text-xs">
          {[
            { id: "overview", label: "Student Details", icon: User },
            { id: "fees", label: `Fees Ledger (${invoices.length})`, icon: Receipt },
          ].map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-1.5 py-3 border-b-2 font-semibold transition-colors ${
                  activeSubTab === tab.id
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {activeSubTab === "overview" && (
            <div className="space-y-5 fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Guardian Phone (WhatsApp)</span>
                  <span className="text-white font-mono font-medium block mt-0.5">{student.guardian_phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Guardian Name</span>
                  <span className="text-white font-medium block mt-0.5">{student.guardian_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Enrollment Date</span>
                  <span className="text-white font-medium block mt-0.5">{formatDate(student.enrollment_date)}</span>
                </div>
              </div>

              {/* Financial Quick Glance */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">Total Invoiced</span>
                  <span className="text-base font-bold font-mono text-white mt-0.5 block">
                    {formatCurrency(totalDue)}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">Paid to Date</span>
                  <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">
                    {formatCurrency(totalPaid)}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">Balance Pending</span>
                  <span className="text-base font-bold font-mono text-amber-400 mt-0.5 block">
                    {formatCurrency(balanceRemaining)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "fees" && (
            <div className="space-y-4 fade-in">
              <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Amount Due</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No invoices issued for this student yet.
                        </td>
                      </tr>
                    ) : (
                      invoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-400">{inv.invoice_no}</td>
                          <td className="py-2.5 px-3 text-slate-200">{inv.title}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">{formatCurrency(inv.amount_due)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{formatCurrency(inv.amount_paid)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              inv.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
