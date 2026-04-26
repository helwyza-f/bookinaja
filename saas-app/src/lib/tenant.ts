const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "bookinaja.local")
  .replace(/(^"|"$)/g, "")
  .trim();

const RESERVED_SLUGS = new Set([
  "",
  "www",
  "api",
  "admin",
  "user",
  "login",
  "register",
  "tenants",
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
    const configuredHost = stripPort(configured);
    if (host === configuredHost || host.endsWith(`.${configuredHost}`)) {
      return configuredHost;
    }
  }

  const parts = host.split(".").filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(-2).join(".");
  }

  return stripPort(configured) || "bookinaja.local";
}

export function getTenantUrl(
  slug: string,
  path = "/",
  searchParams?: Record<string, string | number | boolean | null | undefined>,
) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return path || "/";

  const root = resolveConfiguredRoot();
  const [pathnamePart, searchPart = ""] = path.split("?");
  const safePath = pathnamePart.startsWith("/")
    ? pathnamePart
    : `/${pathnamePart}`;
  const mergedSearch = new URLSearchParams(searchPart);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null) continue;
      mergedSearch.set(key, String(value));
    }
  }

  const search = mergedSearch.toString();

  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.hostname = `${normalizedSlug}.${root.host}`;
    if (root.port) {
      url.port = root.port;
    }
    url.pathname = safePath;
    url.search = search ? `?${search}` : "";
    url.hash = "";
    return url.toString();
  }

  const protocol =
    process.env.NODE_ENV === "production" ? "https:" : "http:";
  const port = root.port ? `:${root.port}` : "";
  return `${protocol}//${normalizedSlug}.${root.host}${port}${safePath}${search ? `?${search}` : ""}`;
}

function resolveConfiguredRoot() {
  const cleaned = ROOT_DOMAIN || "bookinaja.local";
  const [host, portFromDomain] = cleaned.split(":");
  const port = portFromDomain || "";
  return {
    host: host || "bookinaja.local",
    port,
  };
}

function stripPort(value: string) {
  return value.split(":")[0];
}
