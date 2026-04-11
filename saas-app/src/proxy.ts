import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  // 1. HARD FILTER: Abaikan semua asset statis, API internal, dan Next.js internals
  // Kita tambahkan pengecekan file extension yang lebih ketat agar tidak masuk ke logic Tenant
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
  // Ambil Root Domain dari ENV (Pastikan di IDCloudHost isinya 'bookinaja.com')
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "bookinaja.com";

  // Ambil hostname murni (tanpa port)
  const hostname = host.split(":")[0];

  // 2. BYPASS SUBDOMAIN SISTEM
  // Tambahkan 'www' dan 'api' ke pengecualian utama
  if (
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost" ||
    hostname.startsWith("api.")
  ) {
    return NextResponse.next();
  }

  // 3. LOGIKA SUBDOMAIN TENANT (Multi-tenancy)
  // Menangani gaming-demo.bookinaja.com -> tenantSlug = gaming-demo
  const tenantSlug = hostname.endsWith(`.${rootDomain}`)
    ? hostname.replace(`.${rootDomain}`, "")
    : null;

  if (tenantSlug) {
    // Hindari rewrite jika slug adalah 'www'
    if (tenantSlug === "www") return NextResponse.next();

    // REWRITE INTERNAL: Mengarahkan secara diam-diam ke folder /[tenant]/path
    const rewriteUrl = new URL(`/${tenantSlug}${path}${url.search}`, req.url);
    const response = NextResponse.rewrite(rewriteUrl);

    // --- SMART COOKIE SYNC ---
    const currentSlugCookie = req.cookies.get("current_tenant_slug")?.value;

    if (currentSlugCookie !== tenantSlug) {
      // Pasang cookie agar interceptor Axios di Frontend langsung dapet slug-nya
      response.cookies.set("current_tenant_slug", tenantSlug, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 Minggu
        httpOnly: false,
        sameSite: "lax",
        secure: true, // Wajib TRUE di production (HTTPS)
      });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Match semua path kecuali yang di-exclude
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|robots.txt).*)",
  ],
};
