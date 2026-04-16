import { deleteCookie, setCookie } from "cookies-next";

export function syncTenantCookies(
  tenantSlug?: string | null,
  tenantId?: string | null,
) {
  if (tenantSlug) {
    setCookie("current_tenant_slug", tenantSlug, {
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }

  if (tenantId) {
    setCookie("current_tenant_id", tenantId, {
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }
}

export function clearTenantSession(options?: { keepTenantSlug?: boolean }) {
  deleteCookie("auth_token");
  deleteCookie("customer_auth");
  deleteCookie("current_tenant_id");

  if (!options?.keepTenantSlug) {
    deleteCookie("current_tenant_slug");
  }
}

export function isTenantAuthError(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}
