"use client";
import { useState } from "react";
import { ArrowRightLeft, AlertTriangle, X } from "lucide-react";

export default function TransferStudentModal({ isOpen, onClose, student, batches, onTransferSuccess }) {
  const [targetBatchId, setTargetBatchId] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !student) return null;

  const currentBatch = batches.find(b => b.id === student.batch_id);
  const availableBatches = batches.filter(b => b.id !== student.batch_id);

  async function handleTransfer(e) {
    e.preventDefault();
    if (!targetBatchId) {
      setError("Please select a target batch");
      return;
    }
    if (!confirmed) {
      setError("Please confirm the batch transfer check");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/students/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          to_batch_id: targetBatchId,
          reason: reason || "Routine batch transfer",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to transfer student");
        setLoading(false);
        return;
      }

      onTransferSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2 text-amber-400">
            <ArrowRightLeft className="w-5 h-5" />
            <h3 className="font-semibold text-sm text-white">Transfer Student</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleTransfer} className="p-6 space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              Batch transfers are permanent and audited in records. Historical marks and attendance will be preserved.
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Student</label>
            <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-medium text-white">
              {student.full_name} {student.roll_no ? `(${student.roll_no})` : ""}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Current Batch</label>
            <div className="px-3 py-2 bg-slate-950/60 border border-slate-800/60 rounded-lg text-xs text-slate-400">
              {currentBatch?.name || "Unknown Batch"}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 font-medium mb-1">Transfer To Destination Batch</label>
            <select
              value={targetBatchId}
              onChange={e => setTargetBatchId(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select target batch...</option>
              {availableBatches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.academic_year || "Current Year"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-300 font-medium mb-1">Reason for Transfer</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Schedule clash, requested morning batch"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
            />
            <span className="text-xs text-slate-300">
              I confirm transferring this student.
            </span>
          </label>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !targetBatchId || !confirmed}
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? "Transferring..." : "Confirm Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
