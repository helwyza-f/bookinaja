"use client";

import { getCookie } from "cookies-next";
import { getTenantUrl } from "@/lib/tenant";

function isLocalDevHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "lvh.me" || hostname.endsWith(".lvh.me");
}

function normalizeTarget(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "/";
  return trimmed;
}

function shouldBridgeWorkspaceEntry(targetUrl: string) {
  if (typeof window === "undefined") {
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

function getRootHostFromTenantHost(hostname: string) {
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length < 2) {
    return hostname;
  }
  return parts.slice(-2).join(".");
}

function getBridgeUrlForTarget(targetUrl: string, token: string, tenantSlug?: string | null) {
  const target = new URL(targetUrl, window.location.href);
  const bridge = new URL("/auth/bridge", target.origin);
  bridge.hostname = getRootHostFromTenantHost(target.hostname);
  bridge.searchParams.set("token", token);
  bridge.searchParams.set("next", target.toString());
  if (tenantSlug) {
    bridge.searchParams.set("tenant", tenantSlug);
  }
  return bridge.toString();
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

  return getBridgeUrlForTarget(normalizedTarget, token, tenantSlug);
}

export function getTenantAdminEntryUrl(tenantSlug: string, path = "/admin/dashboard") {
  return getWorkspaceEntryUrl(getTenantUrl(tenantSlug, path), tenantSlug);
}
