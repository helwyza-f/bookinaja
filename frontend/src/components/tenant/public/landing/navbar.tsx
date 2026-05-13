"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCentralCustomerAuthUrl } from "@/lib/tenant";
import { getLandingPresetTone } from "./theme-preset";

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
};

export function TenantNavbar({
  profile,
  landingTheme,
  previewMode = "desktop",
  embedded = false,
}: TenantNavbarProps) {
  const isCompactPreview = embedded && previewMode === "mobile";
  const primaryColor = landingTheme?.primary || profile.primary_color || "#3b82f6";
  const preset = landingTheme?.preset || "bookinaja-classic";
  const radiusStyle = landingTheme?.radiusStyle || "rounded";
  const tone = getLandingPresetTone(preset);

  const shellRadiusClass =
    radiusStyle === "square"
      ? "rounded-[1rem] md:rounded-[1.35rem]"
      : radiusStyle === "soft"
        ? "rounded-[1.4rem] md:rounded-[1.9rem]"
        : "rounded-[1.4rem] md:rounded-[2rem]";
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

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-[100]",
        isCompactPreview ? "px-3 pt-3" : "px-4 pt-4 md:px-6 md:pt-6",
      )}
    >
      <nav
        className={cn(
          "mx-auto flex items-center justify-between border shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-2xl",
          isCompactPreview
            ? "h-[68px] max-w-none px-3"
            : "h-[74px] max-w-6xl px-4 md:h-[88px] md:px-6",
          shellRadiusClass,
          tone.shell,
        )}
      >
        <div className={cn("flex min-w-0 items-center", isCompactPreview ? "gap-2.5" : "gap-3 md:gap-4")}>
          <div
            className={cn(
              "relative shrink-0 overflow-hidden text-white",
              isCompactPreview ? "h-10 w-10 rounded-xl" : cn("h-11 w-11 md:h-14 md:w-14", logoRadiusClass),
            )}
            style={{
              backgroundColor: primaryColor,
              boxShadow: `0 12px 28px ${primaryColor}33`,
            }}
          >
            {profile.logo_url ? (
              <Image
                src={profile.logo_url}
                alt={`${profile.name} logo`}
                fill
                unoptimized
                sizes="56px"
                className="object-cover object-center"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-black italic">
                {profile.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div
              className={cn(
                "truncate font-[1000] uppercase italic tracking-tighter",
                isCompactPreview ? "max-w-[140px] text-[14px]" : "max-w-[180px] text-[15px] md:max-w-[320px] md:text-[24px]",
              )}
            >
              {profile.name}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div
                className={cn(
                  "rounded-full",
                  isCompactPreview ? "h-1 w-3" : "h-1 w-4 md:w-5",
                )}
                style={{ backgroundColor: primaryColor }}
              />
                <span
                  className={cn(
                  "truncate font-black uppercase",
                  isCompactPreview
                    ? "max-w-[110px] text-[8px] tracking-[0.18em]"
                    : "max-w-[180px] text-[9px] tracking-[0.22em] md:max-w-[320px] md:text-[10px] md:tracking-[0.28em]",
                  tone.eyebrow,
                )}
              >
                {profile.business_type || "Business Hub"} via Bookinaja
              </span>
            </div>
          </div>
        </div>

        <div className={cn("flex items-center", isCompactPreview ? "gap-2" : "gap-2.5 md:gap-3")}>
          <a
            href={getCentralCustomerAuthUrl("login", {
              tenantSlug: profile.slug,
              next: "/user/me",
            })}
            className="shrink-0"
          >
            <Button
              className={cn(
                "border-none font-black uppercase italic tracking-[0.14em] text-white",
                isCompactPreview
                  ? "h-10 w-10 px-0"
                  : cn("h-11 w-11 px-0 text-[10px] md:h-12 md:w-auto md:px-5 md:text-[11px]", buttonRadiusClass),
              )}
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 12px 28px ${primaryColor}33`,
              }}
            >
              <UserCircle2 className={cn(isCompactPreview ? "h-4.5 w-4.5" : "h-4.5 w-4.5 md:mr-1.5 md:h-4 md:w-4")} />
              {!isCompactPreview ? <span className="hidden md:inline">Sign In</span> : null}
            </Button>
          </a>
        </div>
      </nav>
    </div>
  );
}
