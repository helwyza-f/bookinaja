"use client";

import { useEffect, useRef } from "react";
import {
  ArrowRight,
  CalendarClock,
  Camera,
  Megaphone,
  PlayCircle,
  Store,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  type DiscoveryTenant,
  formatDiscoveryDuration,
  formatStartingPrice,
  getDiscoveryByline,
  getDiscoveryCardKind,
  getDiscoveryItemBadges,
  getDiscoveryItemImage,
  getDiscoveryItemLabel,
  getDiscoveryItemSummary,
  getDiscoveryItemTitle,
  getDiscoverySurfaceLabel,
} from "@/lib/discovery";

export function DiscoverySectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
        {eyebrow}
      </div>
      <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-slate-950 md:text-3xl">
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-7 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export function DiscoveryCategoryChips({
  categories,
  activeCategory,
  onChange,
  tone = "light",
}: {
  categories: string[];
  activeCategory: string;
  onChange: (category: string) => void;
  tone?: "light" | "dark";
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={cn(
            "whitespace-nowrap rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] transition-all",
            activeCategory === category
              ? "bg-blue-600 text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)]"
              : tone === "dark"
                ? "bg-white/8 text-slate-200 hover:bg-white/12"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

export function DiscoverySpotlightCard({
  tenant,
  href,
  ctaLabel,
  stats,
  accent = "blue",
  onVisible,
  onClick,
}: {
  tenant: DiscoveryTenant;
  href: string;
  ctaLabel: string;
  stats: string[];
  accent?: "blue" | "emerald";
  onVisible?: () => void;
  onClick?: () => void;
}) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    onVisible?.();
  }, [onVisible]);

  const isBusiness = tenant.item_kind !== "post";
  const accentClass =
    accent === "emerald"
      ? "from-emerald-500/28 via-emerald-300/10 to-transparent"
      : "from-blue-500/22 via-blue-300/8 to-transparent";

  return (
    <Card className="overflow-hidden rounded-[2rem] border-0 bg-slate-950 text-white shadow-[0_24px_64px_rgba(15,23,42,0.18)]">
      <CardContent className="relative p-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{
            backgroundImage: getDiscoveryItemImage(tenant)
              ? `url(${getDiscoveryItemImage(tenant)})`
              : "linear-gradient(135deg, rgba(13,31,39,0.94), rgba(29,78,216,0.65))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/55 to-white/5" />
        <div className={cn("absolute inset-0 bg-gradient-to-r", accentClass)} />
        <div className="relative z-10 flex min-h-[320px] flex-col justify-between p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <DiscoveryTypeChip tenant={tenant} />
              <Badge className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                {getDiscoverySurfaceLabel(tenant)}
              </Badge>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
                {isBusiness ? "Mulai" : "Format"}
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {isBusiness
                  ? formatStartingPrice(tenant.starting_price)
                  : formatDiscoveryDuration(tenant.post_duration_seconds) || "Konten"}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/72">
              {getDiscoveryByline(tenant)}
            </div>
            <div className="space-y-3">
              <h3 className="max-w-3xl text-3xl font-black uppercase leading-[0.95] tracking-[-0.05em] md:text-4xl">
                {getDiscoveryItemTitle(tenant)}
              </h3>
              <p className="max-w-2xl text-sm leading-7 text-white/85 md:text-base">
                {getDiscoveryItemSummary(tenant)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {getDiscoveryItemBadges(tenant).slice(0, 3).map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold text-white/92"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-2 text-sm text-white/72 md:grid-cols-3">
              {stats.slice(0, 3).map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <Button asChild className="h-11 rounded-2xl bg-white text-slate-950 hover:bg-white/90">
              <a href={href} onClick={onClick}>
                {ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DiscoveryShowcaseCard({
  tenant,
  href,
  ctaLabel,
  meta,
  stat,
  tone = "blue",
  onVisible,
  onClick,
}: {
  tenant: DiscoveryTenant;
  href: string;
  ctaLabel: string;
  meta: string;
  stat: string;
  tone?: "blue" | "emerald" | "amber";
  onVisible?: () => void;
  onClick?: () => void;
}) {
  const trackedRef = useRef(false);
  const isBusinessCard = tenant.item_kind !== "post";

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    onVisible?.();
  }, [onVisible]);

  const toneClasses =
    tone === "emerald"
      ? {
          border: "border-emerald-100",
          label: "bg-emerald-50 text-emerald-700",
          meta: "bg-emerald-50/80",
        }
      : tone === "amber"
        ? {
            border: "border-amber-200",
            label: "bg-amber-50 text-amber-700",
            meta: "bg-amber-50/80",
          }
        : {
            border: "border-blue-100",
            label: "bg-blue-50 text-blue-700",
            meta: "bg-slate-50",
          };

  return (
    <Card
      className={cn(
        "group overflow-hidden rounded-[1.7rem] border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md",
        toneClasses.border,
      )}
    >
      <CardContent className="p-0">
        <div className={cn("relative overflow-hidden", isBusinessCard ? "h-56" : "h-40")}>
          <div
            className="h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{
              backgroundImage: getDiscoveryItemImage(tenant)
                ? `url(${getDiscoveryItemImage(tenant)})`
                : "linear-gradient(135deg, rgba(13,31,39,0.92), rgba(96,165,250,0.72))",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <DiscoveryTypeChip tenant={tenant} />
            <Badge className={cn("rounded-full", toneClasses.label)}>
              {getDiscoveryItemLabel(tenant)}
            </Badge>
          </div>
        </div>

        <div className={cn("p-4", isBusinessCard ? "space-y-3" : "space-y-4")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {getDiscoveryByline(tenant)}
              </div>
              {isBusinessCard ? (
                <>
                  <h3 className="mt-2 line-clamp-1 text-lg font-black tracking-tight text-slate-950">
                    {tenant.name || getDiscoveryItemTitle(tenant)}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                    {getDiscoveryItemTitle(tenant)}
                  </p>
                </>
              ) : (
                <h3 className="mt-2 line-clamp-2 text-lg font-black tracking-tight text-slate-950">
                  {getDiscoveryItemTitle(tenant)}
                </h3>
              )}
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {formatStartingPrice(tenant.starting_price)}
            </span>
          </div>

          {!isBusinessCard ? (
            <p className="line-clamp-3 text-sm leading-6 text-slate-600">
              {getDiscoveryItemSummary(tenant)}
            </p>
          ) : null}

          <div className={cn(
            "rounded-2xl px-3 py-3 text-[11px] font-semibold text-slate-600",
            toneClasses.meta,
            isBusinessCard ? "flex items-center justify-between gap-3" : "grid gap-2",
          )}>
            {isBusinessCard ? (
              <>
                <span className="truncate">{getDiscoveryItemLabel(tenant)}</span>
                <span className="shrink-0 uppercase tracking-[0.12em] text-slate-500">
                  {stat}
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-blue-600" />
                  {meta}
                </span>
                <div className="flex items-center justify-between gap-3 uppercase tracking-[0.12em] text-slate-500">
                  <span>{stat}</span>
                  <span>{getDiscoverySurfaceLabel(tenant)}</span>
                </div>
              </>
            )}
          </div>

          {!isBusinessCard ? (
            <div className="flex flex-wrap gap-2">
              {getDiscoveryItemBadges(tenant).slice(0, 2).map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          <Button
            asChild
            className="h-11 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-900"
          >
            <a href={href} onClick={onClick}>
              {ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DiscoveryCompactCard({
  tenant,
  href,
  ctaLabel,
  summary,
  footer,
  onVisible,
  onClick,
}: {
  tenant: DiscoveryTenant;
  href: string;
  ctaLabel: string;
  summary: string;
  footer: string;
  onVisible?: () => void;
  onClick?: () => void;
}) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    onVisible?.();
  }, [onVisible]);

  return (
    <Card className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <CardContent className="space-y-4 p-0">
        <div
          className="h-36 bg-cover bg-center"
          style={{
            backgroundImage: getDiscoveryItemImage(tenant)
              ? `url(${getDiscoveryItemImage(tenant)})`
              : "linear-gradient(135deg, rgba(13,31,39,0.92), rgba(59,130,246,0.72))",
          }}
        />
        <div className="space-y-3 px-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge className="rounded-full bg-slate-100 text-slate-700">
                {getDiscoverySurfaceLabel(tenant)}
              </Badge>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {getDiscoveryByline(tenant)}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {formatStartingPrice(tenant.starting_price)}
            </span>
          </div>

          <div>
            <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-slate-950">
              {getDiscoveryItemTitle(tenant)}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
              {summary}
            </p>
          </div>

          <div className="rounded-[1.25rem] bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            {footer}
          </div>

          <Button asChild className="h-11 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
            <a href={href} onClick={onClick}>
              {ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoveryTypeChip({ tenant }: { tenant: DiscoveryTenant }) {
  const cardKind = getDiscoveryCardKind(tenant);

  if (tenant.item_kind !== "post") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
        <Store className="h-3.5 w-3.5" />
        Bisnis
      </span>
    );
  }

  if (cardKind === "video") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
        <PlayCircle className="h-3.5 w-3.5" />
        {formatDiscoveryDuration(tenant.post_duration_seconds) || "Video"}
      </span>
    );
  }

  if (cardKind === "promo") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-950">
        <Megaphone className="h-3.5 w-3.5" />
        Promo
      </span>
    );
  }

  if (cardKind === "photo") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-900">
        <Camera className="h-3.5 w-3.5" />
        Foto
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
      <TrendingUp className="h-3.5 w-3.5" />
      Sorotan
    </span>
  );
}
