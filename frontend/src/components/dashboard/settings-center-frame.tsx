"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CreditCard,
  LogOut,
  ShieldUser,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { getAdminRouteGate } from "@/lib/admin-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { settingsNavItems } from "@/components/dashboard/admin-nav-config";
import api from "@/lib/api";
import { clearTenantSession } from "@/lib/tenant-session";

type SectionKey = "account" | "billing" | "workspace";

type SectionConfig = {
  key: SectionKey;
  label: string;
  description: string;
  icon: typeof ShieldUser;
  match: (pathname: string) => boolean;
  items: string[];
};

const SECTION_CONFIG: SectionConfig[] = [
  {
    key: "account",
    label: "Account",
    description: "Manage your account.",
    icon: ShieldUser,
    match: (pathname) => pathname.startsWith("/admin/settings/akun"),
    items: ["/admin/settings/akun"],
  },
  {
    key: "billing",
    label: "Billing",
    description: "Manage billing and subscription.",
    icon: CreditCard,
    match: (pathname) => pathname.startsWith("/admin/settings/billing"),
    items: ["/admin/settings/billing"],
  },
  {
    key: "workspace",
    label: "Workspace",
    description: "Manage your workspace.",
    icon: BriefcaseBusiness,
    match: (pathname) =>
      pathname.startsWith("/admin/settings/bisnis") ||
      pathname.startsWith("/admin/settings/payment-methods") ||
      pathname.startsWith("/admin/settings/staff") ||
      pathname.startsWith("/admin/settings/promo") ||
      pathname.startsWith("/admin/settings/page-builder") ||
      pathname.startsWith("/admin/settings/analytics") ||
      pathname.startsWith("/admin/settings/crm") ||
      pathname.startsWith("/admin/settings/nota") ||
      pathname.startsWith("/admin/settings/referral"),
    items: [
      "/admin/settings/bisnis",
      "/admin/settings/payment-methods",
      "/admin/settings/staff",
      "/admin/settings/promo",
      "/admin/settings/page-builder",
      "/admin/settings/analytics",
      "/admin/settings/crm",
      "/admin/settings/nota",
      "/admin/settings/referral",
    ],
  },
];

function resolveActiveSection(pathname: string) {
  return SECTION_CONFIG.find((section) => section.match(pathname)) || SECTION_CONFIG[0];
}

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

  const activeSection = useMemo(() => resolveActiveSection(pathname), [pathname]);
  const visibleRouteItems = useMemo(() => {
    const allowed = new Set(activeSection.items);
    return settingsNavItems.filter(
      (item) => allowed.has(item.href) && getAdminRouteGate(item.href, user).visible,
    );
  }, [activeSection.items, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncHash = () => setHash(window.location.hash || "");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  const secondaryItems = useMemo<SecondaryNavItem[]>(() => {
    if (activeSection.key === "account") {
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

    return visibleRouteItems.map((item) => ({
      key: item.href,
      label: item.label,
      hint: item.hint,
      href: item.href,
      icon: item.icon,
      kind: "route",
    }));
  }, [activeSection.key, visibleRouteItems]);

  const hasSecondaryNav = secondaryItems.length > 1;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await api.post("/auth/logout");
    } catch {
      toast.error("Sesi tidak sempat logout rapi. Saya tutup lokal dulu.");
    } finally {
      clearTenantSession();
      window.location.assign("/admin/login");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/45 backdrop-blur-[5px]">
      <div className="flex min-h-full items-stretch justify-center p-0 md:p-4">
        <div className="flex min-h-full w-full overflow-hidden bg-white shadow-2xl dark:bg-slate-950 md:min-h-0 md:max-h-[calc(100vh-2rem)] md:max-w-[1440px] md:rounded-[2rem] md:border md:border-slate-200 dark:md:border-slate-800">
          <aside className="hidden w-[260px] shrink-0 border-r border-slate-200 bg-[#f7f9fc] px-5 py-5 dark:border-slate-800 dark:bg-[#0b1120] md:flex md:flex-col">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Settings
              </div>
            </div>

            <nav className="mt-6 space-y-1">
              {SECTION_CONFIG.map((section) => {
                const active = section.key === activeSection.key;
                const Icon = section.icon;
                const href = section.items[0];
                return (
                  <Link
                    key={section.key}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)]"
                        : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{section.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-4 pt-6">
              <Link
                href="/pricing"
                target="_blank"
                className="flex items-center justify-between gap-3 rounded-2xl border border-orange-400 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-orange-50 dark:text-white dark:hover:bg-orange-500/10"
              >
                <span>Book a call with us</span>
                <span className="text-base leading-none">↗</span>
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="flex w-full items-center gap-3 border-t border-slate-200 px-2 pt-5 text-left text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </aside>

          <div className="flex min-h-full min-w-0 flex-1 flex-col">
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-4 md:px-6 md:py-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:hidden">
                    Settings
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 md:text-[2rem] dark:text-white">
                    {activeSection.label}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                    {activeSection.description}
                  </p>
                  <div className="mt-4 flex md:hidden">
                    <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="flex w-max gap-2">
                        {SECTION_CONFIG.map((section) => {
                          const active = section.key === activeSection.key;
                          const Icon = section.icon;
                          return (
                            <Link
                              key={section.key}
                              href={section.items[0]}
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors",
                                active
                                  ? "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] ring-1 ring-[rgba(59,130,246,0.18)]"
                                  : "bg-slate-100 text-slate-600",
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {section.label}
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
                  className="h-10 w-10 rounded-xl"
                  aria-label="Close settings"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col",
                hasSecondaryNav ? "md:grid md:grid-cols-[280px_minmax(0,1fr)]" : "",
              )}
            >
              {hasSecondaryNav ? (
                <aside className="border-b border-slate-200 bg-[#f7f9fc] px-4 py-4 dark:border-slate-800 dark:bg-[#0b1120] md:border-b-0 md:border-r md:px-6 md:py-6">
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
                                  <div className="mt-1 text-xs text-slate-400">{item.hint}</div>
                                ) : null}
                              </div>
                            </div>
                          );

                          const className = cn(
                            "min-w-[170px] rounded-2xl border px-4 py-3 transition-colors md:min-w-0",
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

              <main className="min-h-0 overflow-y-auto bg-white px-4 py-4 dark:bg-slate-950 md:px-6 md:py-6">
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
