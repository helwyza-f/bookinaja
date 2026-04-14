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
  // --- FIX 1: Sinkronisasi Nama Kuki ---
  const token = getCookie("auth_token") || getCookie("customer_auth");
  const tenantId = getCookie("current_tenant_id");
  const tenantSlug = getCookie("current_tenant_slug");

  if (token) config.headers.Authorization = `Bearer ${token}`;

  // 1. JALUR VIP: Jika ID sudah valid, gunakan Header (Menghindari 403 di Middleware Go)
  if (tenantId && tenantId !== "undefined" && tenantId !== "") {
    config.headers["X-Tenant-ID"] = tenantId as string;
  }

  // 2. JALUR FALLBACK: Jika ID belum ada, pakai Slug di params
  if (tenantSlug) {
    if (config.method?.toLowerCase() === "get") {
      config.params = { ...config.params, slug: tenantSlug };
    }

    // 3. SILENT RESOLVER: Sync ID tenant ke kuki jika belum ada
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
      // Jangan redirect paksa di sini biar gak looping, biarkan page yang handle
    }
    return Promise.reject(err);
  },
);

export default api;
