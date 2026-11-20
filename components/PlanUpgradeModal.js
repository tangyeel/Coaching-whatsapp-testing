"use client";
import { useState } from "react";
import { Sparkles, X, CheckCircle2, AlertCircle, Zap, ShieldCheck } from "lucide-react";
import { PLAN_LIST } from "@/lib/plans";
import { toast } from "@/components/Toast";

export default function PlanUpgradeModal({ isOpen, onClose, currentTier, onUpgradeSuccess }) {
  const [selectedTier, setSelectedTier] = useState("growth");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  async function handleProceedPayment() {
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Create order
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: selectedTier }),
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to initialize order");
      }

      // If mock mode (development or demo)
      if (orderData.mock || !window.Razorpay) {
        // Attempt to load Razorpay script if not already on window
        if (!window.Razorpay) {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          document.body.appendChild(script);
        }

        // Complete via verification API
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: `pay_test_${Date.now()}`,
            razorpay_signature: "mock_signature",
            plan_tier: selectedTier,
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error || "Payment verification failed");
        }

        toast.success(verifyData.message || "Plan upgraded successfully!");
        if (onUpgradeSuccess) onUpgradeSuccess(verifyData.institute);
        onClose();
        return;
      }

      // Live Razorpay Checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CoachingPulse Platform",
        description: `Upgrade to ${orderData.plan_name}`,
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            const vRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_tier: selectedTier,
              }),
            });
            const vData = await vRes.json();
            if (vData.success) {
              toast.success("Subscription upgraded successfully!");
              if (onUpgradeSuccess) onUpgradeSuccess(vData.institute);
              onClose();
            } else {
              toast.error(vData.error || "Verification failed");
            }
          } catch (vErr) {
            toast.error(vErr.message);
          }
        },
        theme: {
          color: "#2563eb",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setErrorMsg(err.message || "Payment initiation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Upgrade Institute Plan & Message Quota</h3>
              <p className="text-xs text-slate-400">Expand your monthly WhatsApp allowances and unlock pro features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_LIST.map((plan) => {
            const isCurrent = currentTier === plan.tier;
            const isSelected = selectedTier === plan.tier;

            return (
              <div
                key={plan.tier}
                onClick={() => !isCurrent && setSelectedTier(plan.tier)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-blue-600/10 border-blue-500 shadow-md shadow-blue-900/30"
                    : isCurrent
                    ? "bg-slate-950/60 border-slate-800 opacity-60 cursor-not-allowed"
                    : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white">{plan.label}</span>
                    {isCurrent && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase font-semibold">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-extrabold text-white font-mono">
                    ₹{plan.price_inr.toLocaleString("en-IN")}
                    <span className="text-xs text-slate-400 font-sans font-normal">/mo</span>
                  </div>
                  <div className="text-xs text-blue-400 font-medium mt-1">
                    {plan.quota.toLocaleString("en-IN")} msgs / month
                  </div>

                  <ul className="mt-4 space-y-1.5 text-[11px] text-slate-300">
                    {plan.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/60">
                  <span
                    className={`block w-full py-1.5 rounded-lg text-center text-xs font-semibold ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : isCurrent
                        ? "text-slate-500"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {isCurrent ? "Active Plan" : isSelected ? "Selected" : "Select"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secured via Razorpay &bull; Instant quota activation &bull; Cancel anytime</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceedPayment}
              disabled={loading || selectedTier === currentTier}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Preparing Checkout...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Activate Selected Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
