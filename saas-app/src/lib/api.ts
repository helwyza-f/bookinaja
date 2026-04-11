import axios from "axios";
import { getCookie, setCookie, deleteCookie } from "cookies-next";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://api.bookinaja.local:8080/api/v1";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Variable pengunci agar tidak terjadi multiple request tenant-id
let isResolvingTenant = false;

api.interceptors.request.use((config) => {
  const token = getCookie("auth_token") || getCookie("customer_auth");
  const tenantId = getCookie("current_tenant_id");
  const tenantSlug = getCookie("current_tenant_slug");

  if (token) config.headers.Authorization = `Bearer ${token}`;

  // 1. JALUR VIP: Sudah punya Tenant ID
  if (tenantId) {
    config.headers["X-Tenant-ID"] = tenantId as string;
  }

  // 2. JALUR FALLBACK: Belum punya ID, pakai Slug
  else if (tenantSlug) {
    // Tempelkan slug ke params (Cukup sekali di sini, jangan tulis manual di URL lagi)
    config.params = { ...config.params, slug: tenantSlug };

    // 3. SILENT RESOLVER (Background)
    // Cek apakah sudah ada request tenant-id yang lagi jalan?
    if (!isResolvingTenant) {
      isResolvingTenant = true; // Kunci pintu!

      // Gunakan axios instance baru biar gak kena interceptor ini (mencegah loop)
      axios
        .get(`${baseURL}/public/tenant-id`, {
          params: { slug: tenantSlug },
        })
        .then((res) => {
          if (res.data?.id) {
            setCookie("current_tenant_id", res.data.id, {
              maxAge: 60 * 60 * 24,
              path: "/",
            });
          }
        })
        .catch(() => {
          console.warn("Silent lookup failed, continuing with slug fallback.");
        })
        .finally(() => {
          // Jangan langsung buka kunci, kasih jeda biar cookie sempat ter-set
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
