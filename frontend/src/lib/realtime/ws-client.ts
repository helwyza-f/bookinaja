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

// Pilih token sesuai area yang sedang dibuka, mengikuti logika resolveRequestToken
// di lib/api.ts. Penting karena satu browser bisa punya sesi admin (account_token/
// auth_token) DAN customer (customer_auth) sekaligus. Kalau WS selalu memakai token
// admin, langganan channel "customer:*" ditolak backend (butuh AuthType customer),
// sehingga realtime di halaman customer mati.
function resolveRealtimeToken(): string {
  const accountToken = getCookie("account_token");
  const adminToken = getCookie("auth_token");
  const customerToken = getCookie("customer_auth");

  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (
      path === "/user" ||
      path.startsWith("/user/") ||
      path === "/me" ||
      path.startsWith("/me/")
    ) {
      return String(customerToken || "");
    }
    if (
      path === "/login" ||
      path === "/admin" ||
      path.startsWith("/admin/") ||
      path.startsWith("/dashboard")
    ) {
      return String(accountToken || adminToken || "");
    }
  }

  return String(accountToken || adminToken || customerToken || "");
}

export function buildRealtimeURL() {
  const token = resolveRealtimeToken();
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
