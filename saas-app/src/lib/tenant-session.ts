import { deleteCookie, setCookie, getCookie } from "cookies-next";

/**
 * Sinkronisasi cookie tenant agar backend mengenali context via Middleware
 */
export function syncTenantCookies(
  tenantSlug?: string | null,
  tenantId?: string | null,
) {
  const options = {
    maxAge: 60 * 60 * 24 * 7, // 7 Hari
    path: "/",
    // domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN, // Buka ini kalau sudah production/subdomain
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
  deleteCookie("auth_token");
  deleteCookie("customer_auth");
  deleteCookie("current_tenant_id");

  if (!options?.keepTenantSlug) {
    deleteCookie("current_tenant_slug");
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
