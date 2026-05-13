export type BillingPlanKey = "trial" | "starter" | "pro" | "scale";

export type BillingPlanDefinition = {
  key: BillingPlanKey;
  name: string;
  label: string;
  headline: string;
  note: string;
  monthly: number;
  annualTotal: number;
  monthlyBefore: number;
  annualBefore: number;
  publicFeatures: string[];
  adminFeatures: string[];
  recommended?: boolean;
  comingSoon?: boolean;
};

export const BILLING_PLANS: BillingPlanDefinition[] = [
  {
    key: "trial",
    name: "Free Trial",
    label: "Untuk coba dulu",
    headline: "Coba alur Bookinaja dulu sebelum commit ke plan berbayar.",
    note: "Dipakai untuk validasi flow dan memastikan tenant terasa hidup sejak awal.",
    monthly: 0,
    annualTotal: 0,
    monthlyBefore: 0,
    annualBefore: 0,
    publicFeatures: [
      "Trial 30 hari",
      "Landing tenant aktif",
      "Dashboard dasar",
      "Flow booking bisa dicoba",
    ],
    adminFeatures: [
      "Landing tenant",
      "Dashboard dasar",
      "Booking flow dasar",
      "Validasi operasional awal",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    label: "Untuk owner solo",
    headline: "Berhenti dari catatan manual dan mulai operasional lebih rapi.",
    note: "Cocok untuk bisnis kecil yang ingin mulai rapi tanpa tim besar.",
    monthly: 149000,
    annualTotal: 1490000,
    monthlyBefore: 199000,
    annualBefore: 2388000,
    publicFeatures: [
      "1 akun owner",
      "Website booking tenant",
      "Customer portal dasar",
      "Resource & booking management",
      "Laporan pendapatan dasar",
    ],
    adminFeatures: [
      "Booking inti",
      "Dashboard dasar",
      "Landing tenant",
      "Customer portal",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    label: "Paling masuk akal",
    headline: "Kontrol staff, payment flow, dan operasional harian yang lebih disiplin.",
    note: "Plan terbaik untuk bisnis yang sudah jalan dan mulai membagi operasional ke tim.",
    monthly: 349000,
    annualTotal: 3490000,
    monthlyBefore: 449000,
    annualBefore: 5388000,
    publicFeatures: [
      "Semua fitur Starter",
      "Multi staff account",
      "Role-based access",
      "POS & checkout workflow",
      "Payment ops lebih kuat",
    ],
    adminFeatures: [
      "Semua Starter",
      "Akun staff",
      "Receipt Pro",
      "Analytics lebih lengkap",
      "Broadcast & F&B report",
    ],
    recommended: true,
  },
  {
    key: "scale",
    name: "Scale",
    label: "Untuk growth berikutnya",
    headline: "Membership, loyalty, dan retention saat bisnis sudah siap main lebih jauh.",
    note: "Ditampilkan sebagai anchor premium untuk arah produk berikutnya.",
    monthly: 499000,
    annualTotal: 4990000,
    monthlyBefore: 649000,
    annualBefore: 7788000,
    publicFeatures: [
      "Semua fitur Pro",
      "Membership per tenant",
      "Reward & retention flow",
      "CRM segmentation lebih kuat",
      "Readiness untuk multi outlet",
    ],
    adminFeatures: [
      "Semua Pro",
      "Membership",
      "Retention tools",
      "CRM segmentation",
    ],
    comingSoon: true,
  },
] as const;

export function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function annualMonthlyEquivalent(annualTotal: number) {
  return Math.round(annualTotal / 12);
}

export function annualSavingsPercent(monthlyPrice: number, annualTotal: number) {
  const regularAnnual = monthlyPrice * 12;
  if (!regularAnnual) return 0;
  return Math.round(((regularAnnual - annualTotal) / regularAnnual) * 100);
}

export function getBillingPlan(key: string) {
  return BILLING_PLANS.find((plan) => plan.key === key);
}
