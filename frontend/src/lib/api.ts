import axios from "axios";
import { getCookie, deleteCookie } from "cookies-next";
import {
  getCentralAdminAuthUrl,
  getCentralCustomerAuthUrl,
  getCurrentPathWithSearch,
  getTenantSlugFromBrowser,
} from "@/lib/tenant";
import {
  clearAdminSession,
  clearCustomerSession,
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

function isPublicAccountAuthRequest(url?: string) {
  const requestPath = String(url || "");
  return (
    requestPath === "/auth/signup" ||
    requestPath === "/auth/login" ||
    requestPath === "/auth/google" ||
    requestPath === "/auth/email/verify" ||
    requestPath === "/auth/email/verify/request"
  );
}

function resolveRequestToken(url?: string) {
  if (isPublicAccountAuthRequest(url)) {
    return "";
  }

  const accountToken = getCookie("account_token");
  const adminToken = getCookie("auth_token");
  const customerToken = getCookie("customer_auth");
  const requestPath = String(url || "");

  if (requestPath.startsWith("/app/") || requestPath === "/app/workspaces" || requestPath.startsWith("/auth/account")) {
    return accountToken || adminToken;
  }

  if (typeof window === "undefined") {
    return accountToken || adminToken || customerToken;
  }

  const path = window.location.pathname;
  if (
    path === "/login" ||
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path.startsWith("/dashboard")
  ) {
    return accountToken || adminToken;
  }

  if (
    path === "/user" ||
    path.startsWith("/user/") ||
    path === "/me" ||
    path.startsWith("/me/")
  ) {
    return customerToken;
  }

  return accountToken || adminToken || customerToken;
}

api.interceptors.request.use((config) => {
  const token = resolveRequestToken(config.url);
  const browserTenantSlug = getTenantSlugFromBrowser();
  const tenantSlug = browserTenantSlug
    ? browserTenantSlug
    : (getCookie("current_tenant_slug") as string);
  const isPublicAuth = isPublicAccountAuthRequest(config.url);

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!isPublicAuth && browserTenantSlug && tenantSlug) {
    config.headers["X-Tenant-Slug"] = tenantSlug;
  }

  if (!isPublicAuth && browserTenantSlug && tenantSlug) {
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
      const hasAdminToken = Boolean(getCookie("auth_token") || getCookie("account_token"));
      const hasCustomerToken = Boolean(getCookie("customer_auth"));
      const tenantSlug = getTenantSlugFromBrowser();
      const isTenantSurface = Boolean(tenantSlug);
      const nextPath = getCurrentPathWithSearch();
      const path = window.location.pathname;
      const isAdminSurface =
        path === "/login" ||
        path === "/admin" ||
        path.startsWith("/admin/") ||
        path.startsWith("/dashboard");
      const isCustomerSurface =
        path === "/user" ||
        path.startsWith("/user/") ||
        path === "/me" ||
        path.startsWith("/me/");

      const target = hasAdminToken
        ? isAdminSurface && isTenantSurface
          ? getCentralAdminAuthUrl({
              tenantSlug,
              next: nextPath,
              reason: "tenant-mismatch",
            })
          : isAdminSurface
            ? `/login?reason=tenant-mismatch&next=${nextPath}`
            : null
        : hasCustomerToken
          ? isCustomerSurface && isTenantSurface
            ? getCentralCustomerAuthUrl("login", {
                tenantSlug,
                next: nextPath,
                reason: "tenant-mismatch",
              })
            : isCustomerSurface
              ? `/user/login?reason=tenant-mismatch&next=${nextPath}`
              : null
          : null;

      if (isAdminSurface) {
        clearAdminSession({ keepTenantSlug: isTenantSurface });
      } else if (isCustomerSurface) {
        clearCustomerSession({ keepTenantSlug: isTenantSurface });
      } else {
        clearTenantSession({ keepTenantSlug: isTenantSurface });
      }

      if (target && window.location.href !== target) {
        window.location.replace(target);
      }
    }

    if (err.response?.status === 401) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (
          path === "/login" ||
          path === "/admin" ||
          path.startsWith("/admin/") ||
          path.startsWith("/dashboard")
        ) {
          deleteCookie("auth_token");
        } else if (
          path === "/user" ||
          path.startsWith("/user/") ||
          path === "/me" ||
          path.startsWith("/me/")
        ) {
          deleteCookie("customer_auth");
        } else {
          deleteCookie("auth_token");
          deleteCookie("customer_auth");
        }
      }
    }
    return Promise.reject(err);
  },
);

export default api;
