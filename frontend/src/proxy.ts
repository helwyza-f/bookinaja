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
  const rootConfig = resolveRootDomainConfig(hostname);
  const rootDomain = rootConfig.host;
  const isRootDomainHost =
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "" ||
    hostname.startsWith("api.");
  const hasBookingTokenQuery =
    url.pathname.startsWith("/me/bookings/") && url.searchParams.has("token");
  const rootRedirect = resolveRootRedirect(path, {
    hasAdminToken: Boolean(adminToken),
    hasCustomerToken: Boolean(customerToken),
    hasBookingTokenQuery:
      url.pathname.startsWith("/user/me/bookings/") &&
      url.searchParams.has("token"),
    search: url.search,
  });

  if (isRootDomainHost && rootRedirect) {
    return NextResponse.redirect(buildRootRedirectUrl(req, rootRedirect, rootConfig));
  }

  // 2. BYPASS DOMAIN UTAMA & SISTEM
  if (isRootDomainHost) {
    return NextResponse.next();
  }

  // 3. LOGIKA TENANT SLUG
  const tenantSlug = hostname.endsWith(`.${rootDomain}`)
    ? hostname.replace(`.${rootDomain}`, "")
    : null;

  const reservedKeywords = [
    "admin",
    "me",
    "user",
    "tenants",
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
    if (path.startsWith("/user") || path.startsWith("/tenants")) {
      return NextResponse.redirect(
        buildRootUrl(req, path, url.search, rootConfig),
      );
    }

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

function resolveRootDomainConfig(hostname: string) {
  const configured = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "")
    .replace(/(^"|"$)/g, "")
    .trim();
  const configuredHost = stripPort(configured);
  const configuredPort = configured.includes(":")
    ? configured.split(":").slice(1).join(":")
    : "";

  if (configuredHost && hostname) {
    if (hostname === configuredHost || hostname.endsWith(`.${configuredHost}`)) {
      return { host: configuredHost, port: configuredPort };
    }
  }

  // Fallback: infer from host (e.g. gaming-demo.bookinaja.com -> bookinaja.com)
  const parts = (hostname || "").split(".").filter(Boolean);
  if (parts.length >= 2) {
    return { host: parts.slice(-2).join("."), port: configuredPort };
  }
  return { host: configuredHost || "bookinaja.local", port: configuredPort };
}

function buildRootUrl(
  req: NextRequest,
  pathname: string,
  search: string,
  rootConfig: { host: string; port: string },
) {
  const rootUrl = new URL(req.url);
  rootUrl.protocol = req.nextUrl.protocol || rootUrl.protocol;
  rootUrl.hostname = rootConfig.host;
  if (rootConfig.port) {
    rootUrl.port = rootConfig.port;
  }
  rootUrl.pathname = pathname;
  rootUrl.search = search;
  return rootUrl;
}

function buildRootRedirectUrl(
  req: NextRequest,
  target: string,
  rootConfig: { host: string; port: string },
) {
  const [pathname, rawSearch = ""] = target.split("?");
  const search = rawSearch ? `?${rawSearch}` : "";
  return buildRootUrl(req, pathname, search, rootConfig);
}

function stripPort(value: string) {
  return value.split(":")[0];
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

function resolveRootRedirect(
  path: string,
  auth: {
    hasAdminToken: boolean;
    hasCustomerToken: boolean;
    hasBookingTokenQuery?: boolean;
    search?: string;
  },
) {
  const isPlatformLogin = path === "/login";
  const isPlatformDashboard = path === "/dashboard" || path.startsWith("/dashboard/");
  const isCustomerAuthPage =
    path === "/user/login" ||
    path === "/user/login/phone" ||
    path === "/user/register";
  const isCustomerArea = path === "/user" || path === "/user/me" || path.startsWith("/user/me/");
  const isCustomerVerify = path === "/user/verify" || path.startsWith("/user/verify/");

  if (isPlatformLogin) {
    if (auth.hasAdminToken) {
      return "/dashboard/overview";
    }
    if (auth.hasCustomerToken) {
      return "/user/me";
    }
    return null;
  }

  if (isPlatformDashboard) {
    if (auth.hasAdminToken) {
      return null;
    }
    if (auth.hasCustomerToken) {
      return "/user/me";
    }
    return `/login${buildNextQuery(path, auth.search)}`;
  }

  if (isCustomerAuthPage) {
    if (auth.hasCustomerToken) {
      return "/user/me";
    }
    if (auth.hasAdminToken) {
      return "/dashboard/overview";
    }
    return null;
  }

  if (isCustomerVerify) {
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
      return "/dashboard/overview";
    }
    return `/user/login${buildNextQuery(path, auth.search)}`;
  }

  return null;
}

function buildNextQuery(pathname: string, search = "") {
  const nextValue = `${pathname}${search || ""}`;
  return `?next=${encodeURIComponent(nextValue)}`;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|robots.txt|android-chrome|apple-touch-icon).*)",
  ],
};
