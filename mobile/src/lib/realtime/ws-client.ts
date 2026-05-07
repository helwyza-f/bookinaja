import { API_BASE_URL } from "@/constants/app";
import { useSessionStore } from "@/stores/session-store";

export function buildRealtimeURL() {
  const session = useSessionStore.getState();
  const url = new URL(API_BASE_URL);
  const pathname = url.pathname.replace(/\/$/, "");
  url.pathname = `${pathname}/realtime/ws`;
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  if (session.token) {
    url.searchParams.set("token", session.token);
  }
  if (session.tenantSlug) {
    url.searchParams.set("slug", session.tenantSlug);
  }

  return url.toString();
}
