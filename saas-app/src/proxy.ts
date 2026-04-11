import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  // 1. FILTER ASSET STATIS & INTERNAL NEXT.JS
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.includes(".")
  ) {
    return NextResponse.next();
  }

  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "bookinaja.local"; // Sesuaikan env

  // 2. BYPASS SUBDOMAIN API
  if (hostname.startsWith("api.")) {
    return NextResponse.next();
  }

  // 3. LOGIKA ROOT DOMAIN (Marketing Page / Landing Utama)
  if (
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost"
  ) {
    return NextResponse.next();
  }

  // 4. LOGIKA SUBDOMAIN (Tenant Page)
  // Menangani subdomain seperti gaming-demo.bookinaja.local
  const tenantSlug = hostname.replace(`.${rootDomain}`, "").replace("www.", "");

  if (tenantSlug && tenantSlug !== hostname) {
    // Rewrite internal ke folder tenant: /[tenantSlug]/path
    const rewriteUrl = new URL(`/${tenantSlug}${path}${url.search}`, req.url);
    const response = NextResponse.rewrite(rewriteUrl);

    // --- SMART TENANT IDENTIFICATION ---
    // Cek apakah cookie slug sudah ada dan sama
    const currentSlugCookie = req.cookies.get("current_tenant_slug")?.value;

    if (currentSlugCookie !== tenantSlug) {
      // Pasang cookie slug agar frontend bisa langsung pakai tanpa fetch ulang
      response.cookies.set("current_tenant_slug", tenantSlug, {
        path: "/",
        maxAge: 60 * 60 * 24, // 24 Jam
        httpOnly: false, // Biar bisa dibaca client-side (Axios)
        sameSite: "lax",
      });

      // Catatan: current_tenant_id akan di-set oleh API saat fetch pertama
      // atau bisa di-fetch di sini via Edge Function jika benar-benar butuh ID
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
