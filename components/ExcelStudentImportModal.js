"use client";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { normalizePhone } from "@/lib/utils";
import { UploadCloud, CheckCircle2, AlertCircle, X, FileSpreadsheet } from "lucide-react";

export default function ExcelStudentImportModal({ isOpen, onClose, batches, onImportSuccess }) {
  const fileInputRef = useRef(null);
  const [targetBatchId, setTargetBatchId] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError("");

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const rawJson = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

        if (rawJson.length === 0) {
          setError("Spreadsheet is empty.");
          return;
        }

        // Map columns
        const mapped = rawJson.map((row, idx) => {
          const lowerMap = {};
          Object.keys(row).forEach(k => {
            const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
            lowerMap[cleanKey] = row[k];
          });

          const name = String(lowerMap.name || lowerMap.studentname || lowerMap.fullname || "").trim();
          const rawPhone = String(lowerMap.phone || lowerMap.number || lowerMap.whatsapp || lowerMap.guardianphone || "").trim();
          const roll = String(lowerMap.roll || lowerMap.rollno || lowerMap.rollnumber || "").trim();
          const guardian = String(lowerMap.guardian || lowerMap.guardianname || lowerMap.parent || "").trim();

          const normPhone = normalizePhone(rawPhone);

          return {
            rowNum: idx + 1,
            full_name: name,
            roll_no: roll || null,
            guardian_phone: normPhone,
            guardian_name: guardian || null,
            isValid: Boolean(name && normPhone && normPhone.length >= 10),
          };
        });

        setParsedRows(mapped);
      } catch (err) {
        setError("Failed to parse Excel file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (!targetBatchId) {
      setError("Please select a target batch");
      return;
    }

    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setError("No valid student rows found to import");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_id: targetBatchId,
          students: validRows,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to import students");
        setLoading(false);
        return;
      }

      onImportSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "An error occurred during import");
    } finally {
      setLoading(false);
    }
  }

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-sm text-white">Import Students from Excel</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Batch</label>
            <select
              value={targetBatchId}
              onChange={e => setTargetBatchId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select destination batch...</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40"
          >
            <UploadCloud className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">
              {fileName ? fileName : "Click to select or drop .xlsx / .xls file"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports columns: <code>Name</code>, <code>Phone</code>, <code>Roll</code>, <code>Guardian</code>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Preview ({parsedRows.length} rows detected)</span>
                <div className="flex gap-3 text-[11px]">
                  <span className="text-emerald-400 font-medium">{validCount} Ready</span>
                  {invalidCount > 0 && <span className="text-rose-400 font-medium">{invalidCount} Incomplete</span>}
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-400 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">Roll</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {parsedRows.map(r => (
                      <tr key={r.rowNum} className={r.isValid ? "hover:bg-slate-800/30" : "bg-rose-500/5 text-rose-300"}>
                        <td className="py-1.5 px-3 text-slate-500 font-mono">{r.rowNum}</td>
                        <td className="py-1.5 px-3 font-medium text-slate-200">{r.full_name || "—"}</td>
                        <td className="py-1.5 px-3 font-mono text-slate-400">{r.guardian_phone || "—"}</td>
                        <td className="py-1.5 px-3 text-slate-500">{r.roll_no || "—"}</td>
                        <td className="py-1.5 px-3 text-right">
                          {r.isValid ? (
                            <span className="text-emerald-400 text-[10px] font-bold uppercase">Ready</span>
                          ) : (
                            <span className="text-rose-400 text-[10px] font-bold uppercase">Missing info</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || validCount === 0 || !targetBatchId}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {loading ? "Importing Roster..." : `Import ${validCount} Students`}
          </button>
        </div>
      </div>
    </div>
  );
}
