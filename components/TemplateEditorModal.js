"use client";
import { useState, useEffect } from "react";
import { MessageSquare, X, CheckCircle2, AlertCircle, Sparkles, Tag, Undo } from "lucide-react";
import { toast } from "@/components/Toast";

export default function TemplateEditorModal({ isOpen, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [selectedKey, setSelectedKey] = useState("attendance_absent");
  const [editedBody, setEditedBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/templates/custom");
      const json = await res.json();
      if (json.success && json.templates) {
        setTemplates(json.templates);
        const current = json.templates.find((t) => t.key === selectedKey) || json.templates[0];
        if (current) {
          setSelectedKey(current.key);
          setEditedBody(current.currentBody);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectTemplate(key) {
    setSelectedKey(key);
    const tmpl = templates.find((t) => t.key === key);
    if (tmpl) {
      setEditedBody(tmpl.currentBody);
    }
  }

  function insertVariable(varName) {
    setEditedBody((prev) => `${prev} {{${varName}}}`);
  }

  function handleResetToDefault() {
    const tmpl = templates.find((t) => t.key === selectedKey);
    if (tmpl) {
      setEditedBody(tmpl.defaultBody);
      toast.info("Reset to default phrasing. Click save to persist.");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/whatsapp/templates/custom", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: selectedKey,
          body: editedBody,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save template");
      }

      toast.success("Template customization saved!");
      // Update local state
      setTemplates((prev) =>
        prev.map((t) =>
          t.key === selectedKey ? { ...t, currentBody: editedBody, isCustomized: true } : t
        )
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const currentTemplate = templates.find((t) => t.key === selectedKey);

  // Compute live preview with sample variables
  let previewText = editedBody;
  const sampleMap = {
    student_name: "Rahul Sharma",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    batch_name: "Class 10 Physics",
    institute_name: "Apex Academy",
    subject: "Mathematics",
    marks: "48",
    total: "50",
    percentage: "96",
    amount: "4,500",
    due_date: "15 Dec 2026",
    payment_date: "10 Nov 2026",
    receipt_no: "REC-2026-8812",
    message: "Special parent-teacher session scheduled this Saturday at 11:00 AM.",
  };

  for (const [k, v] of Object.entries(sampleMap)) {
    previewText = previewText.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), v);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Customize Message Phrasing</h3>
              <p className="text-xs text-slate-400">Personalize automated WhatsApp texts with dynamic student tags</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading institute templates...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto flex-1 pr-1">
            {/* Left Column: Template List */}
            <div className="md:col-span-4 space-y-2 border-r border-slate-800/80 pr-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Message Category
              </span>
              <div className="space-y-1.5">
                {templates.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => handleSelectTemplate(t.key)}
                    className={`w-full text-left p-3 rounded-xl transition-all text-xs font-semibold flex items-center justify-between ${
                      selectedKey === t.key
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                        : "bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800/60"
                    }`}
                  >
                    <span>{t.label}</span>
                    {t.isCustomized && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                        Custom
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Editor & Live Preview */}
            <div className="md:col-span-8 space-y-4">
              {currentTemplate && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{currentTemplate.label}</h4>
                      <p className="text-[11px] text-slate-400">Key: <span className="font-mono text-blue-400">{currentTemplate.key}</span></p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white underline"
                    >
                      <Undo className="w-3 h-3" />
                      <span>Reset Default</span>
                    </button>
                  </div>

                  {/* Variable insertion chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Click to insert variable tags:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentTemplate.variables.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(v)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1 transition-colors"
                        >
                          <Tag className="w-3 h-3 text-blue-400" />
                          <span>{`{{${v}}}`}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Template Phrasing
                    </label>
                    <textarea
                      rows={4}
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-mono resize-none leading-relaxed"
                    />
                  </div>

                  {/* Live Preview Box */}
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-400">
                      <Sparkles className="w-3 h-3" />
                      <span>Live WhatsApp Chat Preview</span>
                    </div>
                    <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-lg p-3 text-xs text-slate-200 leading-relaxed font-sans">
                      {previewText}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-900/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Custom Phrasing"}
          </button>
        </div>
      </div>
    </div>
  );
}
