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

  // 2. BYPASS DOMAIN UTAMA
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

  if (tenantSlug && tenantSlug !== "www") {
    const rewriteUrl = new URL(`/${tenantSlug}${path}${url.search}`, req.url);
    const response = NextResponse.rewrite(rewriteUrl);

    // --- FIX COOKIE GAK MUNCUL ---
    const currentSlugCookie = req.cookies.get("current_tenant_slug")?.value;

    if (currentSlugCookie !== tenantSlug) {
      // Deteksi apakah ini produksi atau local dev
      const isProd = process.env.NODE_ENV === "production";

      response.cookies.set("current_tenant_slug", tenantSlug, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: false, // Biar bisa dibaca Axios
        sameSite: "lax",
        // PENTING: Jangan set TRUE di localhost karena bakal diblokir browser
        secure: isProd,
      });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|robots.txt).*)",
  ],
};
