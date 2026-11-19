"use client";
import { CheckCircle2, Zap, Sparkles } from "lucide-react";
import { PLAN_LIST } from "@/lib/plans";

export default function PricingSection({ onSelectPlan }) {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <Zap className="w-3.5 h-3.5" />
          Transparent, Scalable Pricing
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Invest in parent trust, not manual follow-ups.
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-400">
          Every plan includes complete access to attendance tracking, fee management, teacher portals, and white-labeled receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLAN_LIST.map((plan) => {
          const isHighlighted = plan.highlight;
          return (
            <div
              key={plan.tier}
              className={`relative rounded-2xl flex flex-col justify-between transition-all duration-200 ${
                isHighlighted
                  ? "bg-slate-900 border-2 border-blue-500 shadow-2xl shadow-blue-500/20 lg:-translate-y-2"
                  : "bg-slate-900/60 border border-slate-800 hover:border-slate-700"
              } p-6 sm:p-7`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-wider shadow-md">
                  {plan.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">{plan.label}</h3>
                </div>
                <p className="text-xs text-slate-400 mb-5 min-h-[36px]">
                  {plan.description}
                </p>

                <div className="mb-6 pb-6 border-b border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white">
                      ₹{plan.price_inr.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {plan.quota.toLocaleString("en-IN")} WhatsApp Messages / mo
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-3 mb-8">
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Included Capabilities:
                  </p>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <a
                  href="#demo"
                  onClick={() => onSelectPlan && onSelectPlan(plan.label)}
                  className={`w-full py-2.5 px-4 rounded-xl text-center text-sm font-semibold transition-all block ${
                    isHighlighted
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/60"
                  }`}
                >
                  Choose {plan.label}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center text-xs text-slate-500">
        Prices exclude standard GST where applicable. Need custom enterprise volume or multi-branch SLA?{" "}
        <a href="#demo" className="text-blue-400 hover:underline">
          Contact our architecture team
        </a>.
      </div>
    </section>
  );
}
