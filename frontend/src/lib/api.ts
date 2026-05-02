import axios from "axios";
import { getCookie, deleteCookie } from "cookies-next";
import { getTenantSlugFromBrowser } from "@/lib/tenant";
import {
  clearTenantSession,
  isCrossTenantSessionError,
} from "@/lib/tenant-session";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://api.bookinaja.local:8080/api/v1";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getCookie("auth_token") || getCookie("customer_auth");
  const browserTenantSlug = getTenantSlugFromBrowser();
  const tenantSlug = browserTenantSlug
    ? browserTenantSlug
    : (getCookie("current_tenant_slug") as string);

  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (browserTenantSlug && tenantSlug) {
    config.headers["X-Tenant-Slug"] = tenantSlug;
  }

  if (browserTenantSlug && tenantSlug) {
    if (config.method?.toLowerCase() === "get") {
      config.params = { ...config.params, slug: tenantSlug };
    }
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (isCrossTenantSessionError(err) && typeof window !== "undefined") {
      const hasAdminToken = Boolean(getCookie("auth_token"));
      const hasCustomerToken = Boolean(getCookie("customer_auth"));
      const isTenantSurface = Boolean(getTenantSlugFromBrowser());

      clearTenantSession({ keepTenantSlug: isTenantSurface });

      const nextPath = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`,
      );
      const target = hasAdminToken
        ? isTenantSurface
          ? `/admin/login?reason=tenant-mismatch&next=${nextPath}`
          : `/login?reason=tenant-mismatch&next=${nextPath}`
        : hasCustomerToken
          ? isTenantSurface
            ? `/login?reason=tenant-mismatch&next=${nextPath}`
            : `/user/login?reason=tenant-mismatch&next=${nextPath}`
          : null;

      if (target && window.location.pathname !== target) {
        window.location.replace(target);
      }
    }

    // --- FIX 2: Hapus kuki yang bener pas 401 ---
    if (err.response?.status === 401) {
      deleteCookie("auth_token");
      deleteCookie("customer_auth");
    }
    return Promise.reject(err);
  },
);

export default api;
