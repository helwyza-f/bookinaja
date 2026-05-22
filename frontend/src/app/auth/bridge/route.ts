import { NextRequest, NextResponse } from "next/server";

function stripPort(value: string) {
  return value.split(":")[0];
}

function normalizeCookieDomain(value?: string | null) {
  const cleaned = (value || "").replace(/(^"|"$)/g, "").trim();
  if (!cleaned) return "";

  const withoutPort = stripPort(cleaned);
  if (!withoutPort || withoutPort === "localhost" || withoutPort === "127.0.0.1") {
    return "";
  }

  return withoutPort.startsWith(".") ? withoutPort : `.${withoutPort}`;
}

function resolveAllowedRootHost() {
  const configured =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_SITE_URL || "";
  const cleaned = configured.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return stripPort(cleaned);
}

function resolveNextUrl(request: NextRequest, rawNext: string) {
  const fallback = new URL("/app", request.nextUrl.origin);
  const next = rawNext.trim();
  if (!next) return fallback;

  if (next.startsWith("/")) {
    return new URL(next, request.nextUrl.origin);
  }

  try {
    const parsed = new URL(next);
    const allowedRootHost = resolveAllowedRootHost();
    if (!allowedRootHost) return fallback;
    if (
      parsed.hostname === allowedRootHost ||
      parsed.hostname.endsWith(`.${allowedRootHost}`)
    ) {
      return parsed;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export async function GET(request: NextRequest) {
  const token = (request.nextUrl.searchParams.get("token") || "").trim();
  const tenantSlug = (request.nextUrl.searchParams.get("tenant") || "").trim().toLowerCase();
  const destination = resolveNextUrl(
    request,
    request.nextUrl.searchParams.get("next") || "/app",
  );

  const response = NextResponse.redirect(destination);

  if (process.env.NODE_ENV !== "production" && token) {
    const cookieDomain = normalizeCookieDomain(
      process.env.NEXT_PUBLIC_COOKIE_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    );
    const cookieOptions = {
      path: "/",
      sameSite: "lax" as const,
      secure: false,
      maxAge: 60 * 60 * 24 * 7,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    response.cookies.set("auth_token", token, cookieOptions);
    if (tenantSlug) {
      response.cookies.set("current_tenant_slug", tenantSlug, cookieOptions);
    }
  }

  return response;
}
