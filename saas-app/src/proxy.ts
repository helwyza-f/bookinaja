// src/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  const adminToken = req.cookies.get("auth_token")?.value;
  const customerToken = req.cookies.get("customer_auth")?.value;

  // 1. HARD FILTER: Abaikan asset statis & internal
  const isStaticFile = /\.(.*)$/.test(path);
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path === "/favicon.ico" ||
    path === "/site.webmanifest" ||
    isStaticFile
  ) {
    return NextResponse.next();
  }

  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const rootDomain = resolveRootDomain(hostname);
  const hasBookingTokenQuery =
    url.pathname.startsWith("/me/bookings/") && url.searchParams.has("token");

  // 2. BYPASS DOMAIN UTAMA & SISTEM
  if (
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost" ||
    hostname.startsWith("api.")
  ) {
    return NextResponse.next();
  }

  // 3. LOGIKA TENANT SLUG
  const tenantSlug = hostname.endsWith(`.${rootDomain}`)
    ? hostname.replace(`.${rootDomain}`, "")
    : null;

  const reservedKeywords = [
    "admin",
    "me",
    "login",
    "register",
    "dashboard",
    "public",
    "api",
  ];

  if (
    tenantSlug &&
    tenantSlug !== "www" &&
    !reservedKeywords.includes(tenantSlug)
  ) {
    const redirectTarget = resolveTenantRedirect(path, {
      hasAdminToken: Boolean(adminToken),
      hasCustomerToken: Boolean(customerToken),
      hasBookingTokenQuery,
    });

    if (redirectTarget) {
      return NextResponse.redirect(new URL(redirectTarget, req.url));
    }

    const rewriteUrl = new URL(`/${tenantSlug}${path}${url.search}`, req.url);
    const response = NextResponse.rewrite(rewriteUrl);

    // --- FIX: IDENTITAS TERTUKAR (Cookie Sync) ---
    const currentSlugCookie = req.cookies.get("current_tenant_slug")?.value;

    if (currentSlugCookie !== tenantSlug) {
      const isProd = process.env.NODE_ENV === "production";
      const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

      // Update Slug Baru
      response.cookies.set("current_tenant_slug", tenantSlug, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: false,
        sameSite: "lax",
        secure: isProd,
        ...(isProd && cookieDomain ? { domain: cookieDomain } : {}),
      });

      // PENTING: Hapus ID tenant lama agar tidak terjadi salah alamat data!
      response.cookies.delete("current_tenant_id");
    }

    return response;
  }

  return NextResponse.next();
}

function resolveRootDomain(hostname: string) {
  const configured = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").replace(/(^"|"$)/g, "").trim();
  if (configured && hostname) {
    if (hostname === configured || hostname.endsWith(`.${configured}`)) {
      return configured;
    }
  }

  // Fallback: infer from host (e.g. gaming-demo.bookinaja.com -> bookinaja.com)
  const parts = (hostname || "").split(".").filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(-2).join(".");
  }
  return configured || "bookinaja.local";
}

function resolveTenantRedirect(
  path: string,
  auth: {
    hasAdminToken: boolean;
    hasCustomerToken: boolean;
    hasBookingTokenQuery?: boolean;
  },
) {
  const isAdminLogin = path === "/admin/login";
  const isAdminArea = path === "/admin" || path.startsWith("/admin/");
  const isCustomerLogin = path === "/login";
  const isCustomerArea = path === "/me" || path.startsWith("/me/");

  if (isAdminLogin) {
    if (path === "/admin/login") {
      return auth.hasAdminToken ? "/admin/dashboard" : null;
    }
    if (auth.hasAdminToken) {
      return "/admin/dashboard";
    }
    if (auth.hasCustomerToken) {
      return "/me";
    }
    return null;
  }

  if (isAdminArea) {
    if (path.startsWith("/admin/dashboard")) {
      if (auth.hasAdminToken) {
        return null;
      }
      if (auth.hasCustomerToken) {
        return "/me";
      }
      return "/admin/login";
    }
    if (auth.hasAdminToken) {
      return null;
    }
    if (auth.hasCustomerToken) {
      return "/me";
    }
    return "/admin/login";
  }

  if (isCustomerLogin) {
    if (auth.hasCustomerToken) {
      return "/me";
    }
    if (auth.hasAdminToken) {
      return "/admin/dashboard";
    }
    return null;
  }

  if (isCustomerArea) {
    if (auth.hasBookingTokenQuery) {
      return null;
    }
    if (auth.hasCustomerToken) {
      return null;
    }
    if (auth.hasAdminToken) {
      return "/admin/dashboard";
    }
    return "/login";
  }

  return null;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|robots.txt|android-chrome|apple-touch-icon).*)",
  ],
};
