export const LANDING_COPY_BUDGET = {
  mobileNavbarBusinessType: 26,
  mobileHeroSlogan: 28,
  mobileHeroTagline: 58,
  mobileHeroDescription: 120,
  mobileHeroFeature: 28,
} as const;

export function normalizeLandingCopy(value?: string | null) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateLandingCopy(
  value: string | null | undefined,
  maxLength: number,
) {
  const normalized = normalizeLandingCopy(value);
  if (!normalized || normalized.length <= maxLength) {
    return normalized;
  }

  const sliced = normalized.slice(0, Math.max(0, maxLength - 1)).trim();
  const safe = sliced.replace(/[.,;:!?-]+$/g, "").trim();
  return `${safe}…`;
}
