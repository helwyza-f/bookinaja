import { env } from "@/lib/env";
import { getAdminToken, getCustomerToken, getTenantSlug } from "@/lib/session";

function isProdRealtimeHost(hostname: string) {
  return hostname === "bookinaja.com" || hostname === "www.bookinaja.com" || hostname.endsWith(".bookinaja.com");
}

export function isRealtimeEnabledForAPI() {
  try {
    const url = new URL(env.apiUrl);
    return isProdRealtimeHost(url.hostname);
  } catch {
    return false;
  }
}

function resolveRealtimeURL() {
  const url = new URL(env.apiUrl);
  const pathname = url.pathname.replace(/\/$/, "");
  url.pathname = `${pathname}/realtime/ws`;
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url;
}

export async function buildRealtimeURL() {
  const adminToken = await getAdminToken();
  const customerToken = await getCustomerToken();
  const token = adminToken || customerToken;
  const slug = await getTenantSlug();
  const url = resolveRealtimeURL();

  if (token) {
    url.searchParams.set("token", token);
  }
  if (slug) {
    url.searchParams.set("slug", slug);
  }

  return url.toString();
}
