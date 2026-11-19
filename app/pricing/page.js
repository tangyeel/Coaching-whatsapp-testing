"use client";
import { useState } from "react";
import MarketingNavbar from "@/components/marketing/MarketingNavbar";
import PricingSection from "@/components/marketing/PricingSection";
import DemoRequestSection from "@/components/marketing/DemoRequestSection";
import Link from "next/link";
import { ShieldCheck, HelpCircle } from "lucide-react";

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState("");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div>
        <MarketingNavbar />
        <main className="pt-8">
          <PricingSection onSelectPlan={(plan) => setSelectedPlan(plan)} />
          <DemoRequestSection preselectedPlan={selectedPlan} />
        </main>
      </div>

      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} CoachingPulse. Multi-Institute WhatsApp Automation.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-300">Terms of Service</Link>
            <Link href="/login" className="hover:text-slate-300">Admin Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
