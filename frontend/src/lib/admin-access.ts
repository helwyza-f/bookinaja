import { analyzeTenantFeatureAccess, type TenantFeatureKey } from "@/lib/plan-access";
import { expandPermissionKeys } from "@/lib/permission-catalog";

export type AdminSessionUser = {
  id?: string;
  name?: string;
  email?: string;
  logo_url?: string;
  role?: string;
  permission_keys?: string[];
  tenant_id?: string;
  email_verified_at?: string | null;
  password_setup_required?: boolean;
  google_linked?: boolean;
  plan?: string;
  subscription_status?: string;
  plan_features?: string[];
};

type RouteRule = {
  prefix: string;
  ownerOnly?: boolean;
  permissions?: string[];
  feature?: TenantFeatureKey;
  anyFeatures?: TenantFeatureKey[];
};

export type AdminRouteGate = {
  visible: boolean;
  accessible: boolean;
  lockedByPlan: boolean;
  requiredPlanLabel?: string;
};

const DASHBOARD_PERMISSIONS = [
  "bookings.read",
  "resources.read",
  "customers.read",
  "expenses.read",
  "pos.read",
  "fnb.read",
  "analytics.read",
];

const ROUTE_RULES: RouteRule[] = [
  { prefix: "/admin/growth", ownerOnly: true },
  { prefix: "/admin/settings/staff", ownerOnly: true, anyFeatures: ["staff_accounts", "role_permissions"] },
  { prefix: "/admin/settings/crm", ownerOnly: true, anyFeatures: ["crm_basic", "customer_import", "whatsapp_blast"] },
  { prefix: "/admin/settings/analytics", ownerOnly: true, feature: "advanced_analytics" },
  { prefix: "/admin/settings/payment-methods", ownerOnly: true, anyFeatures: ["payment_method_management", "manual_payment_verification"] },
  { prefix: "/admin/settings/nota", ownerOnly: true, feature: "advanced_receipt_branding" },
  { prefix: "/admin/settings", ownerOnly: true },
  { prefix: "/admin/resources", permissions: ["resources.read"] },
  { prefix: "/admin/devices", permissions: ["devices.read"] },
  { prefix: "/admin/expenses", permissions: ["expenses.read"] },
  { prefix: "/admin/bookings", permissions: ["bookings.read"] },
  { prefix: "/admin/pos", permissions: ["pos.read"] },
  { prefix: "/admin/fnb", permissions: ["fnb.read"] },
  { prefix: "/admin/customers", permissions: ["customers.read"] },
  { prefix: "/admin/dashboard", permissions: DASHBOARD_PERMISSIONS },
];

export function normalizeAdminPath(pathname: string) {
  const adminIndex = pathname.indexOf("/admin");
  if (adminIndex >= 0) {
    return pathname.slice(adminIndex);
  }
  return pathname;
}

export function hasPermission(
  user: AdminSessionUser | null | undefined,
  required: string | string[],
) {
  if (user?.role === "owner") return true;
  const requiredList = Array.isArray(required) ? required : [required];
  const permissions = expandPermissionKeys(user?.permission_keys);
  return requiredList.some((permission) => permissions.includes(permission));
}

export function canAccessAdminRoute(
  pathname: string,
  user: AdminSessionUser | null | undefined,
) {
  return getAdminRouteGate(pathname, user).accessible;
}

export function getAdminRouteGate(
  pathname: string,
  user: AdminSessionUser | null | undefined,
): AdminRouteGate {
  const normalizedPath = normalizeAdminPath(pathname);

  if (
    normalizedPath === "/admin" ||
    normalizedPath === "/admin/forbidden" ||
    normalizedPath === "/admin/login"
  ) {
    return { visible: true, accessible: true, lockedByPlan: false };
  }

  const matchingRule = ROUTE_RULES.find((rule) =>
    normalizedPath === rule.prefix || normalizedPath.startsWith(`${rule.prefix}/`),
  );

  if (!matchingRule) {
    return { visible: true, accessible: true, lockedByPlan: false };
  }

  if (matchingRule.ownerOnly) {
    if (user?.role !== "owner") {
      return { visible: false, accessible: false, lockedByPlan: false };
    }
  }

  if (matchingRule.feature || matchingRule.anyFeatures?.length) {
    const analysis = analyzeTenantFeatureAccess(user || {}, {
      feature: matchingRule.feature,
      anyFeatures: matchingRule.anyFeatures,
    });
    if (!analysis.accessible) {
      return {
        visible: user?.role === "owner",
        accessible: user?.role === "owner",
        lockedByPlan: true,
        requiredPlanLabel: analysis.requiredPlanLabel,
      };
    }
  }

  if (!matchingRule.permissions || matchingRule.permissions.length === 0) {
    return { visible: true, accessible: true, lockedByPlan: false };
  }

  const allowed = hasPermission(user, matchingRule.permissions);
  return {
    visible: allowed,
    accessible: allowed,
    lockedByPlan: false,
  };
}

export function getRouteUpgradeHref(pathname: string) {
  return `/admin/settings/billing/subscribe?source=${encodeURIComponent(normalizeAdminPath(pathname))}`;
}

export function getFirstAccessibleAdminPath(
  user: AdminSessionUser | null | undefined,
) {
  if (canAccessAdminRoute("/admin/dashboard", user)) {
    return "/admin/dashboard";
  }

  const fallback = [
    "/admin/bookings",
    "/admin/pos",
    "/admin/resources",
    "/admin/devices",
    "/admin/fnb",
    "/admin/expenses",
    "/admin/customers",
  ].find((path) => canAccessAdminRoute(path, user));

  return fallback || "/admin/forbidden";
}

export function canAccessDashboard(user: AdminSessionUser | null | undefined) {
  return canAccessAdminRoute("/admin/dashboard", user);
}

export function isOwner(user: AdminSessionUser | null | undefined) {
  return user?.role === "owner";
}
