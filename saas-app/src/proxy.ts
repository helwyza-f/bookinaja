// src/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

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
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "bookinaja.local";
  const hostname = host.split(":")[0];

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
    "public",
    "api",
  ];

  if (
    tenantSlug &&
    tenantSlug !== "www" &&
    !reservedKeywords.includes(tenantSlug)
  ) {
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

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|robots.txt|android-chrome|apple-touch-icon).*)",
  ],
};
