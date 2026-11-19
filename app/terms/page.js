import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, Scale, CreditCard } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Institute WhatsApp Automation Portal",
  description: "Terms of service and subscription agreement for the Coaching Institute Management Platform.",
};

export default function TermsOfServicePage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium mb-3">
            <FileText className="w-3.5 h-3.5" />
            Legal Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            Terms of Service
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Please read these Terms of Service carefully before utilizing our multi-institute coaching platform, 
            teacher portals, and WhatsApp messaging automation services.
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-8 text-sm sm:text-base text-slate-300 leading-relaxed">

          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 text-white font-semibold text-lg mb-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              1. Acceptance of Terms
            </div>
            <p className="text-slate-400">
              By accessing, registering an institute, logging into the administrative portal, or dispatching 
              communications through our APIs, you acknowledge that you have read, understood, and agreed to 
              be legally bound by these Terms of Service and our Privacy Policy. If you do not agree, you must 
              discontinue use immediately.
            </p>
          </section>

          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 text-white font-semibold text-lg mb-3">
              <Scale className="w-5 h-5 text-blue-400" />
              2. Acceptable Use & Educational Scope
            </div>
            <p className="mb-3">
              Our platform is exclusively intended for registered educational academies, coaching centres, schools, 
              and independent tutors. You agree that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>Messages dispatched must strictly pertain to student attendance, performance assessments, scheduled test results, fee notices, and legitimate academic updates.</li>
              <li>You will not broadcast unsolicited commercial promotions, unauthorized bulk advertisements, political messaging, or illegal materials.</li>
              <li>You are solely responsible for ensuring that parent contact numbers provided have consented to receiving operational messages from your institute.</li>
              <li>Any violation of Meta Business Messaging policies may lead to immediate suspension of your WhatsApp integration.</li>
            </ul>
          </section>

          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 text-white font-semibold text-lg mb-3">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              3. Subscription Plans, Quotas & Billing
            </div>
            <p className="mb-3">
              Institutes subscribe to tiered plans (Starter, Growth, Pro, Enterprise) which define the monthly allowance 
              of outbound WhatsApp messages:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li><strong className="text-slate-200">Quota Cycles:</strong> Monthly message counters reset on the 1st of each calendar month. Unused messages do not carry forward.</li>
              <li><strong className="text-slate-200">Overage Protection:</strong> When an institute exhausts its monthly allowance, automated dispatches pause or fallback to secondary channels until the quota is topped up.</li>
              <li><strong className="text-slate-200">Cancellations & Refunds:</strong> Subscriptions are billed on a recurring monthly or annual basis. Cancellations take effect at the conclusion of the current billing cycle.</li>
            </ul>
          </section>

          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 text-white font-semibold text-lg mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              4. Disclaimer of Warranties & WhatsApp Third-Party API
            </div>
            <p className="text-slate-400 leading-relaxed mb-3">
              While we maintain high availability and exponential backoff retry algorithms for message delivery, 
              delivery to handsets ultimately relies on the Meta WhatsApp Cloud API and telecommunication carrier networks. 
              We do not guarantee 100% immediate delivery in cases where recipient devices are offline, numbers are invalid, 
              or upstream WhatsApp outages occur.
            </p>
          </section>

          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 text-white font-semibold text-lg mb-3">
              <Scale className="w-5 h-5 text-cyan-400" />
              5. Governing Law & Jurisdiction
            </div>
            <p className="text-slate-400">
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising 
              under or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of India.
            </p>
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
