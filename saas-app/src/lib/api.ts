import axios from "axios";
import { getCookie, deleteCookie } from "cookies-next";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://api.bookinaja.local:8080/api/v1";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  // Izinkan pengiriman cookie lintas domain jika diperlukan (CORS)
  withCredentials: true,
});

// --- INTERCEPTOR REQUEST: Injeksi Header secara Dinamis ---
api.interceptors.request.use((config) => {
  // 1. Ambil JWT Token
  // PENTING: Gunakan nama 'customer_auth' sesuai yang kita set saat booking sukses
  const token = getCookie("customer_auth") || getCookie("auth_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Ambil Tenant ID
  // Ini sangat krusial agar middleware backend 'TenantIdentifier' tidak 404/401
  const tenantId = getCookie("current_tenant_id");
  if (tenantId) {
    config.headers["X-Tenant-ID"] = tenantId;
  }

  return config;
});

// --- INTERCEPTOR RESPONSE: Centralized Error Handling ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    // Jika Error 401 (Unauthorized) dan bukan dari request login itu sendiri
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Hapus semua kemungkinan cookie auth yang basi
      deleteCookie("customer_auth");
      deleteCookie("auth_token");

      // Jika kita di client-side, arahkan ke halaman login tenant terkait
      if (typeof window !== "undefined") {
        // window.location.href = "/login";
        console.warn("Sesi berakhir, silakan login kembali.");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
