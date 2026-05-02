"use client";

import type { TenantProfile } from "../../admin/(internal)/settings/bisnis/sections/types";
import {
  getDiscoveryItemLabel,
  getDiscoveryItemReason,
  getDiscoveryItemSummary,
  getDiscoveryItemTitle,
  type PostMediaMetadata,
  type DiscoveryFeedResponse,
  type DiscoveryTenant,
} from "@/lib/discovery";

export type GrowthPostRecord = {
  id: string;
  tenant_id: string;
  type: string;
  title: string;
  caption: string;
  cover_media_url: string;
  thumbnail_url: string;
  cta: string;
  status: string;
  visibility: string;
  starts_at?: string | null;
  ends_at?: string | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  metadata?: PostMediaMetadata | null;
  impressions_7d?: number;
  clicks_7d?: number;
  ctr_7d?: number;
  detail_views_7d?: number;
  tenant_opens_7d?: number;
  related_clicks_7d?: number;
  related_tenant_opens_7d?: number;
  booking_starts_7d?: number;
  last_interaction_at?: string | null;
};

export type GrowthPostDraft = {
  id: string;
  title: string;
  type: "Photo" | "Video" | "Promo" | "Update";
  status: "Draft" | "Scheduled" | "Published";
  caption: string;
  thumb?: string;
  performanceLabel: string;
};

export type GrowthFeedEntry = {
  id: string;
  item: DiscoveryTenant;
  lane: "feature" | "standard" | "compact";
  sectionId: string;
  sectionTitle: string;
  kicker: string;
  headline: string;
  summary: string;
  mediaLabel: "Foto" | "Video" | "Promo" | "Highlight";
  momentumLabel: string;
};

export function buildGrowthPostDrafts(
  profile: TenantProfile,
  marketplaceFeed: DiscoveryFeedResponse | null,
  posts: GrowthPostRecord[] = [],
): GrowthPostDraft[] {
  if (posts.length > 0) {
    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      type:
        post.type === "video"
          ? "Video"
          : post.type === "promo"
            ? "Promo"
            : post.type === "update"
              ? "Update"
              : "Photo",
      status:
        post.status === "published"
          ? "Published"
          : post.status === "scheduled"
            ? "Scheduled"
            : "Draft",
      caption: post.caption || "Belum ada caption singkat.",
      thumb: post.thumbnail_url || post.cover_media_url,
      performanceLabel:
        post.status === "published"
          ? "Sudah tayang"
          : post.status === "scheduled"
            ? "Dijadwalkan tayang"
            : "Masih draft",
    }));
  }

  const cover = profile.featured_image_url || profile.banner_url || "";
  const label = profile.promo_label || "Update";
  const titleBase = profile.name || "Bisnis";

  return [
    {
      id: "profile-highlight",
      title: `${titleBase} - Highlight utama`,
      type: "Photo",
      status: profile.discovery_headline ? "Published" : "Draft",
      caption:
        profile.highlight_copy ||
        profile.discovery_subheadline ||
        "Ringkasan singkat yang membantu customer paham kenapa bisnis ini layak dicoba.",
      thumb: cover,
      performanceLabel: profile.discovery_headline ? "Dipakai di discovery card" : "Belum aktif",
    },
    {
      id: "promo-window",
      title: `${label} - momentum feed`,
      type: "Promo",
      status: profile.promo_label ? "Scheduled" : "Draft",
      caption:
        profile.promo_label
          ? `Label ${profile.promo_label} siap dipakai sebagai tema post atau campaign.`
          : "Tambahkan label pendek untuk menyiapkan angle promo atau momentum yang ingin didorong.",
      thumb: cover,
      performanceLabel: "Siap dijadikan post promo",
    },
    {
      id: "marketplace-inspo",
      title: "Konten inspirasi berikutnya",
      type: "Video",
      status: "Draft",
      caption:
        marketplaceFeed?.featured?.[0]?.highlight_copy ||
        marketplaceFeed?.featured?.[0]?.discovery_headline ||
        "Ambil angle dari feed teratas: tunjukkan suasana, manfaat, atau momen terbaik bisnis kamu.",
      thumb: marketplaceFeed?.featured?.[0]?.featured_image_url || marketplaceFeed?.featured?.[0]?.banner_url,
      performanceLabel: "Disarankan untuk feed berikutnya",
    },
  ];
}

export function getMarketplaceSamples(feed: DiscoveryFeedResponse | null, take = 6) {
  if (!feed) return [] as DiscoveryTenant[];
  const map = new Map<string, DiscoveryTenant>();
  [...feed.featured, ...feed.sections.flatMap((section) => section.items)].forEach((item) => {
    map.set(item.id, item);
  });
  return Array.from(map.values()).slice(0, take);
}

export function getMarketplaceFeedEntries(
  feed: DiscoveryFeedResponse | null,
  take = 18,
): GrowthFeedEntry[] {
  if (!feed) return [];

  const entries: GrowthFeedEntry[] = [];
  const seen = new Set<string>();

  const pushEntry = (
    item: DiscoveryTenant,
    sectionId: string,
    sectionTitle: string,
    index: number,
    preferredLane?: GrowthFeedEntry["lane"],
  ) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);

    const lane =
      preferredLane ||
      (index % 5 === 0 ? "feature" : index % 2 === 0 ? "standard" : "compact");

    entries.push({
      id: `${sectionId}-${item.id}`,
      item,
      lane,
      sectionId,
      sectionTitle,
      kicker: getDiscoveryItemLabel(item) || sectionTitle,
      headline: getDiscoveryItemTitle(item),
      summary: getDiscoveryItemSummary(item),
      mediaLabel: item.item_kind === "post"
        ? item.post_type === "video"
          ? "Video"
          : item.post_type === "promo"
          ? "Promo"
          : "Foto"
        : item.is_promoted || item.discovery_promoted
        ? "Promo"
        : item.featured_image_url || item.banner_url
          ? "Foto"
          : "Highlight",
      momentumLabel:
        getDiscoveryItemReason(item) || "Sedang tampil di feed Bookinaja",
    });
  };

  feed.featured.forEach((item, index) => {
    pushEntry(item, "featured", "Pilihan Utama", index, index === 0 ? "feature" : "standard");
  });

  feed.sections.forEach((section) => {
    section.items.forEach((item, index) => {
      pushEntry(item, section.id, section.title, index);
    });
  });

  return entries.slice(0, take);
}

export function getGrowthHealth(profile: TenantProfile) {
  const hasHeadline = Boolean(profile.discovery_headline?.trim());
  const hasImage = Boolean((profile.featured_image_url || profile.banner_url)?.trim());
  const tagCount = (profile.discovery_tags || []).length;
  const badgeCount = (profile.discovery_badges || []).length;

  const score =
    (hasHeadline ? 30 : 0) +
    (hasImage ? 30 : 0) +
    Math.min(tagCount, 3) * 10 +
    Math.min(badgeCount, 2) * 5 +
    (profile.highlight_copy?.trim() ? 15 : 0);

  return {
    score,
    headlineReady: hasHeadline,
    imageReady: hasImage,
    tagCount,
    badgeCount,
  };
}
