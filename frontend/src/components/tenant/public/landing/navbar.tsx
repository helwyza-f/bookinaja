"use client";

import Image from "next/image";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ChevronDown, Menu, Moon, ShieldCheck, Sun, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCentralAdminAuthUrl,
  getCentralCustomerAuthUrl,
  getCustomerPostAuthUrl,
} from "@/lib/tenant";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BuilderSection } from "@/lib/page-builder";
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
  sections?: BuilderSection[];
};

export function TenantNavbar({
  profile,
  landingTheme,
  enableCustomerContext = true,
  sections = [],
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
  const mobileSectionItems = sections
    .filter(
      (section) =>
        section.enabled &&
        ["catalog", "about", "gallery", "contact"].includes(section.type),
    )
    .map((section) => ({
      id: section.id,
      label: getCustomerSectionLabel(section),
      href: `#${getSectionAnchorId(section.id)}`,
    }));

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
            onClick={() => setActionsOpen(true)}
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center border bg-white p-0 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.1)] ring-1 ring-slate-200/80 hover:bg-white md:hidden dark:bg-white/10 dark:text-white dark:ring-white/10",
              buttonRadiusClass,
            )}
            aria-label="Buka menu halaman"
          >
            <Menu className="h-4.5 w-4.5" />
          </Button>

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

      <Sheet open={actionsOpen} onOpenChange={setActionsOpen}>
        <SheetContent
          side="left"
          className="w-[88vw] max-w-[360px] border-r border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] p-0 backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98)_0%,rgba(15,23,42,0.96)_100%)]"
        >
          <SheetHeader className="border-b border-slate-200/80 px-5 py-4 text-left dark:border-slate-800">
            <div
              className="mb-4 rounded-[1.35rem] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/70"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "relative h-12 w-12 shrink-0 overflow-hidden",
                    logoRadiusClass,
                    hasCustomLogo ? "text-white" : "bg-white ring-1 ring-white/18",
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
                    sizes="48px"
                    className={cn(
                      "object-center",
                      profile.logo_url ? "object-cover" : "object-contain p-1.5",
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-slate-950 dark:text-white">
                    {profile.name}
                  </div>
                  <div className={cn("mt-1 text-[10px] font-semibold uppercase tracking-[0.16em]", tone.eyebrow)}>
                    {`${businessType} via Bookinaja`}
                  </div>
                </div>
              </div>
            </div>

            <SheetTitle className="text-lg font-semibold text-slate-950 dark:text-white">
              Menu
            </SheetTitle>
            <SheetDescription className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              Pilih cara masuk yang paling sesuai buat kamu.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-5 py-4">
            {mobileSectionItems.length ? (
              <div className="space-y-3">
                <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Jelajahi halaman
                </div>
                <div className="space-y-3">
                  {mobileSectionItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      onClick={() => setActionsOpen(false)}
                      className="group flex min-h-[56px] w-full items-center justify-between rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900"
                    >
                      <span>{item.label}</span>
                      <ChevronDown className="h-4 w-4 -rotate-90 text-[color:var(--bookinaja-600)] transition group-hover:translate-x-0.5" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setTheme(isDark ? "light" : "dark");
                setActionsOpen(false);
              }}
              className="group flex min-h-[72px] w-full items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_16px_32px_rgba(15,23,42,0.1)] dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div>{isDark ? "Pakai mode terang" : "Pakai mode gelap"}</div>
                <div className="mt-1 text-xs leading-5 font-medium text-slate-500 dark:text-slate-400">
                  Biar tampilan lebih nyaman dibaca
                </div>
              </div>
              <div className="text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300">
                →
              </div>
            </button>

            <div className="space-y-3">
              <a
                href={adminHref}
                className="group flex min-h-[78px] items-center gap-3 rounded-[1.45rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_16px_32px_rgba(15,23,42,0.1)] dark:border-slate-800 dark:bg-slate-900/70 dark:text-white dark:hover:bg-slate-900"
                onClick={() => setActionsOpen(false)}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div>Masuk Admin</div>
                  <div className="mt-1 text-xs leading-5 font-medium text-slate-500 dark:text-slate-400">
                    Untuk pemilik atau tim yang mengelola bisnis ini
                  </div>
                </div>
                <div className="text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300">
                  →
                </div>
              </a>

              <a
                href={customerHref}
                className="group relative flex min-h-[84px] items-center gap-3 overflow-hidden rounded-[1.55rem] px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_44px_rgba(59,130,246,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(59,130,246,0.32)]"
                style={{ backgroundColor: primaryColor }}
                onClick={() => setActionsOpen(false)}
              >
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0%,transparent_52%,rgba(255,255,255,0.08)_100%)]" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/16 text-white ring-1 ring-white/10">
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
                    <UserCircle2 className="h-4.5 w-4.5" />
                  )}
                </div>
                <div className="relative min-w-0 flex-1">
                  <div>{isAuthenticated ? "Lanjut ke akun kamu" : "Masuk sebagai Customer"}</div>
                  <div className="mt-1 text-xs leading-5 font-medium text-white/80">
                    {isAuthenticated
                      ? `Buka akun ${truncateLandingCopy(firstName || customer?.name || "customer", 18)} untuk lihat booking dan status terbaru`
                      : "Lihat booking, status pesanan, dan riwayat akun kamu"}
                  </div>
                </div>
                <div className="relative text-white/70 transition group-hover:text-white">
                  →
                </div>
              </a>
            </div>

            <div className="rounded-[1.25rem] border border-dashed border-slate-200 px-4 py-3.5 text-xs leading-6 text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Kalau kamu mau booking atau cek status pesanan, masuk sebagai customer. Kalau kamu yang mengelola bisnis ini, masuk lewat admin.
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function getSectionAnchorId(sectionId: string) {
  return `landing-section-${sectionId}`;
}

function getCustomerSectionLabel(section: BuilderSection): string {
  switch (section.type) {
    case "highlights":
      return "Keunggulan";
    case "catalog":
      return "Booking";
    case "gallery":
      return "Galeri";
    case "about":
      return "Tentang";
    case "contact":
      return "Kontak";
    default:
      return section.label || "Section";
  }
}
