import axios from "axios";
import { getCookie, deleteCookie } from "cookies-next";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getCookie("auth_token"); // Token untuk Admin atau Customer
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      deleteCookie("auth_token");
      // Optional: window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
