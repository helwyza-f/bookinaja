// src/lib/api.ts
import axios from "axios";
import { getCookie, setCookie, deleteCookie } from "cookies-next";

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
  const tenantSlug = getCookie("current_tenant_slug");

  if (token) config.headers.Authorization = `Bearer ${token}`;

  // 1. JALUR VIP: Jika ID sudah valid, gunakan Header
  if (tenantId && tenantId !== "undefined" && tenantId !== "") {
    config.headers["X-Tenant-ID"] = tenantId as string;
  }

  // 2. JALUR FALLBACK: Jika ID belum ada, pakai Slug
  if (tenantSlug) {
    // Tempelkan slug ke params hanya untuk request GET (Biar log bersih)
    if (config.method?.toLowerCase() === "get") {
      config.params = { ...config.params, slug: tenantSlug };
    }

    // 3. SILENT RESOLVER: Ambil ID di background buat request berikutnya
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
        .catch(() => {
          console.warn("[API] Silent lookup failed for:", tenantSlug);
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
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      deleteCookie("auth_token");
      deleteCookie("customer_auth");
    }
    return Promise.reject(err);
  },
);

export default api;
