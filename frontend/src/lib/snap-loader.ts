/**
 * snap-loader.ts
 *
 * Shared utility to dynamically load Midtrans Snap.js using either:
 * - Tenant BYO credentials (fetched from /public/payment-gateway/:tenantId)
 * - Platform credentials (env vars — used only for subscription checkout)
 *
 * The loader injects a <script> tag once per (clientKey, environment) pair
 * and caches the resulting snap object for the page lifecycle.
 */

import api from "@/lib/api";

type SnapInstance = { pay: (token: string, options?: object) => void };

type TenantGatewayConfig = {
  provider: string;
  environment: string;
  client_key: string;
  configured: boolean;
};

let _cachedTenantConfig: Record<string, TenantGatewayConfig | null> = {};
let _snapPromise: Promise<SnapInstance | null> | null = null;
let _loadedClientKey: string | null = null;

function snapUrl(isProduction: boolean): string {
  return isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

function getWindowSnap(): SnapInstance | null {
  return (window as Window & { snap?: SnapInstance }).snap || null;
}

function injectSnapScript(
  clientKey: string,
  isProduction: boolean,
): Promise<SnapInstance | null> {
  const src = snapUrl(isProduction);

  // If already injected with the same key, reuse
  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-midtrans-snap="bookinaja"]',
  );
  if (existing) {
    const existingKey = existing.getAttribute("data-client-key");
    if (existingKey === clientKey) {
      // Same key — just wait for it
      if (getWindowSnap()) return Promise.resolve(getWindowSnap());
      return new Promise((resolve) => {
        existing.addEventListener("load", () => resolve(getWindowSnap()), {
          once: true,
        });
      });
    }
    // Different key — remove old script, clear snap
    existing.remove();
    (window as Window & { snap?: SnapInstance }).snap = undefined;
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.setAttribute("data-client-key", clientKey);
    script.setAttribute("data-midtrans-snap", "bookinaja");
    script.async = true;
    script.onload = () => resolve(getWindowSnap());
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/**
 * Fetch tenant's BYO gateway config from the public API.
 * Returns null if tenant hasn't configured a gateway.
 */
export async function fetchTenantGatewayConfig(
  tenantId: string,
): Promise<TenantGatewayConfig | null> {
  if (_cachedTenantConfig[tenantId] !== undefined) {
    return _cachedTenantConfig[tenantId];
  }
  try {
    const res = await api.get(`/public/payment-gateway/${tenantId}`);
    const data: TenantGatewayConfig | null = res.data?.data || null;
    _cachedTenantConfig[tenantId] = data;
    return data;
  } catch {
    _cachedTenantConfig[tenantId] = null;
    return null;
  }
}

/**
 * Load Snap.js using a tenant's BYO gateway credentials.
 * Returns null if the tenant hasn't configured Midtrans, or if the provider
 * is Xendit (which uses redirect, not Snap widget).
 */
export async function loadTenantSnap(
  tenantId: string,
): Promise<SnapInstance | null> {
  if (typeof window === "undefined") return null;

  const config = await fetchTenantGatewayConfig(tenantId);
  if (!config?.configured || !config.client_key) return null;
  if (config.provider !== "midtrans") return null; // Xendit uses redirect

  const clientKey = config.client_key;
  const isProduction = config.environment === "production";

  // Reuse if already loaded with same key
  if (_loadedClientKey === clientKey && getWindowSnap()) {
    return getWindowSnap();
  }

  if (_loadedClientKey === clientKey && _snapPromise) {
    return _snapPromise;
  }

  _loadedClientKey = clientKey;
  _snapPromise = injectSnapScript(clientKey, isProduction);
  return _snapPromise;
}

/**
 * Load Snap.js using platform (Bookinaja) credentials from env vars.
 * Used only for subscription/billing checkout — money goes to Bookinaja.
 */
export async function loadPlatformSnap(): Promise<SnapInstance | null> {
  if (typeof window === "undefined") return null;

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
  if (!clientKey) return null;

  const isProduction =
    (process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").toLowerCase() ===
    "true";

  if (_loadedClientKey === clientKey && getWindowSnap()) {
    return getWindowSnap();
  }

  if (_loadedClientKey === clientKey && _snapPromise) {
    return _snapPromise;
  }

  _loadedClientKey = clientKey;
  _snapPromise = injectSnapScript(clientKey, isProduction);
  return _snapPromise;
}

/**
 * Wait for the snap global to become available (with timeout).
 */
export async function waitForSnap(
  timeoutMs = 5000,
): Promise<SnapInstance | null> {
  if (typeof window === "undefined") return null;
  if (getWindowSnap()) return getWindowSnap();
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (getWindowSnap()) return getWindowSnap();
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

/** Clear cached config (useful after admin saves new gateway settings). */
export function clearGatewayConfigCache(tenantId?: string) {
  if (tenantId) {
    delete _cachedTenantConfig[tenantId];
  } else {
    _cachedTenantConfig = {};
  }
}
