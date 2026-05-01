export type AdminSessionUser = {
  role?: string;
  permission_keys?: string[];
};

type RouteRule = {
  prefix: string;
  ownerOnly?: boolean;
  permissions?: string[];
};

const DASHBOARD_PERMISSIONS = [
  "bookings.read",
  "resources.manage",
  "customers.read",
  "expenses.manage",
  "pos.manage",
  "fnb.manage",
];

const ROUTE_RULES: RouteRule[] = [
  { prefix: "/admin/settings", ownerOnly: true },
  { prefix: "/admin/resources", permissions: ["resources.manage"] },
  { prefix: "/admin/expenses", permissions: ["expenses.manage"] },
  { prefix: "/admin/bookings", permissions: ["bookings.read"] },
  { prefix: "/admin/pos", permissions: ["pos.manage"] },
  { prefix: "/admin/fnb", permissions: ["fnb.manage"] },
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
  const permissions = user?.permission_keys || [];
  return requiredList.some((permission) => permissions.includes(permission));
}

export function canAccessAdminRoute(
  pathname: string,
  user: AdminSessionUser | null | undefined,
) {
  const normalizedPath = normalizeAdminPath(pathname);

  if (
    normalizedPath === "/admin" ||
    normalizedPath === "/admin/forbidden" ||
    normalizedPath === "/admin/login"
  ) {
    return true;
  }

  const matchingRule = ROUTE_RULES.find((rule) =>
    normalizedPath === rule.prefix || normalizedPath.startsWith(`${rule.prefix}/`),
  );

  if (!matchingRule) {
    return true;
  }

  if (matchingRule.ownerOnly) {
    return user?.role === "owner";
  }

  if (!matchingRule.permissions || matchingRule.permissions.length === 0) {
    return true;
  }

  return hasPermission(user, matchingRule.permissions);
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
