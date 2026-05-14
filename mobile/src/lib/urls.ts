import { env } from "@/lib/env";

function makeUrl(path: string, params?: Record<string, string | null | undefined>) {
  const base = env.webUrl.endsWith("/") ? env.webUrl : `${env.webUrl}/`;
  const url = new URL(path, base);

  for (const [key, value] of Object.entries(params || {})) {
    if (!value) continue;
    url.searchParams.set(key, value);
  }

  return url.toString();
}

export function getCentralTenantRegisterUrl(options?: {
  plan?: string | null;
  interval?: string | null;
  ref?: string | null;
  category?: string | null;
}) {
  return makeUrl("/register", {
    plan: options?.plan || null,
    interval: options?.interval || null,
    ref: options?.ref || null,
    category: options?.category || null,
  });
}

export function getCentralAdminAuthUrl(options?: {
  tenantSlug?: string | null;
  next?: string | null;
}) {
  return makeUrl("/admin/login", {
    tenant: options?.tenantSlug || null,
    intent: options?.tenantSlug ? "admin" : null,
    next: options?.next || "/admin/dashboard",
  });
}

export function getCentralCustomerAuthUrl(
  mode: "login" | "register",
  options?: {
    tenantSlug?: string | null;
    next?: string | null;
  },
) {
  return makeUrl(mode === "register" ? "/user/register" : "/user/login", {
    tenant: options?.tenantSlug || null,
    intent: options?.tenantSlug ? "customer" : null,
    next: options?.next || "/user/me",
  });
}

export function getTenantWebUrl(slug: string, path = "/") {
  const host = env.webUrl.replace(/^https?:\/\//, "");
  const protocol = env.webUrl.startsWith("https://") ? "https" : "http";
  return `${protocol}://${slug}.${host}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getPortalWebUrl(path = "/") {
  return makeUrl(path);
}
