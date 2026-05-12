import api from "@/lib/api";
import { createRuntimeId } from "@/lib/runtime-id";

type DiscoveryEventPayload = {
  tenant_id?: string;
  tenant_slug?: string;
  event_type:
    | "impression"
    | "click"
    | "detail_view"
    | "tenant_open"
    | "booking_start"
    | "related_click"
    | "tenant_profile_open_from_related";
  surface: string;
  section_id?: string;
  card_variant?: string;
  position_index?: number;
  promo_label?: string;
  metadata?: Record<string, unknown>;
};

const sessionKey = "bookinaja_discovery_session_id";
const recentEventWindowMs = 15000;
const recentPassiveEvents = new Map<string, number>();
const batchedPassiveEventTypes = new Set<DiscoveryEventPayload["event_type"]>([
  "impression",
  "detail_view",
]);
const batchFlushDelayMs = 1200;
const batchFlushSize = 8;
let pendingPassiveEvents: DiscoveryEventPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let pageLifecycleBound = false;

export function getDiscoverySessionId() {
  if (typeof window === "undefined") return "server";
  const existing = window.sessionStorage.getItem(sessionKey);
  if (existing) return existing;
  const next = createRuntimeId("session");
  window.sessionStorage.setItem(sessionKey, next);
  return next;
}

function getPassiveEventKey(payload: DiscoveryEventPayload) {
  return [
    payload.event_type,
    payload.surface,
    payload.section_id || "",
    payload.card_variant || "",
    payload.position_index ?? "",
    payload.tenant_id || "",
    payload.tenant_slug || "",
    String(payload.metadata?.["post_id"] || ""),
  ].join(":");
}

function shouldSkipPassiveEvent(payload: DiscoveryEventPayload) {
  if (!["impression", "detail_view"].includes(payload.event_type)) return false;
  const key = getPassiveEventKey(payload);
  const now = Date.now();
  const previous = recentPassiveEvents.get(key);
  if (previous && now - previous < recentEventWindowMs) {
    return true;
  }
  recentPassiveEvents.set(key, now);
  return false;
}

function getDiscoveryEventsURL() {
  return `${api.defaults.baseURL}/public/discover/events`;
}

function flushPassiveEvents(useBeacon = false) {
  if (pendingPassiveEvents.length === 0) return;
  const queue = pendingPassiveEvents.map((payload) => ({
    ...payload,
    session_id: getDiscoverySessionId(),
  }));
  pendingPassiveEvents = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([JSON.stringify(queue)], {
        type: "application/json",
      });
      navigator.sendBeacon(getDiscoveryEventsURL(), blob);
      return;
    } catch {
      // fallback below
    }
  }

  void api.post("/public/discover/events", queue).catch(() => undefined);
}

function schedulePassiveFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushPassiveEvents(false);
  }, batchFlushDelayMs);
}

function ensurePageLifecycleBinding() {
  if (pageLifecycleBound || typeof window === "undefined") return;
  pageLifecycleBound = true;
  const flush = () => flushPassiveEvents(true);
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export function trackDiscoveryEvent(payload: DiscoveryEventPayload) {
  if (shouldSkipPassiveEvent(payload)) return;

  if (batchedPassiveEventTypes.has(payload.event_type)) {
    ensurePageLifecycleBinding();
    pendingPassiveEvents.push(payload);
    if (pendingPassiveEvents.length >= batchFlushSize) {
      flushPassiveEvents(false);
      return;
    }
    schedulePassiveFlush();
    return;
  }

  const body = {
    ...payload,
    session_id: getDiscoverySessionId(),
  };

  if (
    typeof navigator !== "undefined" &&
    ["click", "tenant_open", "booking_start", "related_click", "tenant_profile_open_from_related"].includes(payload.event_type) &&
    navigator.sendBeacon
  ) {
    try {
      const blob = new Blob([JSON.stringify(body)], {
        type: "application/json",
      });
      navigator.sendBeacon(getDiscoveryEventsURL(), blob);
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
