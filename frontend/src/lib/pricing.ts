export const BILLING_PLANS = [
  {
    key: "starter" as const,
    name: "Starter",
    monthly: 149000,
    annualTotal: 1490000,
    monthlyBefore: 199000,
    annualBefore: 2388000,
  },
  {
    key: "pro" as const,
    name: "Pro",
    monthly: 349000,
    annualTotal: 3490000,
    monthlyBefore: 449000,
    annualBefore: 5388000,
  },
  {
    key: "scale" as const,
    name: "Scale",
    monthly: 499000,
    annualTotal: 4990000,
    monthlyBefore: 649000,
    annualBefore: 7788000,
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
