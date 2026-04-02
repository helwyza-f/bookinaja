import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  // 1. FILTER ASSET STATIS & INTERNAL NEXT.JS (WAJIB)
  // Agar file .js, .css, .png, dan folder _next tidak kena rewrite ke folder tenant
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.includes(".")
  ) {
    return NextResponse.next();
  }

  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "bookinaja.com";

  // 2. BYPASS SUBDOMAIN API
  if (hostname.startsWith("api.")) {
    return NextResponse.next();
  }

  // 3. LOGIKA ROOT DOMAIN (Marketing Page)
  if (
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost"
  ) {
    return NextResponse.next();
  }

  // 4. LOGIKA SUBDOMAIN (Tenant Page)
  const tenantSlug = hostname.replace(`.${rootDomain}`, "").replace("www.", "");

  if (tenantSlug && tenantSlug !== hostname) {
    // Debugging (Bisa kamu hapus kalau sudah oke)
    console.log(`[Proxy] Tenant: ${tenantSlug} | Path: ${path}`);

    // Rewrite internal ke folder tenant: /ps/dashboard misalnya
    return NextResponse.rewrite(
      new URL(`/${tenantSlug}${path}${url.search}`, req.url),
    );
  }

  return NextResponse.next();
}

// MATCHER agar Next.js tahu file ini harus menangani route apa saja
export const config = {
  matcher: [
    /*
     * Match semua request path KECUALI:
     * - api (route api nextjs)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, dsb.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
