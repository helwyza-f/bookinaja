"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ShieldUser, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { getAdminRouteGate } from "@/lib/admin-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isAdminNavItemActive, settingsNavItems } from "@/components/dashboard/admin-nav-config";
import api from "@/lib/api";
import { clearTenantSession } from "@/lib/tenant-session";
import { getCentralAdminAuthUrl, getGlobalAuthLoginUrl, getTenantSlugFromBrowser } from "@/lib/tenant";

type SecondaryNavItem = {
  key: string;
  label: string;
  hint?: string;
  href: string;
  icon?: typeof ShieldUser;
  kind: "route" | "anchor";
};

export function SettingsCenterFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAdminSession();
  const [signingOut, setSigningOut] = useState(false);
  const [hash, setHash] = useState("");

  const primaryItems = useMemo(
    () => settingsNavItems.filter((item) => getAdminRouteGate(item.href, user).visible),
    [user],
  );
  const primaryHrefs = useMemo(() => primaryItems.map((item) => item.href), [primaryItems]);
  const activeItem = useMemo(
    () =>
      primaryItems.find((item) => isAdminNavItemActive(pathname, item.href, primaryHrefs)) ||
      primaryItems[0],
    [pathname, primaryHrefs, primaryItems],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncHash = () => setHash(window.location.hash || "");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  const secondaryItems = useMemo<SecondaryNavItem[]>(() => {
    if (activeItem?.href === "/admin/settings/akun") {
      return [
        {
          key: "profile",
          label: "Profile",
          href: "#profile",
          kind: "anchor",
        },
        {
          key: "security",
          label: "Security",
          href: "#security",
          kind: "anchor",
        },
      ];
    }

    return [];
  }, [activeItem?.href]);

  const hasSecondaryNav = secondaryItems.length > 1;

  const handleSignOut = async () => {
    setSigningOut(true);
    const isOwner = user?.role === "owner";
    try {
      await api.post("/auth/logout");
    } catch {
      toast.error("Sesi tidak sempat logout rapi. Saya tutup lokal dulu.");
    } finally {
      clearTenantSession({ keepTenantSlug: !isOwner });
      window.location.assign(
        isOwner
          ? getGlobalAuthLoginUrl({ signed_out: 1 })
          : getCentralAdminAuthUrl({
              tenantSlug: getTenantSlugFromBrowser(),
              next: "/admin/dashboard",
            }),
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/45 backdrop-blur-[5px]">
      <div className="flex h-[100dvh] min-h-0 items-stretch justify-center p-0 md:p-4">
        <div className="flex h-full min-h-0 w-full overflow-hidden bg-white shadow-2xl dark:bg-slate-950 md:h-auto md:max-h-[calc(100dvh-2rem)] md:max-w-[1120px] md:rounded-[1.35rem] md:border md:border-slate-200 dark:md:border-slate-800">
          <aside className="hidden w-[214px] shrink-0 border-r border-slate-200 bg-[#f8fafc] px-3 py-3 dark:border-slate-800 dark:bg-[#0b1120] md:flex md:flex-col">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Settings
              </div>
            </div>

            <nav className="mt-5 space-y-1">
              {primaryItems.map((item) => {
                const active = activeItem?.href === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)]"
                        : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3 pt-5">
              <Link
                href="/pricing"
                target="_blank"
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                <span>Lihat upgrade</span>
                <span className="text-sm leading-none">↗</span>
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="flex w-full items-center gap-3 border-t border-slate-200 px-2 pt-4 text-left text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 md:px-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:hidden">
                    Settings
                  </div>
                  <h1 className="mt-1 text-[1.65rem] font-semibold tracking-tight text-slate-950 md:text-[1.6rem] dark:text-white">
                    {activeItem?.label || "Settings"}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                    {activeItem?.hint || "Manage workspace settings."}
                  </p>
                  <div className="mt-3 flex md:hidden">
                    <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="flex w-max gap-2">
                        {primaryItems.map((item) => {
                          const active = activeItem?.href === item.href;
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors",
                                active
                                  ? "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] ring-1 ring-[rgba(59,130,246,0.18)]"
                                  : "bg-slate-100 text-slate-600",
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/admin/dashboard")}
                  className="h-9 w-9 rounded-xl"
                  aria-label="Close settings"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col",
                hasSecondaryNav ? "md:grid md:grid-cols-[240px_minmax(0,1fr)]" : "",
              )}
            >
              {hasSecondaryNav ? (
                <aside className="border-b border-slate-200 bg-[#f8fafc] px-4 py-3 dark:border-slate-800 dark:bg-[#0b1120] md:border-b-0 md:border-r md:px-4 md:py-4">
                  <div className="mt-0">
                    <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-visible">
                      <nav className="flex w-max gap-2 md:w-auto md:flex-col md:gap-1">
                        {secondaryItems.map((item, index) => {
                          const gate =
                            item.kind === "route"
                              ? getAdminRouteGate(item.href, user)
                              : null;
                          const active =
                            item.kind === "route"
                              ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                              : hash === item.href || (!hash && index === 0);
                          const content = (
                            <div className="flex items-start gap-3">
                              {item.icon ? (
                                <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
                              ) : null}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 font-semibold">
                                  <span className="truncate">{item.label}</span>
                                  {gate?.lockedByPlan ? (
                                    <Badge className="border-0 bg-amber-600/10 px-1.5 py-0 text-[9px] font-bold uppercase tracking-[0.16em] text-current">
                                      {gate.requiredPlanLabel}
                                    </Badge>
                                  ) : null}
                                </div>
                                {item.hint ? (
                                  <div className="mt-0.5 truncate text-[11px] text-slate-400">
                                    {item.hint}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );

                          const className = cn(
                            "min-w-[150px] rounded-xl border px-3 py-2 transition-colors md:min-w-0",
                            active
                              ? "border-slate-200 bg-white text-[var(--bookinaja-700)] shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-[var(--bookinaja-100)]"
                              : "border-transparent text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-white",
                          );

                          if (item.kind === "anchor") {
                            return (
                              <a key={item.key} href={item.href} className={className}>
                                {content}
                              </a>
                            );
                          }

                          return (
                            <Link key={item.key} href={item.href} className={className}>
                              {content}
                            </Link>
                          );
                        })}
                      </nav>
                    </div>
                  </div>
                </aside>
              ) : null}

              <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:bg-slate-950 md:px-4 md:py-4">
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
