"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  Eye,
  Flame,
  Image as ImageIcon,
  Megaphone,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatStartingPrice,
  getDiscoveryItemBadges,
  getDiscoveryItemCta,
  getDiscoveryItemImage,
  getDiscoveryItemLabel,
  getDiscoveryItemSummary,
  getDiscoveryItemTitle,
  type DiscoveryTenant,
} from "@/lib/discovery";
import { getTenantUrl } from "@/lib/tenant";
import type { GrowthFeedEntry, GrowthPostDraft } from "../_lib/growth-data";

export function MarketplaceFeedList({ entries }: { entries: GrowthFeedEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card className="rounded-[1.75rem] border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Feed Bookinaja belum ada. Nanti postingan dan tampilan tenant lain akan muncul di sini.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <MarketplaceFeedCard key={entry.id} entry={entry} index={index} />
      ))}
    </div>
  );
}

function MarketplaceFeedCard({
  entry,
  index,
}: {
  entry: GrowthFeedEntry;
  index: number;
}) {
  const item = entry.item;
  const tenant = item;
  const image = getDiscoveryItemImage(item);
  const cardMode = entry.lane;

  return (
    <Card className="overflow-hidden rounded-[1.75rem] border-slate-200 bg-white shadow-sm">
      <div
        className={
          cardMode === "feature"
            ? "grid gap-0 md:grid-cols-[minmax(0,1.15fr)_0.9fr]"
            : "grid gap-0 md:grid-cols-[280px_minmax(0,1fr)]"
        }
      >
        <div
          className={
            cardMode === "compact"
              ? "h-40 md:h-full"
              : "h-52 md:min-h-[260px]"
          }
          style={{
            backgroundImage: image
              ? `linear-gradient(180deg, rgba(2,6,23,0.04), rgba(2,6,23,0.18)), url(${image})`
              : "linear-gradient(135deg, rgba(15,31,74,0.96), rgba(59,130,246,0.68))",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="flex min-w-0 flex-col p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-blue-50 text-blue-700">
                {entry.kicker}
              </Badge>
              <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">
                {entry.mediaLabel}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {entry.sectionTitle}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-600">
                {formatStartingPrice(tenant.starting_price)}
              </div>
            </div>
          </div>

          <div className="mt-4 min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
              #{String(index + 1).padStart(2, "0")}
              <span className="text-slate-400">•</span>
              {tenant.name}
            </div>
            <h3
              className={
                cardMode === "feature"
                  ? "mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-[2rem] md:leading-[1.05]"
                  : "mt-3 text-xl font-black tracking-tight text-slate-950"
              }
            >
              {entry.headline}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600 md:text-[15px]">
              {entry.summary}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {getDiscoveryItemBadges(item)
              .slice(0, cardMode === "feature" ? 4 : 3)
              .map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700"
                >
                  {tag}
                </span>
              ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-[12px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-blue-600" />
              {tenant.discovery_clicks_30d || 0} klik / 30 hari
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-blue-600" />
              {tenant.discovery_impressions_30d || 0} tayang
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-blue-600" />
              {entry.momentumLabel}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="h-10 rounded-xl bg-blue-600 px-4 hover:bg-blue-500">
              <a href={getTenantUrl(tenant.slug)} target="_blank" rel="noreferrer">
                {getDiscoveryItemCta(item)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-xl px-4">
              <Link href="/growth/posts">Ambil inspirasi</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function InspirationRail({ items }: { items: DiscoveryTenant[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
      {items.map((item) => (
        <Card
          key={item.id}
          className="w-[248px] min-w-[248px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"
        >
          <div
            className="h-28 w-full bg-cover bg-center"
            style={{
              backgroundImage: getDiscoveryItemImage(item)
                ? `url(${getDiscoveryItemImage(item)})`
                : "linear-gradient(135deg, rgba(15,31,74,0.96), rgba(59,130,246,0.68))",
            }}
          />
          <div className="space-y-3 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <Badge className="rounded-full bg-blue-50 text-blue-700">
                {getDiscoveryItemLabel(item)}
              </Badge>
              <span className="text-[11px] font-semibold text-slate-500">
                {formatStartingPrice(item.starting_price)}
              </span>
            </div>
            <div>
              <div className="line-clamp-1 text-base font-black uppercase tracking-tight text-slate-950">
                {getDiscoveryItemTitle(item)}
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                {getDiscoveryItemSummary(item)}
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-blue-600" />
                {item.discovery_clicks_30d || 0} klik
              </span>
              <span>{item.resource_count || 0} resource</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function PostDraftList({ drafts }: { drafts: GrowthPostDraft[] }) {
  return (
    <div className="space-y-3">
      {drafts.map((draft) => (
        <Card key={draft.id} className="rounded-[1.5rem] border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div
              className="h-24 w-full rounded-[1.1rem] bg-cover bg-center sm:h-20 sm:w-28 sm:shrink-0"
              style={{
                backgroundImage: draft.thumb
                  ? `url(${draft.thumb})`
                  : "linear-gradient(135deg, rgba(15,31,74,0.96), rgba(59,130,246,0.68))",
              }}
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-blue-50 text-blue-700">{draft.type}</Badge>
                <Badge className="rounded-full bg-slate-100 text-slate-700">{draft.status}</Badge>
              </div>
              <div>
                <div className="text-base font-black tracking-tight text-slate-950">
                  {draft.title}
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-500">{draft.caption}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {draft.performanceLabel}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-9 rounded-xl px-3">
                    Edit
                  </Button>
                  <Button className="h-9 rounded-xl bg-blue-600 px-3 hover:bg-blue-500">
                    Jadikan post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function FeedIdeaCard({
  title,
  description,
  icon = "spark",
}: {
  title: string;
  description: string;
  icon?: "spark" | "video" | "reach";
}) {
  const Icon = icon === "video" ? PlayCircle : icon === "reach" ? BarChart3 : Sparkles;
  return (
    <Card className="rounded-[1.5rem] border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="mt-4 text-lg font-black tracking-tight text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
    </Card>
  );
}

export function WorkspaceEmptyLink() {
  return (
    <Button asChild variant="outline" className="rounded-xl">
      <Link href="/admin/settings/bisnis">Buka Konfigurasi Bisnis</Link>
    </Button>
  );
}

export function GrowthQuickActionCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: "presence" | "draft" | "tag";
}) {
  const Icon = icon === "draft" ? Megaphone : icon === "tag" ? ImageIcon : Sparkles;
  return (
    <Card className="rounded-[1.5rem] border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <div className="mt-3 text-2xl font-black tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{hint}</div>
    </Card>
  );
}
