export type RealtimeEvent = {
  type: string;
  tenant_id?: string;
  channel?: string;
  entity_type?: string;
  entity_id?: string;
  occurred_at?: string;
  version?: number;
  summary?: Record<string, unknown>;
  refs?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

export const BOOKING_EVENT_PREFIXES = [
  "booking.",
  "session.",
  "payment.",
  "order.",
] as const;

export function matchesRealtimePrefix(
  eventType: string | undefined,
  prefixes: readonly string[],
) {
  if (!eventType) return false;
  return prefixes.some((prefix) => eventType.startsWith(prefix));
}
