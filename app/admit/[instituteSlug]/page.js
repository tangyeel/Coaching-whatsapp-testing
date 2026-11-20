"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { GraduationCap, User, Phone, Mail, MapPin, Calendar, CheckCircle2, AlertCircle, Send, School } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PublicAdmissionPage() {
  const params = useParams();
  const slug = params?.instituteSlug;

  const [institute, setInstitute] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    student_name: "",
    student_dob: "",
    parent_name: "",
    parent_phone: "",
    parent_email: "",
    address: "",
    batch_id: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchInstituteData() {
      if (!slug) return;
      try {
        const supabase = createClient();
        const { data: inst, error } = await supabase
          .from("institutes")
          .select("id, name, slug, logo_url, banner_color, contact_phone, address")
          .eq("slug", slug)
          .single();

        if (error || !inst) {
          setErrorMsg("Institute not found or link has expired.");
          return;
        }

        setInstitute(inst);

        // Fetch public batches
        const { data: batchList } = await supabase
          .from("batches")
          .select("id, name, academic_year")
          .eq("institute_id", inst.id)
          .is("deleted_at", null)
          .eq("is_active", true);

        setBatches(batchList || []);
      } catch (err) {
        setErrorMsg("Failed to load institute details.");
      } finally {
        setLoading(false);
      }
    }

    fetchInstituteData();
  }, [slug]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!institute) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          institute_id: institute.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Submission failed");
      }

      setSubmitted(true);
    } catch (err) {
      setErrorMsg(err.message || "Failed to submit admission application");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!institute) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold">Institute Portal Not Found</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Please verify the admission link provided by your academy or school.
        </p>
      </div>
    );
  }

  const accentColor = institute.banner_color || "#2563eb";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Institute Header Banner */}
      <div style={{ backgroundColor: accentColor }} className="py-6 px-4 sm:px-6 shadow-xl">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          {institute.logo_url ? (
            <img
              src={institute.logo_url}
              alt={institute.name}
              className="w-14 h-14 rounded-2xl bg-white object-contain p-1.5 shadow-md shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <School className="w-8 h-8" />
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{institute.name}</h1>
            <p className="text-xs text-white/80 mt-0.5">Online Student Admission & Enrollment Portal</p>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white">Application Received!</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Thank you for applying to <strong>{institute.name}</strong>. An acknowledgment has been dispatched to your mobile number. The academy office will contact you with batch scheduling details.
              </p>
              <div className="pt-4 text-xs text-slate-500">
                Need urgent assistance? Call <strong>{institute.contact_phone || "the front desk"}</strong>.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Student & Parent Details</h2>
                <p className="text-xs text-slate-400 mt-0.5">Please provide accurate applicant information for official records</p>
              </div>

              {/* Student Name & DOB */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Student Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={formData.student_name}
                      onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                      placeholder="e.g. Ananya Roy"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="date"
                      value={formData.student_dob}
                      onChange={(e) => setFormData({ ...formData, student_dob: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Parent Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Parent / Guardian Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={formData.parent_name}
                      onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                      placeholder="e.g. Subhash Roy"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    WhatsApp Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={formData.parent_phone}
                      onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                      placeholder="9876543210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Parent Email & Preferred Batch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={formData.parent_email}
                      onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                      placeholder="parent@example.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Preferred Batch / Course
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <select
                      value={formData.batch_id}
                      onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="">General Enrollment (Counselor will assign)</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.academic_year})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Residential Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="House number, street, landmark, city"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Special Academic Requirements or Queries
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Previous school score, target competitive exam, morning vs evening timing"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{ backgroundColor: accentColor }}
                className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs shadow-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Submit Admission Application</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800 text-center text-xs text-slate-500">
        Powered by CoachingPulse WhatsApp Automation System
      </footer>
    </div>
  );
}
