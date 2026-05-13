import { deleteCookie, setCookie } from "cookies-next";

const COOKIE_DOMAIN = normalizeCookieDomain(
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN,
);
const COOKIE_BASE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};

/**
 * Sinkronisasi cookie tenant agar backend mengenali context via Middleware
 */
export function syncTenantCookies(tenantSlug?: string | null) {
  const options = {
    maxAge: 60 * 60 * 24 * 7, // 7 Hari
    ...COOKIE_BASE_OPTIONS,
  };

  if (tenantSlug) {
    setCookie("current_tenant_slug", tenantSlug, options);
  }
}

export function setAdminAuthCookie(token: string) {
  setCookie("auth_token", token, {
    maxAge: 60 * 60 * 24 * 7,
    ...COOKIE_BASE_OPTIONS,
  });
}

export function setCustomerAuthCookie(token: string) {
  setCookie("customer_auth", token, {
    maxAge: 60 * 60 * 24 * 7,
    ...COOKIE_BASE_OPTIONS,
  });
}

export function clearAdminSession(options?: { keepTenantSlug?: boolean }) {
  deleteCookie("auth_token", COOKIE_BASE_OPTIONS);
  deleteCookie("auth_token", { path: "/" });

  if (!options?.keepTenantSlug) {
    deleteCookie("current_tenant_slug", COOKIE_BASE_OPTIONS);
    deleteCookie("current_tenant_slug", { path: "/" });
  }
}

export function clearCustomerSession(options?: { keepTenantSlug?: boolean }) {
  deleteCookie("customer_auth", COOKIE_BASE_OPTIONS);
  deleteCookie("customer_auth", { path: "/" });

  if (!options?.keepTenantSlug) {
    deleteCookie("current_tenant_slug", COOKIE_BASE_OPTIONS);
    deleteCookie("current_tenant_slug", { path: "/" });
  }
}

/**
 * Membersihkan semua sesi saat logout atau auth error
 */
export function clearTenantSession(options?: { keepTenantSlug?: boolean }) {
  clearAdminSession({ keepTenantSlug: true });
  clearCustomerSession({ keepTenantSlug: true });

  if (!options?.keepTenantSlug) {
    deleteCookie("current_tenant_slug", COOKIE_BASE_OPTIONS);
    deleteCookie("current_tenant_slug", { path: "/" });
  }
}

/**
 * Pengecekan error khusus multi-tenancy
 */
export function isTenantAuthError(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  // 401: Unauthenticated (Login Habis)
  // 403: Forbidden (Salah tenant atau role tak cocok)
  return status === 401 || status === 403;
}

export function isCrossTenantSessionError(error: unknown) {
  const response = (error as {
    response?: { status?: number; data?: { error?: string; hint?: string } };
  })?.response;
  const message = `${response?.data?.error || ""} ${response?.data?.hint || ""}`
    .trim()
    .toLowerCase();

  return (
    response?.status === 403 &&
    (message.includes("token ini terdaftar untuk bisnis lain") ||
      message.includes("login di subdomain yang benar"))
  );
}

export function getTenantMismatchMessage(kind: "admin" | "customer" | "platform") {
  switch (kind) {
    case "admin":
      return {
        title: "Sesi bisnis sebelumnya sudah dilepas",
        description:
          "Kamu sedang membuka panel bisnis yang berbeda. Masuk lagi di bisnis ini supaya data yang tampil tetap sesuai.",
      };
    case "customer":
      return {
        title: "Sesi customer sebelumnya tidak cocok dengan bisnis ini",
        description:
          "Kamu baru pindah ke bisnis lain. Masuk lagi supaya booking dan data akun tersinkron dengan bisnis yang sedang dibuka.",
      };
    default:
      return {
        title: "Sesi sebelumnya sudah tidak cocok",
        description:
          "Kamu baru berpindah workspace. Masuk lagi supaya akses dibuka di area Bookinaja yang benar.",
      };
  }
}

function normalizeCookieDomain(value?: string | null) {
  const cleaned = (value || "").replace(/(^"|"$)/g, "").trim();
  if (!cleaned) return "";

  const withoutPort = cleaned.split(":")[0];
  if (
    withoutPort === "localhost" ||
    withoutPort === "127.0.0.1"
  ) {
    return "";
  }

  return withoutPort.startsWith(".") ? withoutPort : `.${withoutPort}`;
}
