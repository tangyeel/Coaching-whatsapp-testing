"use client";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

let toastListeners = [];
let toastIdCounter = 0;

export function toast(message, type = "success", duration = 4000) {
  const id = ++toastIdCounter;
  toastListeners.forEach(fn => fn({ id, message, type, duration }));
  return id;
}
toast.success = (msg, dur) => toast(msg, "success", dur);
toast.error = (msg, dur) => toast(msg, "error", dur);
toast.info = (msg, dur) => toast(msg, "info", dur);

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (t) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, t.duration);
    };
    toastListeners.push(listener);
    return () => { toastListeners = toastListeners.filter(l => l !== listener); };
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(x => x.id !== id));
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? AlertCircle : Info;
        const colors = {
          success: "bg-slate-900 border-emerald-500/40 text-emerald-300",
          error: "bg-slate-900 border-rose-500/40 text-rose-300",
          info: "bg-slate-900 border-blue-500/40 text-blue-300",
        };
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl max-w-sm animate-slide-in ${colors[t.type]}`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-xs font-medium flex-1 leading-relaxed">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-white shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
