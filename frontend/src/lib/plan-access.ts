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

type FeatureMeta = {
  label: string;
  shortLabel: string;
  description: string;
};

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

const PLAN_ORDER: BillingPlanKey[] = ["trial", "starter", "pro", "scale"];

const FEATURE_META: Record<TenantFeatureKey, FeatureMeta> = {
  advanced_receipt_branding: {
    label: "Receipt Branding",
    shortLabel: "Nota",
    description: "Template nota, branding struk, dan kontrol printer lanjutan.",
  },
  staff_accounts: {
    label: "Staff Accounts",
    shortLabel: "Staff",
    description: "Akun staff tambahan untuk operasional harian.",
  },
  role_permissions: {
    label: "Role Permissions",
    shortLabel: "RBAC",
    description: "Role custom dan kontrol izin yang lebih rapi.",
  },
  pos_workflow: {
    label: "POS Workflow",
    shortLabel: "POS",
    description: "Workflow POS untuk operasional yang lebih cepat.",
  },
  payment_method_management: {
    label: "Payment Method Management",
    shortLabel: "Pembayaran",
    description: "Kelola metode bayar manual dan otomatis dari tenant admin.",
  },
  manual_payment_verification: {
    label: "Manual Payment Verification",
    shortLabel: "Verifikasi",
    description: "Verifikasi bukti bayar manual langsung dari dashboard tenant.",
  },
  customer_import: {
    label: "Customer Import",
    shortLabel: "Import",
    description: "Migrasi pelanggan lama ke workspace tenant.",
  },
  crm_basic: {
    label: "CRM Basic",
    shortLabel: "CRM",
    description: "Workspace CRM dasar untuk pelanggan dan campaign.",
  },
  pricing_rules_flexible: {
    label: "Flexible Pricing Rules",
    shortLabel: "Pricing",
    description: "Aturan harga yang lebih fleksibel untuk operasional.",
  },
  advanced_analytics: {
    label: "Advanced Analytics",
    shortLabel: "Analytics",
    description: "Grafik, leaderboard, dan insight performa lebih dalam.",
  },
  whatsapp_blast: {
    label: "WhatsApp Blast",
    shortLabel: "WA Blast",
    description: "Kirim campaign WhatsApp langsung dari tenant admin.",
  },
  membership_enabled: {
    label: "Membership",
    shortLabel: "Member",
    description: "Program membership untuk customer tenant.",
  },
  membership_auto_join_enabled: {
    label: "Membership Auto Join",
    shortLabel: "Auto Join",
    description: "Customer otomatis masuk ke membership flow.",
  },
  membership_reward_redeem_enabled: {
    label: "Membership Reward Redeem",
    shortLabel: "Redeem",
    description: "Reward membership bisa diredeem di tenant.",
  },
  membership_analytics_enabled: {
    label: "Membership Analytics",
    shortLabel: "Member Analytics",
    description: "Insight khusus retention dan performa membership.",
  },
  retention_analytics: {
    label: "Retention Analytics",
    shortLabel: "Retention",
    description: "Analisis retensi customer untuk decision yang lebih tajam.",
  },
  growth_analytics: {
    label: "Growth Analytics",
    shortLabel: "Growth",
    description: "Insight growth dan distribusi performa tenant.",
  },
  multi_outlet_enabled: {
    label: "Multi Outlet",
    shortLabel: "Multi Outlet",
    description: "Kontrol untuk tenant multi outlet dan ekspansi.",
  },
  advanced_automation_controls: {
    label: "Advanced Automation",
    shortLabel: "Automation",
    description: "Automation lanjutan untuk workflow tenant.",
  },
  franchise_visibility: {
    label: "Franchise Visibility",
    shortLabel: "Franchise",
    description: "Visibilitas franchise dan struktur tenant yang lebih besar.",
  },
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
    plan_feature_matrix?: Record<string, string[]> | null;
  },
  feature: TenantFeatureKey,
) {
  const plan = normalizeBillingPlan(input.plan);
  const status = normalizeSubscriptionStatus(input.subscription_status);
  if (status !== "active" && status !== "trial") return false;
  const liveFeatures = Array.isArray(input.plan_features)
    ? input.plan_features.map((item) => String(item || "").trim()).filter(Boolean)
    : null;
  if (liveFeatures) {
    return liveFeatures.includes(feature);
  }
  return PLAN_FEATURES[plan].includes(feature);
}

