import { deleteCookie, setCookie, getCookie } from "cookies-next";

const COOKIE_DOMAIN = normalizeCookieDomain(
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN,
);
const COOKIE_BASE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};

/**
 * Sinkronisasi cookie tenant agar backend mengenali context via Middleware
 */
export function syncTenantCookies(
  tenantSlug?: string | null,
  tenantId?: string | null,
) {
  const options = {
    maxAge: 60 * 60 * 24 * 7, // 7 Hari
    ...COOKIE_BASE_OPTIONS,
  };

  if (tenantSlug) {
    setCookie("current_tenant_slug", tenantSlug, options);
  }

  if (tenantId) {
    setCookie("current_tenant_id", tenantId, options);
  }
}

/**
 * Membersihkan semua sesi saat logout atau auth error
 */
export function clearTenantSession(options?: { keepTenantSlug?: boolean }) {
  deleteCookie("auth_token", COOKIE_BASE_OPTIONS);
  deleteCookie("auth_token", { path: "/" });
  deleteCookie("customer_auth", COOKIE_BASE_OPTIONS);
  deleteCookie("customer_auth", { path: "/" });
  deleteCookie("current_tenant_id", COOKIE_BASE_OPTIONS);
  deleteCookie("current_tenant_id", { path: "/" });

  if (!options?.keepTenantSlug) {
    deleteCookie("current_tenant_slug", COOKIE_BASE_OPTIONS);
    deleteCookie("current_tenant_slug", { path: "/" });
  }
}

/**
 * Pengecekan error khusus multi-tenancy
 */
export function isTenantAuthError(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  // 401: Unauthenticated (Login Habis)
  // 403: Forbidden (Salah tenant atau role tak cocok)
  return status === 401 || status === 403;
}

/**
 * Helper untuk mengambil tenantId saat ini dari cookie
 */
export function getCurrentTenantId() {
  return getCookie("current_tenant_id") as string | undefined;
}

function normalizeCookieDomain(value?: string | null) {
  const cleaned = (value || "").replace(/(^"|"$)/g, "").trim();
  if (!cleaned) return "";

  const withoutPort = cleaned.split(":")[0];
  if (
    withoutPort === "localhost" ||
    withoutPort === "127.0.0.1"
  ) {
    return "";
  }

  return withoutPort.startsWith(".") ? withoutPort : `.${withoutPort}`;
}
