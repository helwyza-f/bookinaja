const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "bookinaja.local")
  .replace(/(^"|"$)/g, "")
  .trim();

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

  const rootDomain = resolveRootDomainForHost(host, ROOT_DOMAIN);

  if (host === rootDomain || host === `www.${rootDomain}` || host === "localhost") {
    return null;
  }

  if (!host.endsWith(`.${rootDomain}`)) {
    return null;
  }

  const slug = normalizeSlug(host.slice(0, -(`.${rootDomain}`.length)));
  if (!slug || RESERVED_SLUGS.has(slug)) {
    return null;
  }

  return slug;
}

export function getTenantSlugFromBrowser() {
  if (typeof window === "undefined") return null;
  return getTenantSlugFromHostname(window.location.hostname);
}

function resolveRootDomainForHost(host: string, configuredRootDomain: string) {
  const configured = configuredRootDomain?.trim();
  if (configured) {
    if (host === configured || host.endsWith(`.${configured}`)) {
      return configured;
    }
  }

  const parts = host.split(".").filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(-2).join(".");
  }

  return configured || "bookinaja.local";
}
