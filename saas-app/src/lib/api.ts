import axios from "axios";
import { getCookie, deleteCookie } from "cookies-next";
import { getTenantSlugFromBrowser } from "@/lib/tenant";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://api.bookinaja.local:8080/api/v1";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getCookie("auth_token") || getCookie("customer_auth");
  const tenantId = getCookie("current_tenant_id");
  const tenantSlug =
    getTenantSlugFromBrowser() || (getCookie("current_tenant_slug") as string);

  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (tenantSlug) {
    config.headers["X-Tenant-Slug"] = tenantSlug;
  }

  if (tenantId && tenantId !== "undefined" && tenantId !== "") {
    config.headers["X-Tenant-ID"] = tenantId as string;
  }

  if (tenantSlug && config.method?.toLowerCase() === "get") {
    config.params = { ...config.params, slug: tenantSlug };
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // --- FIX 2: Hapus kuki yang bener pas 401 ---
    if (err.response?.status === 401) {
      deleteCookie("auth_token");
      deleteCookie("customer_auth");
      deleteCookie("current_tenant_id");
    }
    return Promise.reject(err);
  },
);

export default api;
