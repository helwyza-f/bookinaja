import { getBillingPlan } from "@/lib/pricing";

export type BillingPlanKey = "trial" | "starter" | "pro" | "scale";
export type SubscriptionStatusKey =
  | "trial"
  | "active"
  | "inactive"
  | "expired"
  | "suspended"
  | "unknown";

export type TenantFeatureKey =
  | "advanced_receipt_branding"
  | "staff_accounts"
  | "role_permissions"
  | "pos_workflow"
  | "payment_method_management"
  | "manual_payment_verification"
  | "customer_import"
  | "crm_basic"
  | "pricing_rules_flexible"
  | "advanced_analytics"
  | "whatsapp_blast"
  | "membership_enabled"
  | "membership_auto_join_enabled"
  | "membership_reward_redeem_enabled"
  | "membership_analytics_enabled"
  | "retention_analytics"
  | "growth_analytics"
  | "multi_outlet_enabled"
  | "advanced_automation_controls"
  | "franchise_visibility";

const PLAN_FEATURES: Record<BillingPlanKey, TenantFeatureKey[]> = {
  trial: [],
  starter: [],
  pro: [
    "advanced_receipt_branding",
    "staff_accounts",
    "role_permissions",
    "pos_workflow",
    "payment_method_management",
    "manual_payment_verification",
    "customer_import",
    "crm_basic",
    "pricing_rules_flexible",
    "advanced_analytics",
    "whatsapp_blast",
  ],
  scale: [
    "advanced_receipt_branding",
    "staff_accounts",
    "role_permissions",
    "pos_workflow",
    "payment_method_management",
    "manual_payment_verification",
    "customer_import",
    "crm_basic",
    "pricing_rules_flexible",
    "advanced_analytics",
    "whatsapp_blast",
    "membership_enabled",
    "membership_auto_join_enabled",
    "membership_reward_redeem_enabled",
    "membership_analytics_enabled",
    "retention_analytics",
    "growth_analytics",
    "multi_outlet_enabled",
    "advanced_automation_controls",
    "franchise_visibility",
  ],
};

export function normalizeBillingPlan(value?: string | null): BillingPlanKey {
  const plan = String(value || "").toLowerCase();
  if (plan === "trial") return "trial";
  if (plan === "pro") return "pro";
  if (plan === "scale") return "scale";
  return "starter";
}

export function normalizeSubscriptionStatus(
  value?: string | null,
): SubscriptionStatusKey {
  const status = String(value || "").toLowerCase();
  if (status === "trial") return "trial";
  if (status === "active") return "active";
  if (status === "inactive") return "inactive";
  if (status === "expired") return "expired";
  if (status === "suspended") return "suspended";
  return "unknown";
}

export function hasTenantFeature(
  input: {
    plan?: string | null;
    subscription_status?: string | null;
    plan_features?: string[] | null;
  },
  feature: TenantFeatureKey,
) {
  const plan = normalizeBillingPlan(input.plan);
  const status = normalizeSubscriptionStatus(input.subscription_status);
  if (status !== "active") return false;
  const liveFeatures = Array.isArray(input.plan_features)
    ? input.plan_features.map((item) => String(item || "").trim()).filter(Boolean)
    : null;
  if (liveFeatures) {
    return liveFeatures.includes(feature);
  }
  return PLAN_FEATURES[plan].includes(feature);
}

export function resolvePlanState(input: {
  plan?: string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
}) {
  const rawPlan = normalizeBillingPlan(input.plan);
  const status = normalizeSubscriptionStatus(input.subscription_status);
  const billingPlan = getBillingPlan(rawPlan);

  const title =
    rawPlan === "trial" || status === "trial"
      ? "Free Trial"
      : rawPlan === "pro"
        ? "Pro"
        : rawPlan === "scale"
          ? "Scale"
          : "Starter";

  const short =
    rawPlan === "trial" || status === "trial"
      ? "Coba flow Bookinaja dulu tanpa komitmen."
      : rawPlan === "pro"
        ? "Untuk tenant yang butuh tim dan kontrol lebih rapi."
        : rawPlan === "scale"
          ? "Untuk retention dan growth berikutnya."
          : "Untuk bisnis yang baru mulai rapi.";

  const tone =
    rawPlan === "trial" || status === "trial"
      ? "amber"
      : status === "active"
        ? "emerald"
        : status === "suspended"
          ? "rose"
          : "slate";

  const nextActionLabel =
    rawPlan === "trial" || status === "trial"
      ? "Pilih plan"
      : rawPlan === "starter"
        ? "Upgrade ke Pro"
        : "Kelola billing";

  const outcome =
    rawPlan === "trial" || status === "trial"
      ? "Supaya tenant tetap jalan setelah trial selesai, pilih plan saat kamu sudah yakin flow-nya cocok."
      : rawPlan === "starter"
        ? "Starter sudah cukup untuk mulai jalan. Upgrade ke Pro saat kamu mulai butuh staff, analytics, dan kontrol yang lebih kuat."
        : "Kamu sudah ada di plan yang paling lengkap yang tersedia saat ini.";

  return {
    rawPlan,
    status,
    billingPlan,
    title,
    short,
    tone,
    nextActionLabel,
    outcome,
    isTrial: rawPlan === "trial" || status === "trial",
    isActive: status === "active",
    isStarter: rawPlan === "starter",
    isPro: rawPlan === "pro",
  };
}

export function formatPlanLabel(value?: string | null) {
  const plan = normalizeBillingPlan(value);
  if (plan === "trial") return "Free Trial";
  if (plan === "pro") return "Pro";
  if (plan === "scale") return "Scale";
  return "Starter";
}

export function formatSubscriptionStatusLabel(value?: string | null) {
  const status = normalizeSubscriptionStatus(value);
  if (status === "trial") return "Trial";
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  if (status === "expired") return "Expired";
  if (status === "suspended") return "Suspended";
  return "Unknown";
}