function getFeatureMatrix(input?: {
  plan_feature_matrix?: Record<string, string[]> | null;
}) {
  const liveMatrix = input?.plan_feature_matrix;
  if (!liveMatrix || typeof liveMatrix !== "object") {
    return PLAN_FEATURES;
  }

  const normalized = {
    trial: [] as TenantFeatureKey[],
    starter: [] as TenantFeatureKey[],
    pro: [] as TenantFeatureKey[],
    scale: [] as TenantFeatureKey[],
  };

  (Object.keys(normalized) as BillingPlanKey[]).forEach((plan) => {
    const source = Array.isArray(liveMatrix[plan]) ? liveMatrix[plan] : [];
    normalized[plan] = source
      .map((item) => String(item || "").trim())
      .filter(Boolean) as TenantFeatureKey[];
  });

  return normalized;
}

export function getPlanFeatureMatrixResolved(input?: {
  plan_feature_matrix?: Record<string, string[]> | null;
}) {
  return getFeatureMatrix(input);
}

export function getFeatureMeta(feature: TenantFeatureKey): FeatureMeta {
  return FEATURE_META[feature];
}

export function getRequiredPlansForFeature(
  feature: TenantFeatureKey,
  input?: {
    plan_feature_matrix?: Record<string, string[]> | null;
  },
): BillingPlanKey[] {
  const matrix = getFeatureMatrix(input);
  return PLAN_ORDER.filter((plan) => matrix[plan].includes(feature));
}

export function getRequiredPlansForFeatures(
  features: TenantFeatureKey[],
  input?: {
    plan_feature_matrix?: Record<string, string[]> | null;
  },
): BillingPlanKey[] {
  const plans = new Set<BillingPlanKey>();
  features.forEach((feature) => {
    getRequiredPlansForFeature(feature, input).forEach((plan) => plans.add(plan));
  });
  return PLAN_ORDER.filter((plan) => plans.has(plan));
}

export function formatRequiredPlanLabel(plans: BillingPlanKey[]) {
  if (plans.length === 0) return "Plan custom";
  if (plans.length === 1) return formatPlanLabel(plans[0]);
  return plans.map((plan) => formatPlanLabel(plan)).join(" / ");
}

export function analyzeTenantFeatureAccess(
  input: {
    plan?: string | null;
    subscription_status?: string | null;
    plan_features?: string[] | null;
    plan_feature_matrix?: Record<string, string[]> | null;
  },
  requirement: {
    feature?: TenantFeatureKey;
    anyFeatures?: TenantFeatureKey[];
  },
) {
  const features = requirement.feature
    ? [requirement.feature]
    : requirement.anyFeatures || [];
  const status = normalizeSubscriptionStatus(input.subscription_status);
  const activeFeatures = features.filter((feature) => hasTenantFeature(input, feature));
  const requiredPlans = getRequiredPlansForFeatures(features, input);
  const requiredPlanLabel = formatRequiredPlanLabel(requiredPlans);
  const accessible = activeFeatures.length > 0;

  let state: "available" | "upgrade_required" | "inactive_subscription" | "unknown" = "unknown";
  if (accessible) {
    state = "available";
  } else if (status !== "active" && status !== "trial") {
    state = "inactive_subscription";
  } else {
    state = "upgrade_required";
  }

  return {
    state,
    accessible,
    status,
    requiredPlans,
    requiredPlanLabel,
    features,
    activeFeatures,
    missingFeatures: features.filter((feature) => !activeFeatures.includes(feature)),
  };
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
