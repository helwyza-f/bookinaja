import axios from "axios";
import { getCookie, setCookie, deleteCookie } from "cookies-next";
import { getTenantSlugFromBrowser } from "@/lib/tenant";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://api.bookinaja.local:8080/api/v1";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let isResolvingTenant = false;

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

  if (tenantSlug) {
    if (config.method?.toLowerCase() === "get") {
      config.params = { ...config.params, slug: tenantSlug };
    }

    // Silent resolver: sync tenant ID ke cookie biar backend middleware tidak 403
    if (!tenantId && !isResolvingTenant) {
      isResolvingTenant = true;
      axios
        .get(`${baseURL}/public/tenant-id`, { params: { slug: tenantSlug } })
        .then((res) => {
          if (res.data?.id) {
            setCookie("current_tenant_id", res.data.id, {
              maxAge: 60 * 60 * 24 * 7,
              path: "/",
            });
          }
        })
        .finally(() => {
          setTimeout(() => {
            isResolvingTenant = false;
          }, 1000);
        });
    }
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
