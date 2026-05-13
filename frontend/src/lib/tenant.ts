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

  if (
    host === rootDomain ||
    host === `www.${rootDomain}` ||
    host === "localhost"
  ) {
    return null;
  }

  if (!host.endsWith(`.${rootDomain}`)) {
    return null;
  }

  const slug = normalizeSlug(host.slice(0, -`.${rootDomain}`.length));
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

  const protocol = process.env.NODE_ENV === "production" ? "https:" : "http:";
  const port = root.port ? `:${root.port}` : "";
  return `${protocol}//${normalizedSlug}.${root.host}${port}${safePath}${search ? `?${search}` : ""}`;
}

export function getRootPortalUrl(
  path = "/",
  searchParams?: Record<string, string | number | boolean | null | undefined>,
) {
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
    url.hostname = root.host;
    if (root.port) {
      url.port = root.port;
    } else {
      url.port = "";
    }
    url.pathname = safePath;
    url.search = search ? `?${search}` : "";
    url.hash = "";
    return url.toString();
  }

  const protocol = process.env.NODE_ENV === "production" ? "https:" : "http:";
  const port = root.port ? `:${root.port}` : "";
  return `${protocol}//${root.host}${port}${safePath}${search ? `?${search}` : ""}`;
}

export function getCurrentPathWithSearch() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function getCentralCustomerAuthUrl(
  mode: "login" | "register",
  options?: {
    tenantSlug?: string | null;
    next?: string | null;
    reason?: string | null;
  },
) {
  const path = mode === "register" ? "/user/register" : "/user/login";
  const tenantSlug = normalizeSlug(options?.tenantSlug);
  const next = normalizeNextPath(options?.next);
  const reason = (options?.reason || "").trim();

  return getRootPortalUrl(path, {
    ...(tenantSlug ? { tenant: tenantSlug, intent: "customer" } : {}),
    ...(next ? { next } : {}),
    ...(reason ? { reason } : {}),
  });
}

export function getCentralAdminAuthUrl(options?: {
  tenantSlug?: string | null;
  next?: string | null;
  reason?: string | null;
  plan?: string | null;
  interval?: string | null;
  welcome?: string | null;
}) {
  const tenantSlug = normalizeSlug(options?.tenantSlug);
  const next = normalizeNextPath(options?.next);
  const reason = (options?.reason || "").trim();
  const plan = (options?.plan || "").trim();
  const interval = (options?.interval || "").trim();
  const welcome = (options?.welcome || "").trim();

  return getRootPortalUrl("/admin/login", {
    ...(tenantSlug ? { tenant: tenantSlug, intent: "admin" } : {}),
    ...(next ? { next } : {}),
    ...(reason ? { reason } : {}),
    ...(plan ? { plan } : {}),
    ...(interval ? { interval } : {}),
    ...(welcome ? { welcome } : {}),
  });
}

export function getCentralTenantRegisterUrl(options?: {
  plan?: string | null;
  interval?: string | null;
  ref?: string | null;
  category?: string | null;
}) {
  const plan = (options?.plan || "").trim();
  const interval = (options?.interval || "").trim();
  const ref = (options?.ref || "").trim();
  const category = (options?.category || "").trim();

  return getRootPortalUrl("/register", {
    ...(plan ? { plan } : {}),
    ...(interval ? { interval } : {}),
    ...(ref ? { ref } : {}),
    ...(category ? { category } : {}),
  });
}

export function getCustomerPostAuthUrl(options?: {
  tenantSlug?: string | null;
  next?: string | null;
}) {
  const tenantSlug = normalizeSlug(options?.tenantSlug);
  const normalizedNext = normalizeNextPath(options?.next) || "/user/me";
  if (!tenantSlug) {
    return normalizedNext;
  }

  return getTenantUrl(tenantSlug, mapCustomerNextPathToTenant(normalizedNext));
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

function normalizeNextPath(value?: string | null) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("/")) return "";
  if (trimmed.startsWith("//")) return "";
  return trimmed;
}

function mapCustomerNextPathToTenant(value: string) {
  if (value === "/user" || value === "/user/") {
    return "/";
  }
  if (value.startsWith("/user/")) {
    return value.slice("/user".length) || "/";
  }
  return value;
}
