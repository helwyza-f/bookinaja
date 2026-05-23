"use client";

import { getCookie } from "cookies-next";
import { getRootPortalUrl, getTenantUrl } from "@/lib/tenant";

function isLocalDevHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "lvh.me" || hostname.endsWith(".lvh.me");
}

function normalizeTarget(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "/";
  return trimmed;
}

function shouldBridgeWorkspaceEntry(targetUrl: string) {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
    return false;
  }
  if (!isLocalDevHost(window.location.hostname)) {
    return false;
  }

  try {
    const target = new URL(targetUrl, window.location.href);
    return target.host !== window.location.host;
  } catch {
    return false;
  }
}

export function getWorkspaceEntryUrl(targetUrl: string, tenantSlug?: string | null) {
  if (typeof window === "undefined") {
    return normalizeTarget(targetUrl);
  }

  const normalizedTarget = normalizeTarget(targetUrl);
  if (!shouldBridgeWorkspaceEntry(normalizedTarget)) {
    return normalizedTarget;
  }

  const token = String(getCookie("account_token") || "").trim();
  if (!token) {
    return normalizedTarget;
  }

  return getRootPortalUrl("/auth/bridge", {
    token,
    next: normalizedTarget,
    ...(tenantSlug ? { tenant: tenantSlug } : {}),
  });
}

export function getTenantAdminEntryUrl(tenantSlug: string, path = "/admin/dashboard") {
  return getWorkspaceEntryUrl(getTenantUrl(tenantSlug, path), tenantSlug);
}
