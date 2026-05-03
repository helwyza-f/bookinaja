import { getCookie } from "cookies-next";
import { getTenantSlugFromBrowser } from "@/lib/tenant";

function resolveRealtimeURL() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/api/v1`
      : "http://api.bookinaja.local:8080/api/v1");

  const url = new URL(apiBase);
  const pathname = url.pathname.replace(/\/$/, "");
  url.pathname = `${pathname}/realtime/ws`;
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url;
}

export function buildRealtimeURL() {
  const token = getCookie("auth_token") || getCookie("customer_auth");
  const slug = getTenantSlugFromBrowser();
  const url = resolveRealtimeURL();

  if (token) {
    url.searchParams.set("token", String(token));
  }
  if (slug) {
    url.searchParams.set("slug", slug);
  }

  return url.toString();
}
