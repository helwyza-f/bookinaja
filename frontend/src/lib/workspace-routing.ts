import { getTenantAdminEntryUrl } from "@/lib/workspace-entry";
import { getWorkspaceFallbackRoute } from "@/components/dashboard/workspace-shell-config";

const REUSABLE_PREFIXES = [
  "/admin/dashboard",
  "/admin/bookings",
  "/admin/pos",
  "/admin/resources",
  "/admin/fnb",
  "/admin/expenses",
  "/admin/customers",
  "/admin/settings/akun",
  "/admin/settings/billing",
  "/admin/settings/bisnis",
  "/admin/settings/workspaces",
  "/admin/brand",
  "/admin/page-builder",
  "/admin/referral",
];

export function canReuseWorkspaceRoute(pathname: string) {
  return REUSABLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function resolveWorkspaceSwitchUrl(targetSlug: string, pathname: string, search = "") {
  const targetPath = canReuseWorkspaceRoute(pathname)
    ? `${pathname}${search || ""}`
    : getWorkspaceFallbackRoute();
  return getTenantAdminEntryUrl(targetSlug, targetPath);
}
