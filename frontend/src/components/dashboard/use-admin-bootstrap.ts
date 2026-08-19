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
import type {
  TrialInfo,
  WorkspaceSummary,
} from "@/components/dashboard/admin-session-context";

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
    period_end?: string | null;
    grace_active?: boolean;
    can_create?: boolean;
    grace_phase?: number;
    grace_days?: number;
    grace_friction_day?: number;
    grace_lock_day?: number;
    transactions_allowed?: boolean;
  };
  features?: {
    enable_discovery_posts?: boolean;
    plan_features?: string[];
    plan_feature_matrix?: Record<string, string[]>;
    fnb_mode?: "integrated" | "standalone" | "off";
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
  fnbMode: "integrated" | "standalone" | "off";
  currentWorkspace: WorkspaceSummary | null;
  workspaces: WorkspaceSummary[];
  trialInfo: TrialInfo | null;
};

const initialState: AdminBootstrapState = {
  status: "loading",
  errorType: null,
  user: null,
  tenantName: "HUB",
  tenantCategory: "",
  tenantSlug: "",
  growthVisible: false,
  fnbMode: "integrated",
  currentWorkspace: null,
  workspaces: [],
  trialInfo: null,
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
      if (typeof window !== "undefined" && resolvedTenantSlug) {
        window.localStorage.setItem("bookinaja:last_workspace_slug", resolvedTenantSlug);
      }

      setState({
        status: "ready",
        errorType: null,
        user,
        tenantName: bootstrap.tenant?.name || tenantParam || "HUB",
        tenantCategory: bootstrap.tenant?.business_category || "",
        tenantSlug: resolvedTenantSlug,
        growthVisible: Boolean(bootstrap.features?.enable_discovery_posts),
        fnbMode:
          bootstrap.features?.fnb_mode === "standalone" ||
          bootstrap.features?.fnb_mode === "off"
            ? bootstrap.features.fnb_mode
            : "integrated",
        currentWorkspace: {
          id: bootstrap.tenant?.id || "",
          name: bootstrap.tenant?.name || tenantParam || "HUB",
          slug: resolvedTenantSlug,
          role: bootstrap.user?.role || "owner",
          logo_url: bootstrap.tenant?.logo_url || "",
        },
        workspaces: bootstrap.tenant?.id
          ? [
              {
                id: bootstrap.tenant.id,
                name: bootstrap.tenant?.name || tenantParam || "HUB",
                slug: resolvedTenantSlug,
                role: bootstrap.user?.role || "owner",
                logo_url: bootstrap.tenant?.logo_url || "",
              },
            ]
          : [],
        trialInfo: {
          plan: bootstrap.tenant?.plan || "",
          status: bootstrap.tenant?.status || "",
          daysLeft: null,
          // Grace: langganan non-aktif → tak boleh buat item baru (selaras
          // middleware backend RequireActiveSubscription). Default aman:
          // canCreate true bila backend lama tak mengirim field.
          graceActive: bootstrap.tenant?.grace_active === true,
          canCreate: bootstrap.tenant?.can_create !== false,
          gracePhase:
            typeof bootstrap.tenant?.grace_phase === "number"
              ? bootstrap.tenant.grace_phase
              : bootstrap.tenant?.grace_active === true
                ? 1
                : 0,
          graceDays: bootstrap.tenant?.grace_days ?? 0,
          frictionDay: bootstrap.tenant?.grace_friction_day ?? 8,
          lockDay: bootstrap.tenant?.grace_lock_day ?? 15,
          // Default aman: backend lama tanpa field → anggap transaksi boleh.
          transactionsAllowed: bootstrap.tenant?.transactions_allowed !== false,
        },
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
