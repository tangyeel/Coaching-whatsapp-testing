"use client";
import { useState } from "react";
import { MessageSquare, Send, X, AlertCircle, CheckCircle2, Users, Layers, Sparkles } from "lucide-react";

export default function BroadcastModal({ isOpen, onClose, batches, students, quotaRemaining, onBroadcastSent }) {
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  // Filter students based on selection
  const eligibleStudents = (students || []).filter((s) => {
    if (s.deleted_at || !s.is_active) return false;
    const phone = s.guardian_phone || s.student_phone;
    if (!phone || phone.replace(/\D/g, "").length < 10) return false;
    if (selectedBatchId && s.batch_id !== selectedBatchId) return false;
    return true;
  });

  const targetCount = eligibleStudents.length;
  const isOverQuota = quotaRemaining !== null && quotaRemaining !== undefined && quotaRemaining > 0 && targetCount > quotaRemaining;

  async function handleSend(e) {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg("Please enter an announcement message.");
      return;
    }

    if (targetCount === 0) {
      setErrorMsg("No active students with valid phone numbers in this batch.");
      return;
    }

    if (isOverQuota) {
      setErrorMsg(`Quota exceeded. You need ${targetCount} messages, but only have ${quotaRemaining} remaining.`);
      return;
    }

    setSending(true);
    setErrorMsg("");
    setResult(null);

    try {
      const res = await fetch("/api/messages/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_id: selectedBatchId || null,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Failed to dispatch broadcast");
      }

      setResult(data);
      if (onBroadcastSent) onBroadcastSent();
    } catch (err) {
      setErrorMsg(err.message || "Failed to dispatch broadcast.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Broadcast WhatsApp Announcement</h3>
              <p className="text-xs text-slate-400">Direct message to parents of selected batch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Broadcast Dispatched!</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Successfully delivered to <strong>{result.sentCount}</strong> parent WhatsApp numbers
              {result.failedCount > 0 && <span className="text-amber-400"> ({result.failedCount} failed)</span>}.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              Done & Return to Outbox
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            {/* Batch Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">All Batches (Entire Institute)</option>
                {(batches || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.academic_year || "Current Year"})
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient Count & Quota Banner */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Recipients: <strong className="text-white">{targetCount}</strong> students</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Quota Left: <span className={isOverQuota ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                  {quotaRemaining ?? "∞"}
                </span>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Announcement Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Test Schedule for Upcoming Week"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  WhatsApp Message Body *
                </label>
                <span className="text-[10px] text-slate-500">{message.length}/1000</span>
              </div>
              <textarea
                rows={4}
                required
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here. Personalization variables will be formatted automatically..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors resize-none font-mono"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || targetCount === 0 || isOverQuota}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-900/30 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching ({targetCount} queued)...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Announcement ({targetCount})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
