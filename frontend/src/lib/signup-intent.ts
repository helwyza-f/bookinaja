export type SignupPlanKey = "starter" | "pro";
export type SignupBillingInterval = "monthly" | "annual";

export type SignupIntent = {
  plan?: SignupPlanKey;
  interval?: SignupBillingInterval;
  trial?: boolean;
  category?: string;
  ref?: string;
};

export const SIGNUP_INTENT_STORAGE_KEY = "bookinaja_signup_intent";

function normalizePlan(value?: string | null): SignupPlanKey | undefined {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "starter" || normalized === "pro" ? normalized : undefined;
}

function normalizeInterval(value?: string | null): SignupBillingInterval | undefined {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "monthly" || normalized === "annual" ? normalized : undefined;
}

function normalizeBoolean(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function cleanIntent(intent: SignupIntent): SignupIntent {
  return {
    ...(normalizePlan(intent.plan) ? { plan: normalizePlan(intent.plan) } : {}),
    ...(normalizeInterval(intent.interval) ? { interval: normalizeInterval(intent.interval) } : {}),
    ...(intent.trial ? { trial: true } : {}),
    ...(intent.category?.trim() ? { category: intent.category.trim() } : {}),
    ...(intent.ref?.trim() ? { ref: intent.ref.trim().toUpperCase() } : {}),
  };
}

export function readSignupIntentFromParams(params: { get: (name: string) => string | null }): SignupIntent {
  return cleanIntent({
    plan: normalizePlan(params.get("plan")),
    interval: normalizeInterval(params.get("interval")),
    trial: normalizeBoolean(params.get("trial")),
    category: params.get("category") || "",
    ref: params.get("ref") || "",
  });
}

export function hasSignupIntent(intent: SignupIntent) {
  return Boolean(intent.plan || intent.interval || intent.trial || intent.category || intent.ref);
}

export function mergeSignupIntent(base: SignupIntent, next: SignupIntent) {
  return cleanIntent({ ...base, ...next });
}

export function saveSignupIntent(intent: SignupIntent) {
  if (typeof window === "undefined") return;
  const cleaned = cleanIntent(intent);
  if (!hasSignupIntent(cleaned)) return;
  window.localStorage.setItem(SIGNUP_INTENT_STORAGE_KEY, JSON.stringify(cleaned));
}

export function getStoredSignupIntent(): SignupIntent {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SIGNUP_INTENT_STORAGE_KEY) || "{}") as SignupIntent;
    return cleanIntent(parsed);
  } catch {
    return {};
  }
}

export function clearStoredSignupIntent() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SIGNUP_INTENT_STORAGE_KEY);
}

export function signupIntentToQuery(intent: SignupIntent) {
  const cleaned = cleanIntent(intent);
  const params = new URLSearchParams();
  if (cleaned.plan) params.set("plan", cleaned.plan);
  if (cleaned.interval) params.set("interval", cleaned.interval);
  if (cleaned.trial) params.set("trial", "1");
  if (cleaned.category) params.set("category", cleaned.category);
  if (cleaned.ref) params.set("ref", cleaned.ref);
  return params;
}

export function getSignupIntentPlanLabel(intent: SignupIntent) {
  if (intent.plan === "pro") return "Pro";
  if (intent.plan === "starter") return "Starter";
  return "Trial";
}
