import axios from "axios";
import { getCookie, deleteCookie } from "cookies-next";

// Helper untuk mengambil Tenant ID dari data yang tersimpan atau Subdomain
// Kamu bisa menyimpan Tenant ID di Cookie saat landing page pertama kali di-load
const getTenantIdFromSubdomain = () => {
  if (typeof window === "undefined") return null;

  // Cek apakah kita sudah menyimpan Tenant ID di cookie (hasil fetch dari public/landing)
  const savedTenantId = getCookie("current_tenant_id");
  if (savedTenantId) return savedTenantId;

  return null;
};

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://api.bookinaja.local:8080/api/v1";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor Request: Tempat menyisipkan Token & Tenant ID
api.interceptors.request.use((config) => {
  // 1. Ambil JWT Token
  const token = getCookie("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Ambil Tenant ID
  // Jika Tenant ID ada di cookie, masukkan ke header X-Tenant-ID
  // Ini sangat penting agar Middleware di Backend tidak Panic/Reject
  const tenantId = getCookie("current_tenant_id");
  if (tenantId) {
    config.headers["X-Tenant-ID"] = tenantId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Jika token expired, hapus cookie
      deleteCookie("auth_token");
    }
    return Promise.reject(error);
  },
);

export default api;
