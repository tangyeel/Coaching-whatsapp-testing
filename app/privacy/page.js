import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Eye, Server, RefreshCw, Mail } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Institute WhatsApp Automation Portal",
  description: "Privacy policy for the Coaching Institute WhatsApp Management & Attendance System.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back navigation */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <span className="text-xs text-slate-500">Effective Date: November 20, 2026</span>
        </div>

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Data Protection & Privacy
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            Privacy Policy
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            This Privacy Policy explains how our Platform collects, uses, protects, and handles personal data 
            when coaching institutes, educators, parents, and students interact with our WhatsApp automation 
            and school management portal.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-sm sm:text-base text-slate-300 leading-relaxed">
          
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 text-white font-semibold text-lg mb-3">
              <Eye className="w-5 h-5 text-blue-400" />
              1. Information We Collect
            </div>
            <p className="mb-3">
              When an institute onboards with us or registers student profiles, we collect only the data necessary to provide school administration and automated communications:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li><strong className="text-slate-200">Institute Data:</strong> Institute name, administrator name, contact phone number, billing address, and Meta WhatsApp Business credentials (stored encrypted).</li>
              <li><strong className="text-slate-200">Student & Parent Data:</strong> Student full name, roll number, batch assignment, parent/guardian mobile number, and optional student email address.</li>
              <li><strong className="text-slate-200">Academic & Financial Records:</strong> Attendance sessions (present/absent status), assessment marks, fee invoices, payment receipts, and due dates.</li>
              <li><strong className="text-slate-200">Communication Logs:</strong> Timestamps, message template types, message status (delivered/read/failed), and WhatsApp message job IDs.</li>
            </ul>
          </section>

          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 text-white font-semibold text-lg mb-3">
              <Server className="w-5 h-5 text-indigo-400" />
              2. How We Use Information
            </div>
            <p className="mb-3">
              Data collected is strictly utilized to operate institutional features and notify authorized recipients:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>Dispatching absent alerts directly to verified parent WhatsApp numbers when attendance is marked.</li>
              <li>Delivering periodic fee reminders, automated payment receipts, and examination scorecards.</li>
              <li>Enabling multi-tenant isolation so each institute can only view and manage its own students and batches.</li>
              <li>Maintaining system health, quota governance, and platform audit trails.</li>
            </ul>
            <p className="mt-3 text-slate-400">
              We never sell, rent, or monetize student or parent phone numbers to advertisers or third-party brokers.
            </p>
          </section>

          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 text-white font-semibold text-lg mb-3">
              <Lock className="w-5 h-5 text-emerald-400" />
              3. WhatsApp Business API & Meta Compliance
            </div>
            <p className="mb-3">
              Our service integrates directly with the Meta Cloud API for WhatsApp Business:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>Messages are sent exclusively through approved Meta message utility templates (such as attendance alerts and fee receipts).</li>
              <li>Meta system tokens and phone number IDs are stored with strict database isolation (Row Level Security & service role segregation) and are never exposed to browser clients.</li>
              <li>Users may opt out of automated WhatsApp communications at any time by contacting their respective coaching institute.</li>
            </ul>
          </section>

          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 text-white font-semibold text-lg mb-3">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              4. Data Retention, Soft Deletion & Rights
            </div>
            <p className="mb-3">
              Institutes maintain complete authority over their student databases:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li><strong className="text-slate-200">Soft Deletion:</strong> Students removed from the active roster are soft-deleted with reversible recovery safeguards, preventing inadvertent data loss.</li>
              <li><strong className="text-slate-200">Permanent Purge:</strong> Institutes can request permanent deletion of historical logs and student records upon written request.</li>
              <li><strong className="text-slate-200">Access & Correction:</strong> Parents can contact their institute administrator to update phone numbers or verify attendance history.</li>
            </ul>
          </section>

          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 text-white font-semibold text-lg mb-3">
              <Mail className="w-5 h-5 text-cyan-400" />
              5. Contact Us & Grievance Officer
            </div>
            <p className="text-slate-400 mb-2">
              If you have any questions about this Privacy Policy, your rights, or our security practices, contact our data protection team:
            </p>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-sm text-slate-300">
              <p><strong className="text-white">Data Protection Officer:</strong> Privacy & Compliance Desk</p>
              <p><strong className="text-white">Email:</strong> privacy@schoolportal.local</p>
              <p><strong className="text-white">Jurisdiction:</strong> India</p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Coaching Institute Portal. All rights reserved.
        </div>
      </div>
    </div>
  );
}
