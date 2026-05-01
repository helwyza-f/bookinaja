import api from "@/lib/api";

type DiscoveryEventPayload = {
  tenant_id?: string;
  tenant_slug?: string;
  event_type: "impression" | "click";
  surface: string;
  section_id?: string;
  card_variant?: string;
  position_index?: number;
  promo_label?: string;
  metadata?: Record<string, unknown>;
};

const sessionKey = "bookinaja_discovery_session_id";

export function getDiscoverySessionId() {
  if (typeof window === "undefined") return "server";
  const existing = window.sessionStorage.getItem(sessionKey);
  if (existing) return existing;
  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session-${Date.now()}`;
  window.sessionStorage.setItem(sessionKey, next);
  return next;
}

export function trackDiscoveryEvent(payload: DiscoveryEventPayload) {
  const body = {
    ...payload,
    session_id: getDiscoverySessionId(),
  };

  if (typeof navigator !== "undefined" && payload.event_type === "click" && navigator.sendBeacon) {
    try {
      const url = `${api.defaults.baseURL}/public/discover/events`;
      const blob = new Blob([JSON.stringify(body)], {
        type: "application/json",
      });
      navigator.sendBeacon(url, blob);
      return;
    } catch {
      // fallback below
    }
  }

  void api.post("/public/discover/events", body).catch(() => undefined);
}

export function discoveryImpressionKey(parts: Array<string | number | undefined>) {
  return parts.filter(Boolean).join(":");
}
