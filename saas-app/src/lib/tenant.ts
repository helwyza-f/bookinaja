const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || "bookinaja.local";

const RESERVED_SLUGS = new Set([
  "",
  "www",
  "api",
  "admin",
  "login",
  "register",
  "public",
  "me",
  "localhost",
]);

function normalizeSlug(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

export function getTenantSlugFromHostname(hostname?: string | null) {
  const host = normalizeSlug(hostname);
  if (!host) return null;

  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}` || host === "localhost") {
    return null;
  }

  if (!host.endsWith(`.${ROOT_DOMAIN}`)) {
    return null;
  }

  const slug = normalizeSlug(host.slice(0, -(`.${ROOT_DOMAIN}`.length)));
  if (!slug || RESERVED_SLUGS.has(slug)) {
    return null;
  }

  return slug;
}

export function getTenantSlugFromBrowser() {
  if (typeof window === "undefined") return null;
  return getTenantSlugFromHostname(window.location.hostname);
}

