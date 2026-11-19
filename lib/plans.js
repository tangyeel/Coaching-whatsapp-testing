// Central plan tiers, message limits, and pricing constants
export const PLANS = {
  starter: {
    tier: "starter",
    label: "Starter",
    name: "Starter Plan",
    quota: 500,
    price_inr: 1499,
    price_paise: 149900,
    description: "Best for small tuitions and individual tutors just getting started.",
    features: [
      "500 WhatsApp Messages / month",
      "Up to 2 Batches & 50 Students",
      "Automated Attendance Absent Alerts",
      "Fee Reminders & Receipts",
      "Teacher Portal Access",
      "Standard WhatsApp Delivery",
    ],
    highlight: false,
    badge: null,
  },
  growth: {
    tier: "growth",
    label: "Growth",
    name: "Growth Plan",
    quota: 2000,
    price_inr: 3499,
    price_paise: 349900,
    description: "Designed for expanding coaching centres with multiple active teachers.",
    features: [
      "2,000 WhatsApp Messages / month",
      "Up to 10 Batches & 250 Students",
      "Fee Reminder Autopilot (7d, 2d, due)",
      "Student Excel Import & Batch Transfers",
      "White-Label Branding (Logo & Accent)",
      "Priority WhatsApp Delivery Speed",
    ],
    highlight: true,
    badge: "Most Popular",
  },
  pro: {
    tier: "pro",
    label: "Pro",
    name: "Pro Institute",
    quota: 5000,
    price_inr: 6999,
    price_paise: 699900,
    description: "Full-scale solution for established institutes & academies.",
    features: [
      "5,000 WhatsApp Messages / month",
      "Unlimited Batches & Students",
      "Batch-Wise Bulk Invoicing",
      "Print-Isolated Report Cards & Receipts",
      "Dedicated Meta Phone Number ID",
      "Priority Phone & WhatsApp Support",
    ],
    highlight: false,
    badge: "Recommended for Academies",
  },
  enterprise: {
    tier: "enterprise",
    label: "Enterprise",
    name: "Enterprise Multi-Branch",
    quota: 15000,
    price_inr: 14999,
    price_paise: 1499900,
    description: "For multi-branch institutions needing custom quotas and integrations.",
    features: [
      "15,000+ WhatsApp Messages / month",
      "Multi-Branch Architecture Ready",
      "Custom Message Templates & Broadcasts",
      "Dedicated WhatsApp Account Setup",
      "Custom SLA & Guaranteed Uptime",
      "Dedicated Account Manager",
    ],
    highlight: false,
    badge: "Custom Scale",
  },
};

export const PLAN_LIST = [
  PLANS.starter,
  PLANS.growth,
  PLANS.pro,
  PLANS.enterprise,
];

export function getPlanDetails(tier) {
  return PLANS[tier] || PLANS.starter;
}
