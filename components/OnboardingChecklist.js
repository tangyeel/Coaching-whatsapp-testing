"use client";
import { useState, useEffect } from "react";
import {
  CheckCircle2, Circle, ArrowRight, Sparkles, X, Palette,
  KeyRound, Layers, UserPlus, Receipt, Trophy
} from "lucide-react";

export default function OnboardingChecklist({
  institute,
  students = [],
  batches = [],
  invoices = [],
  onNavigate,
}) {
  const [dismissed, setDismissed] = useState(false);
  const [waVerified, setWaVerified] = useState(false);

  useEffect(() => {
    if (!institute?.id) return;
    try {
      const isDismissed = localStorage.getItem(`checklist_dismissed_${institute.id}`) === "true";
      const isWaDone = localStorage.getItem(`checklist_wa_verified_${institute.id}`) === "true";
      if (isDismissed) setDismissed(true);
      if (isWaDone) setWaVerified(true);
    } catch (e) {
      // localStorage may fail in some iframe / incognito modes
    }
  }, [institute?.id]);

  if (dismissed || !institute) return null;

  const hasLogo = Boolean(institute.logo_url);
  const hasBatches = batches.filter(b => !b.deleted_at).length > 0;
  const hasStudents = students.filter(s => !s.deleted_at).length > 0;
  const hasInvoices = invoices.length > 0;

  const steps = [
    {
      id: "branding",
      title: "Set Institute Branding",
      desc: "Upload logo and choose accent color for receipts & report cards",
      isDone: hasLogo,
      tab: "settings",
      icon: Palette,
      color: "text-emerald-400",
    },
    {
      id: "whatsapp",
      title: "Verify WhatsApp Dispatch",
      desc: "Send a live test ping to verify cloud delivery",
      isDone: waVerified,
      tab: "settings",
      icon: KeyRound,
      color: "text-blue-400",
      customAction: () => {
        const next = !waVerified;
        setWaVerified(next);
        try {
          localStorage.setItem(`checklist_wa_verified_${institute.id}`, next ? "true" : "false");
        } catch (e) {}
      },
    },
    {
      id: "batches",
      title: "Create Your First Batch",
      desc: "Define academic cohorts (e.g., Class 10 - Morning)",
      isDone: hasBatches,
      tab: "batches",
      icon: Layers,
      color: "text-purple-400",
    },
    {
      id: "students",
      title: "Enroll Your First Student",
      desc: "Add student info with guardian WhatsApp number",
      isDone: hasStudents,
      tab: "students",
      icon: UserPlus,
      color: "text-amber-400",
    },
    {
      id: "invoices",
      title: "Issue Your First Fee Invoice",
      desc: "Create tuition invoice and generate printable receipt",
      isDone: hasInvoices,
      tab: "fees",
      icon: Receipt,
      color: "text-rose-400",
    },
  ];

  const completedCount = steps.filter(s => s.isDone).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(`checklist_dismissed_${institute.id}`, "true");
    } catch (e) {}
  }

  // If 100% complete, show a congratulatory banner
  if (completedCount === steps.length) {
    return (
      <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl flex items-center justify-between fade-in shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Campus Setup Complete!</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold">100%</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              All essential systems, branding, and rosters are operational. You're ready for daily dispatches.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition-colors"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4 fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Getting Started: Institute Setup Guide</h3>
            <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
              {completedCount} of {steps.length} Complete
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Complete these 5 quick steps to configure your institute for automated WhatsApp attendance & fee alerts.
          </p>
        </div>

        <button
          onClick={handleDismiss}
          title="Dismiss Checklist"
          className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {steps.map(step => {
          const StepIcon = step.icon;
          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                step.isDone
                  ? "bg-slate-950/40 border-slate-800/60 opacity-80"
                  : "bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {step.isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-semibold ${step.isDone ? "text-slate-300 line-through" : "text-white"}`}>
                    {step.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    {step.desc}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                {step.customAction ? (
                  <button
                    onClick={step.customAction}
                    className="text-[11px] text-slate-400 hover:text-white transition-colors"
                  >
                    {step.isDone ? "Mark Unverified" : "Mark as Verified"}
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    {step.isDone ? "Done" : "Pending"}
                  </span>
                )}

                {!step.isDone && onNavigate && (
                  <button
                    onClick={() => onNavigate(step.tab)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>Configure</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
