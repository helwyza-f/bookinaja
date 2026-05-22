"use client";

import { getCookie } from "cookies-next";
import { getRootPortalUrl, getTenantUrl } from "@/lib/tenant";

function isLocalDevHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function normalizeTarget(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "/";
  return trimmed;
}

export function getWorkspaceEntryUrl(targetUrl: string, tenantSlug?: string | null) {
  if (typeof window === "undefined") {
    return normalizeTarget(targetUrl);
  }

  const normalizedTarget = normalizeTarget(targetUrl);
  if (!isLocalDevHost(window.location.hostname)) {
    return normalizedTarget;
  }

  const token = String(getCookie("auth_token") || "").trim();
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
