"use client";
import { useState } from "react";
import Link from "next/link";
import MarketingNavbar from "@/components/marketing/MarketingNavbar";
import PricingSection from "@/components/marketing/PricingSection";
import DemoRequestSection from "@/components/marketing/DemoRequestSection";
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  Receipt,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  Users,
  Smartphone,
  Lock,
} from "lucide-react";

export default function HomePage() {
  const [selectedPlan, setSelectedPlan] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: "Do I need a separate phone number for WhatsApp automation?",
      a: "Yes. Meta WhatsApp Cloud API requires a phone number that is not currently registered on a personal WhatsApp consumer app. A fresh SIM card or virtual landline works perfectly. Our onboarding team assists you through the OTP verification.",
    },
    {
      q: "How does the Fee Reminder Autopilot work?",
      a: "When you create student invoices with due dates, our daily cron job automatically detects pending payments and dispatches polite WhatsApp reminders 7 days before, 2 days before, and on the due date itself—saving your staff hours of manual calling.",
    },
    {
      q: "Can my teachers see fees or students from other batches?",
      a: "No. Our multi-tenant architecture strictly enforces batch permissions. Teachers only see students enrolled in their assigned batches and can solely mark attendance or record test marks. Financial data and institute tokens remain restricted to administrators.",
    },
    {
      q: "What happens if our WhatsApp quota runs out during the month?",
      a: "Your quota status is tracked live on your command center. If you approach your limit, the system gracefully alerts you and can fall back to student email delivery. You can upgrade your tier or request a quota top-up at any time from your admin panel.",
    },
    {
      q: "Can I import my existing students from Microsoft Excel?",
      a: "Absolutely. We provide a 1-click Excel import template. You can upload hundreds of student records across multiple batches in under 10 seconds.",
    },
    {
      q: "Is student data protected and isolated?",
      a: "Yes. Every institute's data is isolated using PostgreSQL Row Level Security (RLS). Other academies or third parties cannot access your student rosters, financial numbers, or attendance records.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      <MarketingNavbar />

      <main>
        {/* ========================================================================= */}
        {/* HERO SECTION */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-slate-800/60">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-blue-600/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Pill Banner */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium mb-6 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Built for Indian Coaching Classes & Tuition Academies</span>
              <span className="text-slate-600">|</span>
              <span className="text-blue-400 flex items-center gap-1 font-semibold">
                Official Meta Cloud API
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
              The WhatsApp-First Operating System for <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-500 bg-clip-text text-transparent">Coaching Institutes</span>
            </h1>

            {/* Sub-headline */}
            <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Automate daily absent alerts, recover pending fees 6x faster with reminder autopilot, generate print-ready report cards, and give teachers 60-second attendance roll calls.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#demo"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm sm:text-base shadow-xl shadow-blue-600/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                Request 15-Minute Live Demo
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#features"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 font-medium text-sm sm:text-base transition-colors"
              >
                See How It Works
              </a>
            </div>

            {/* Trust Metric Badges */}
            <div className="mt-14 pt-10 border-t border-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto text-left">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-white">99.8%</div>
                <div className="text-xs text-slate-400 mt-1">Parent Message Read Rate</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">6x Faster</div>
                <div className="text-xs text-slate-400 mt-1">Fee Collection Recovery</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-blue-400">&lt; 60s</div>
                <div className="text-xs text-slate-400 mt-1">Batch Roll-Call Duration</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400">100%</div>
                <div className="text-xs text-slate-400 mt-1">Meta Utility Approved</div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PROBLEM VS SOLUTION SECTION */}
        {/* ========================================================================= */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Stop chasing parents. Start automating.
            </h2>
            <p className="mt-4 text-slate-400 text-sm sm:text-base">
              Traditional coaching administration wastes hours on phone calls, manual registers, and awkward payment follow-ups. Here is the modern way:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Old Way */}
            <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-6 sm:p-8 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">The Friction-Heavy Way</span>
              <h3 className="text-xl font-bold text-white">Manual Notebooks & Phone Calls</h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Teachers write attendance on paper; front desk calls 40 absent parents daily.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Admin sends uncomfortable manual WhatsApp texts chasing pending fee installments.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Paper receipts get lost, causing arguments over who paid what and when.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Report cards take 2 days of copy-pasting into spreadsheets before parent-teacher meets.</span>
                </li>
              </ul>
            </div>

            {/* The CoachingPulse Way */}
            <div className="bg-blue-950/20 border border-blue-900/40 rounded-2xl p-6 sm:p-8 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">The CoachingPulse Way</span>
              <h3 className="text-xl font-bold text-white">Automated WhatsApp Orchestration</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Teacher taps "Absent" on phone → Meta WhatsApp dispatches personalized message instantly.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Autopilot cron engine sends scheduled fee alerts at 7 days, 2 days, and due date.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Instant digital receipts with your academy logo and print-isolation for paper copies.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>One-click printable student report cards with subject-wise percentages & letter grades.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CORE FEATURES GRID */}
        {/* ========================================================================= */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
              Comprehensive Feature Suite
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything your coaching centre needs to run like clockwork.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">WhatsApp Absent Alerts</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Teachers take roll call in seconds. Absent students immediately trigger an official WhatsApp utility notification to their parents with student name, date, and batch.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Fee Autopilot & Bulk Invoicing</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Generate batch-wide fee invoices in one click. Our background autopilot engine dispatches polite reminders, tracking collected vs overdue revenue in real-time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Dedicated Teacher Portals</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Teachers receive lightweight, mobile-optimized portals showing only their assigned batches. They never see financial metrics or sensitive administrative controls.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Excel Student Roster Import</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Moving from Excel or paper? Upload your entire student roster in .xlsx format with phone numbers and batch tags. Auto-validation catches missing numbers.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Print-Isolated Report Cards</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Professional student report cards and fee receipts styled with your academy's logo and accent color. Clean print isolation produces crisp physical copies without web UI clutter.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Soft Deletes & Data Protection</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Never worry about accidental deletions. Removed students and batches are protected with reversible soft-deletes and instant undo restoration.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HOW IT WORKS (3 SIMPLE STEPS) */}
        {/* ========================================================================= */}
        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Get running in 3 straightforward steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Onboard & Connect Number</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Our global admin provisions your academy tenant and hooks up your official Meta WhatsApp Business phone number ID in minutes.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Import Batches & Students</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Upload your students via Excel spreadsheet or add them manually. Assign teachers to specific batches with dedicated logins.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Automate Daily Operations</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Take attendance, generate fee receipts, and broadcast marks. Parents receive instantaneous updates directly in their WhatsApp chats.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PRICING SECTION */}
        {/* ========================================================================= */}
        <PricingSection onSelectPlan={(plan) => setSelectedPlan(plan)} />

        {/* ========================================================================= */}
        {/* DEMO REQUEST SECTION */}
        {/* ========================================================================= */}
        <DemoRequestSection preselectedPlan={selectedPlan} />

        {/* ========================================================================= */}
        {/* FAQ ACCORDION */}
        {/* ========================================================================= */}
        <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-900">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-slate-400 text-sm">
              Common questions from coaching directors and academy founders.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full py-4 px-6 text-left flex items-center justify-between text-white font-semibold text-sm sm:text-base hover:text-blue-400 transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180 text-blue-400" : "text-slate-500"}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-base">CoachingPulse</span>
            <span className="text-xs text-slate-500 ml-2">© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing & Plans</Link>
            <Link href="/login" className="hover:text-white transition-colors">Admin Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
