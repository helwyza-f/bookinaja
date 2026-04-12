import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  // 1. HARD FILTER: Abaikan asset statis & internal (Regex diperketat)
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
  // Pastikan ini terambil dari ENV Prod: 'bookinaja.com'
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
  // Menangani gaming-demo.bookinaja.com -> gaming-demo
  const tenantSlug = hostname.endsWith(`.${rootDomain}`)
    ? hostname.replace(`.${rootDomain}`, "")
    : null;

  // List folder internal yang tidak boleh dianggap sebagai slug
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
    // REWRITE: Diam-diam arahkan ke folder /[tenant]/path
    const rewriteUrl = new URL(`/${tenantSlug}${path}${url.search}`, req.url);
    const response = NextResponse.rewrite(rewriteUrl);

    // --- COOKIE SYNC (VIP PATH) ---
    const currentSlugCookie = req.cookies.get("current_tenant_slug")?.value;

    if (currentSlugCookie !== tenantSlug) {
      const isProd = process.env.NODE_ENV === "production";
      // Ambil domain kuki dari ENV yang lo set di GitHub (.bookinaja.com)
      const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

      response.cookies.set("current_tenant_slug", tenantSlug, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 Minggu
        httpOnly: false, // Penting agar Axios Client bisa baca
        sameSite: "lax",
        secure: isProd,
        // Gunakan domain wildcard jika di Prod agar bisa diakses api.bookinaja.com
        ...(isProd && cookieDomain ? { domain: cookieDomain } : {}),
      });
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
