"use client";

import Image from "next/image";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ChevronDown, Moon, ShieldCheck, Sun, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCentralAdminAuthUrl,
  getCentralCustomerAuthUrl,
  getCustomerPostAuthUrl,
} from "@/lib/tenant";
import { getLandingPresetTone } from "./theme-preset";
import { truncateLandingCopy } from "./copy-budget";
import { useCustomerSessionPreview } from "@/lib/customer-session-preview";
import { BOOKINAJA_LOGO_NORMAL_SRC } from "@/lib/brand";

type TenantNavbarProfile = {
  name: string;
  slug?: string;
  business_type?: string;
  primary_color?: string;
  logo_url?: string;
};

type TenantNavbarProps = {
  profile: TenantNavbarProfile;
  landingTheme?: {
    primary: string;
    accent?: string;
    preset?: string;
    radiusStyle?: string;
  };
  previewMode?: "desktop" | "mobile";
  embedded?: boolean;
  enableCustomerContext?: boolean;
};

export function TenantNavbar({
  profile,
  landingTheme,
  enableCustomerContext = true,
}: TenantNavbarProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const primaryColor = landingTheme?.primary || profile.primary_color || "#3b82f6";
  const preset = landingTheme?.preset || "bookinaja-classic";
  const radiusStyle = landingTheme?.radiusStyle || "rounded";
  const tone = getLandingPresetTone(preset);
  const isDark = resolvedTheme === "dark";
  const businessType = profile.business_type || "Business Hub";
  const { customer, firstName, isAuthenticated } = useCustomerSessionPreview({
    enabled: enableCustomerContext,
  });
  const customerInitials = String(customer?.name || "CU")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  const customerHref = isAuthenticated
    ? getCustomerPostAuthUrl({
        tenantSlug: profile.slug,
        next: "/user/me",
      })
    : getCentralCustomerAuthUrl("login", {
        tenantSlug: profile.slug,
        next: "/user/me",
      });
  const adminHref = getCentralAdminAuthUrl({
    tenantSlug: profile.slug,
    next: "/admin/dashboard",
  });

  const desktopShellRadiusClass =
    radiusStyle === "square"
      ? "md:rounded-[1.35rem]"
      : radiusStyle === "soft"
        ? "md:rounded-[1.9rem]"
        : "md:rounded-[2rem]";
  const logoRadiusClass =
    radiusStyle === "square"
      ? "rounded-[0.9rem]"
      : radiusStyle === "soft"
        ? "rounded-[1.1rem]"
        : "rounded-[1rem]";
  const buttonRadiusClass =
    radiusStyle === "square"
      ? "rounded-[0.9rem]"
      : radiusStyle === "soft"
        ? "rounded-[1.1rem]"
        : "rounded-[1rem]";
  const hasCustomLogo = Boolean(profile.logo_url);

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-[100]",
        "px-0 pt-0 md:px-6 md:pt-6",
      )}
    >
      <nav
        className={cn(
          "mx-auto flex items-center justify-between border shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-2xl",
          "h-[82px] w-full max-w-none border-x-0 border-t-0 px-4 shadow-[0_12px_32px_rgba(15,23,42,0.12)] md:h-[88px] md:max-w-6xl md:border md:px-6 md:shadow-[0_18px_45px_rgba(15,23,42,0.12)]",
          cn("rounded-none", desktopShellRadiusClass),
          tone.shell,
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5 md:gap-4">
          <div
            className={cn(
              "relative shrink-0 overflow-hidden",
              cn("h-11 w-11 md:h-14 md:w-14", logoRadiusClass),
              hasCustomLogo
                ? "text-white"
                : "bg-white ring-1 ring-white/18",
            )}
            style={{
              backgroundColor: hasCustomLogo ? primaryColor : undefined,
              boxShadow: hasCustomLogo
                ? `0 12px 28px ${primaryColor}33`
                : "0 12px 24px rgba(15, 23, 42, 0.14)",
            }}
          >
            <Image
              src={profile.logo_url || BOOKINAJA_LOGO_NORMAL_SRC}
              alt={profile.logo_url ? `${profile.name} logo` : "Bookinaja logo"}
              fill
              sizes="56px"
              className={cn(
                "object-center",
                profile.logo_url ? "object-cover" : "object-contain p-1.5",
              )}
            />
          </div>

          <div className="min-w-0">
            <div
              className={cn(
                "truncate font-semibold uppercase tracking-normal",
                "max-w-[156px] text-[15px] sm:max-w-[180px] sm:text-[17px] md:max-w-[320px] md:text-[22px]",
              )}
            >
              {profile.name}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div
                className={cn(
                  "rounded-full",
                  "h-1 w-4 md:w-5",
                )}
                style={{ backgroundColor: primaryColor }}
              />
                <span
                  className={cn(
                  "truncate font-semibold uppercase",
                  "max-w-[110px] text-[8px] tracking-[0.12em] sm:max-w-[170px] sm:text-[9px] md:max-w-[320px] md:text-[10px]",
                  tone.eyebrow,
                )}
              >
                {`${businessType} via Bookinaja`}
              </span>
            </div>
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-2 md:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
              "hidden shrink-0 border font-semibold md:inline-flex",
              cn("h-12 w-12 px-0 md:h-12 md:w-12", buttonRadiusClass),
              tone.social,
            )}
            aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
          >
            {isDark ? (
              <Sun className="h-4.5 w-4.5" />
            ) : (
              <Moon className="h-4.5 w-4.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setActionsOpen((current) => !current)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 border bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.1)] ring-1 ring-slate-200/80 hover:bg-white md:hidden dark:bg-white/10 dark:text-white dark:ring-white/10",
              buttonRadiusClass,
            )}
            aria-expanded={actionsOpen}
            aria-label="Buka aksi halaman"
          >
            Aksi
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", actionsOpen && "rotate-180")} />
          </Button>

          {actionsOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.55rem)] z-[110] w-[220px] rounded-2xl border border-white/60 bg-white/95 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-slate-950/95">
              <button
                type="button"
                onClick={() => {
                  setTheme(isDark ? "light" : "dark");
                  setActionsOpen(false);
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? "Mode terang" : "Mode gelap"}
              </button>
              <a
                href={adminHref}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                onClick={() => setActionsOpen(false)}
              >
                <ShieldCheck className="h-4 w-4" />
                Masuk Admin
              </a>
              <a
                href={customerHref}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
                onClick={() => setActionsOpen(false)}
              >
                <UserCircle2 className="h-4 w-4" />
                {isAuthenticated ? "Akun Customer" : "Masuk Customer"}
              </a>
            </div>
          ) : null}

          <a href={adminHref} className="hidden shrink-0 md:block">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-11 border bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.1)] ring-1 ring-slate-200/80 transition-transform hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_30px_rgba(15,23,42,0.14)] dark:bg-white/10 dark:text-white dark:ring-white/10 md:h-12 md:px-4 md:text-[11px]",
                buttonRadiusClass,
              )}
            >
              <ShieldCheck className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline md:hidden">Admin</span>
              <span className="hidden md:inline">Masuk Admin</span>
            </Button>
          </a>

          <a href={customerHref} className="hidden shrink-0 md:block">
            <Button
              className={cn(
                "border-none font-semibold uppercase tracking-[0.08em] text-white",
                cn(
                  "h-11 px-3 text-[10px] md:h-12 md:w-auto md:px-5 md:text-[11px]",
                  buttonRadiusClass,
                ),
              )}
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 12px 28px ${primaryColor}33`,
              }}
            >
              {customer?.avatar_url && isAuthenticated ? (
                <Image
                  src={customer.avatar_url}
                  alt={customer?.name || "Customer"}
                  width={28}
                  height={28}
                  unoptimized
                  className="h-7 w-7 rounded-full object-cover object-center"
                />
              ) : isAuthenticated ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/18 text-[11px] font-black text-white">
                  {customerInitials || "CU"}
                </span>
              ) : (
                <UserCircle2 className="h-4 w-4 sm:mr-1.5" />
              )}
              <span className="hidden sm:inline md:hidden">
                {isAuthenticated ? "Akun" : "Customer"}
              </span>
              <span className="hidden md:inline">
                {isAuthenticated
                  ? `Halo, ${truncateLandingCopy(firstName || customer?.name || "Customer", 16)}`
                  : "Masuk Customer"}
              </span>
            </Button>
          </a>
        </div>
      </nav>
    </div>
  );
}
