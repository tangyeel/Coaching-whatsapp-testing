"use client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer, X, CheckCircle2, Building, User, Calendar, CreditCard } from "lucide-react";

export default function InvoiceReceiptModal({ isOpen, onClose, data, institute, type = "receipt" }) {
  if (!isOpen || !data) return null;

  const isReceipt = type === "receipt";
  const student = data.student || {};
  const invoice = data.invoice || data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
        {/* Modal Controls (Hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50 no-print">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {isReceipt ? "Official Payment Receipt" : "Fee Invoice"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
              {isReceipt ? data.receipt_no : invoice.invoice_no}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 bg-white text-slate-900 printable-card printable-area">
          {/* Institute Header */}
          <div
            className="flex justify-between items-start border-b-2 pb-6 mb-6"
            style={{ borderColor: institute?.banner_color || "#e2e8f0" }}
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
                <h2 className="text-2xl font-bold text-slate-900">{institute?.name || "Educational Institute"}</h2>
                <p className="text-xs text-slate-500 mt-0.5 max-w-sm">{institute?.address || "Institute Campus"}</p>
                {institute?.contact_phone && (
                  <p className="text-xs text-slate-600 mt-0.5">Contact: {institute.contact_phone}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-bold text-xs uppercase tracking-wider rounded">
                {isReceipt ? "PAYMENT RECEIPT" : "FEE INVOICE"}
              </span>
              <div className="text-xs font-mono font-bold text-slate-700 mt-2">
                #{isReceipt ? data.receipt_no : invoice.invoice_no}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Date: {formatDate(isReceipt ? data.payment_date : invoice.due_date)}
              </div>
            </div>
          </div>

          {/* Student & Bill Details */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Student Details</div>
              <div className="text-sm font-bold text-slate-900">{student.full_name || "Student"}</div>
              <div className="text-xs text-slate-600 mt-0.5">
                Batch: {student.batches?.name || "General Batch"}
                {student.roll_no && ` &bull; Roll: ${student.roll_no}`}
              </div>
              {student.guardian_name && (
                <div className="text-xs text-slate-500 mt-0.5">Guardian: {student.guardian_name}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Payment Status</div>
              {isReceipt ? (
                <div className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Paid via {String(data.payment_mode || "Cash").toUpperCase()}</span>
                </div>
              ) : (
                <div className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${
                  invoice.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}>
                  Status: {invoice.status}
                </div>
              )}
              {isReceipt && data.reference_no && (
                <div className="text-[11px] text-slate-500 mt-1">Ref/Txn: {data.reference_no}</div>
              )}
            </div>
          </div>

          {/* Items / Fee Table */}
          <table className="w-full text-xs text-left mb-6">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <th className="py-2.5">Description</th>
                <th className="py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 font-medium text-slate-800">
                  {invoice.title || "Tuition & Coaching Fee"}
                </td>
                <td className="py-3 text-right font-mono font-semibold text-slate-900">
                  {formatCurrency(isReceipt ? data.amount : invoice.amount_due)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals Breakdown */}
          <div className="border-t border-slate-200 pt-4 flex justify-between items-start">
            <div className="text-xs text-slate-500 max-w-xs">
              {data.notes ? `Note: ${data.notes}` : "This is a computer-generated receipt valid without physical signature."}
            </div>
            <div className="text-right space-y-1">
              <div className="flex justify-between gap-8 text-xs text-slate-600">
                <span>{isReceipt ? "Amount Received:" : "Total Amount Due:"}</span>
                <span className="font-mono font-bold text-slate-900 text-base">
                  {formatCurrency(isReceipt ? data.amount : invoice.amount_due)}
                </span>
              </div>
              {isReceipt && invoice.amount_due && (
                <div className="flex justify-between gap-8 text-xs text-slate-500">
                  <span>Remaining Balance:</span>
                  <span className="font-mono font-medium text-slate-700">
                    {formatCurrency(Math.max(0, Number(invoice.amount_due) - Number(invoice.amount_paid)))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Signature Placeholder */}
          <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-end text-xs text-slate-400">
            <div>Authorized Seal</div>
            <div className="text-right border-t border-slate-300 pt-2 min-w-[140px] text-slate-600 font-medium">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
