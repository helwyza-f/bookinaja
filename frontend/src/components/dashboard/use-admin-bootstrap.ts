"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { getTenantSlugFromBrowser } from "@/lib/tenant";
import {
  isTenantAuthError,
  setAdminAuthCookie,
  syncTenantCookies,
} from "@/lib/tenant-session";
import type { AdminSessionUser } from "@/lib/admin-access";

type AdminBootstrapResponse = {
  session_token?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    permission_keys?: string[];
    email_verified_at?: string | null;
    password_setup_required?: boolean;
    google_linked?: boolean;
  };
  tenant?: {
    id?: string;
    name?: string;
    slug?: string;
    logo_url?: string;
    business_category?: string;
    plan?: string;
    status?: string;
  };
  features?: {
    enable_discovery_posts?: boolean;
    plan_features?: string[];
    plan_feature_matrix?: Record<string, string[]>;
  };
};

type AdminBootstrapState = {
  status: "loading" | "ready" | "error";
  errorType: "auth" | "unknown" | null;
  user: AdminSessionUser | null;
  tenantName: string;
  tenantCategory: string;
  tenantSlug: string;
  growthVisible: boolean;
};

const initialState: AdminBootstrapState = {
  status: "loading",
  errorType: null,
  user: null,
  tenantName: "HUB",
  tenantCategory: "",
  tenantSlug: "",
  growthVisible: false,
};

export function useAdminBootstrap() {
  const params = useParams<{ tenant?: string }>();
  const tenantParam = String(params?.tenant || "").trim();
  const [state, setState] = useState<AdminBootstrapState>(initialState);

  const load = useCallback(async () => {
    const tenantSlug =
      getTenantSlugFromBrowser() || tenantParam;

    setState((current) => ({
      ...current,
      status: "loading",
      errorType: null,
      tenantSlug,
    }));

    try {
      const res = await api.get<AdminBootstrapResponse>("/admin/me/bootstrap");
      const bootstrap = res.data || {};

      if (bootstrap.session_token) {
        setAdminAuthCookie(bootstrap.session_token);
      }

      const resolvedTenantSlug =
        bootstrap.tenant?.slug || tenantSlug || tenantParam;
      const user: AdminSessionUser = {
        ...(bootstrap.user || {}),
        tenant_id: bootstrap.tenant?.id,
        logo_url: bootstrap.tenant?.logo_url || "",
        plan: bootstrap.tenant?.plan,
        subscription_status: bootstrap.tenant?.status,
        plan_features: bootstrap.features?.plan_features || [],
        plan_feature_matrix: bootstrap.features?.plan_feature_matrix || {},
      };

      syncTenantCookies(resolvedTenantSlug);

      setState({
        status: "ready",
        errorType: null,
        user,
        tenantName: bootstrap.tenant?.name || tenantParam || "HUB",
        tenantCategory: bootstrap.tenant?.business_category || "",
        tenantSlug: resolvedTenantSlug,
        growthVisible: Boolean(bootstrap.features?.enable_discovery_posts),
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        errorType: isTenantAuthError(error) ? "auth" : "unknown",
      }));
    }
  }, [tenantParam]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}
