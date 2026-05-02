import { getTenantUrl } from "@/lib/tenant";

export type DiscoveryTenant = {
  id: string;
  item_kind?: "tenant" | "post";
  tenant_id?: string;
  name: string;
  slug: string;
  business_category?: string;
  business_type?: string;
  tagline?: string;
  slogan?: string;
  about_us?: string;
  primary_color?: string;
  logo_url?: string;
  banner_url?: string;
  open_time?: string;
  close_time?: string;
  resource_count?: number;
  starting_price?: number;
  top_resource_name?: string;
  top_resource_type?: string;
  discovery_headline?: string;
  discovery_subheadline?: string;
  discovery_tags?: string[];
  discovery_badges?: string[];
  promo_label?: string;
  featured_image_url?: string;
  highlight_copy?: string;
  discovery_featured?: boolean;
  discovery_promoted?: boolean;
  discovery_priority?: number;
  promo_starts_at?: string | null;
  promo_ends_at?: string | null;
  discovery_impressions_30d?: number;
  discovery_clicks_30d?: number;
  discovery_ctr_30d?: number;
  featured_reason?: string;
  availability_hint?: string;
  recommendation_reason?: string;
  personalization_score?: number;
  is_featured?: boolean;
  is_new?: boolean;
  is_promoted?: boolean;
  feed_title?: string;
  feed_summary?: string;
  feed_image_url?: string;
  feed_label?: string;
  feed_reason?: string;
  feed_tags?: string[];
  feed_badges?: string[];
  feed_cta?: string;
  feed_score?: number;
  post_id?: string;
  post_type?: string;
  post_status?: string;
  post_visibility?: string;
  post_caption?: string;
  post_cover_media_url?: string;
  post_thumbnail_url?: string;
  post_poster_url?: string;
  post_mime_type?: string;
  post_stream_url_hls?: string;
  post_duration_seconds?: number;
  post_width?: number;
  post_height?: number;
  post_detail_views_7d?: number;
  post_tenant_opens_7d?: number;
  post_related_clicks_7d?: number;
  post_related_tenant_opens_7d?: number;
  post_booking_starts_7d?: number;
  post_published_at?: string | null;
};

export type PostMediaMetadata = {
  duration_seconds?: number;
  poster_url?: string;
  mime_type?: string;
  width?: number;
  height?: number;
  stream_url_hls?: string;
};

export type DiscoverySection = {
  id: string;
  title: string;
  description: string;
  style: string;
  items: DiscoveryTenant[];
};

export type DiscoveryFeedResponse = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    search_hint: string;
  };
  quick_categories: string[];
  featured: DiscoveryTenant[];
  sections: DiscoverySection[];
  personalized?: boolean;
};

export type DiscoveryPostDetailResponse = {
  item: DiscoveryTenant;
  tenant: DiscoveryTenant;
  related: DiscoveryTenant[];
};

export const formatStartingPrice = (value?: number) => {
  if (!value || value <= 0) return "Cek tenant";
  return `Mulai Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
};

export const getDiscoveryCategoryLabel = (tenant: DiscoveryTenant) =>
  tenant.business_category || tenant.business_type || "Bisnis";

export const getDiscoveryItemTitle = (item: DiscoveryTenant) =>
  item.feed_title || item.discovery_headline || item.name;

export const getDiscoveryItemSummary = (item: DiscoveryTenant) =>
  item.feed_summary ||
  item.highlight_copy ||
  item.discovery_subheadline ||
  item.tagline ||
  item.about_us ||
  "Belum ada ringkasan singkat.";

export const getDiscoveryItemImage = (item: DiscoveryTenant) =>
  item.post_poster_url ||
  item.post_thumbnail_url ||
  (isDiscoveryVideoPost(item) ? "" : item.feed_image_url) ||
  item.featured_image_url ||
  item.banner_url ||
  item.logo_url ||
  "";

export const getDiscoveryItemLabel = (item: DiscoveryTenant) =>
  item.feed_label || item.promo_label || getDiscoveryCategoryLabel(item);

export const getDiscoveryItemReason = (item: DiscoveryTenant) =>
  item.feed_reason || item.recommendation_reason || item.featured_reason || item.availability_hint || "";

export const getDiscoveryItemBadges = (item: DiscoveryTenant) =>
  (item.feed_badges && item.feed_badges.length > 0
    ? item.feed_badges
    : item.discovery_badges?.length
      ? item.discovery_badges
      : item.discovery_tags) || [];

export const getDiscoveryItemTags = (item: DiscoveryTenant) =>
  (item.feed_tags && item.feed_tags.length > 0 ? item.feed_tags : item.discovery_tags) || [];

export const getDiscoveryItemCta = (item: DiscoveryTenant) =>
  item.feed_cta || (item.item_kind === "post" ? "Lihat postingan" : "Lihat bisnis");

export const isDiscoveryVideoPost = (item: DiscoveryTenant) =>
  item.item_kind === "post" && item.post_type === "video";

export const isDiscoveryPromoPost = (item: DiscoveryTenant) =>
  item.item_kind === "post" && item.post_type === "promo";

export const isDiscoveryPhotoPost = (item: DiscoveryTenant) =>
  item.item_kind === "post" && (item.post_type === "photo" || item.post_type === "update");

export const getDiscoveryCardKind = (item: DiscoveryTenant) => {
  if (isDiscoveryVideoPost(item)) return "video";
  if (isDiscoveryPromoPost(item)) return "promo";
  if (isDiscoveryPhotoPost(item)) return "photo";
  return "tenant";
};

export const formatDiscoveryDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${secs} dtk`;
  return secs > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${mins} mnt`;
};

export const getDiscoveryVideoPlaybackUrl = (item: DiscoveryTenant) =>
  item.post_stream_url_hls || item.post_cover_media_url || item.feed_image_url || "";

export const getDiscoveryMediaAccent = (item: DiscoveryTenant) => {
  if (isDiscoveryPromoPost(item)) return "amber";
  if (isDiscoveryVideoPost(item)) return "slate";
  if (isDiscoveryPhotoPost(item)) return "blue";
  return "blue";
};

export const isLikelyVideoUrl = (value?: string | null) => {
  if (!value) return false;
  const normalized = value.toLowerCase().split("?")[0];
  return (
    normalized.endsWith(".mp4") ||
    normalized.endsWith(".webm") ||
    normalized.endsWith(".mov") ||
    normalized.endsWith(".m3u8")
  );
};

export const getDiscoveryItemHref = (item: DiscoveryTenant) =>
  item.item_kind === "post" && item.post_id ? `/discovery/${item.post_id}` : null;

export const getDiscoveryTenantHrefFromPost = (item: DiscoveryTenant) => {
  const base = getTenantUrl(item.slug);
  if (item.item_kind !== "post" || !item.post_id) return base;
  const params = new URLSearchParams({
    source_post: item.post_id,
    source_tenant: item.tenant_id || item.id,
    source_surface: "discover-post",
  });
  return `${base}?${params.toString()}`;
};

export const getDiscoveryEventMetadata = (item: DiscoveryTenant) => {
  const metadata: Record<string, unknown> = {
    item_kind: item.item_kind || "tenant",
    item_id: item.id,
  };
  if (item.post_id) {
    metadata.post_id = item.post_id;
  }
  if (item.post_type) {
    metadata.post_type = item.post_type;
  }
  return metadata;
};

export const bookinajaDiscoveryTheme = {
  pageBg: "bg-slate-50",
  pageGlow:
    "bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(96,165,250,0.24),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.55),transparent)]",
  heroBg:
    "bg-[linear-gradient(135deg,#0f1f4a_0%,#1d4ed8_52%,#60a5fa_100%)]",
  heroBorder: "border-white/60",
  accentText: "text-blue-600",
  accentSoft: "bg-blue-50 text-blue-700",
  accentStrong: "bg-blue-600 text-white",
  cardBorder: "border-blue-100",
  cardBg: "bg-white",
  mutedText: "text-slate-500",
};

export const scoreDiscoveryTenant = (tenant: DiscoveryTenant, query = "") => {
  const q = query.trim().toLowerCase();
  const textPool = [
    tenant.name,
    tenant.feed_title,
    tenant.feed_summary,
    tenant.discovery_headline,
    tenant.discovery_subheadline,
    tenant.business_category,
    tenant.business_type,
    ...(tenant.feed_tags || []),
    ...(tenant.feed_badges || []),
    ...(tenant.discovery_tags || []),
    ...(tenant.discovery_badges || []),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  const queryBoost =
    q.length === 0
      ? 0
      : textPool.some((value) => value.includes(q))
        ? 20
        : -100;

  const editorialScore =
    (tenant.discovery_priority || 0) * 8 +
    (tenant.discovery_featured || tenant.is_featured ? 28 : 0) +
    (tenant.discovery_promoted || tenant.is_promoted ? 18 : 0);

  const momentumScore =
    Math.min(tenant.discovery_clicks_30d || 0, 20) * 3 +
    Math.min(Math.round(tenant.discovery_ctr_30d || 0), 12) * 2 +
    Math.min(Math.round((tenant.discovery_impressions_30d || 0) / 10), 8);

  const qualityScore =
    ((tenant.featured_image_url || tenant.banner_url) ? 10 : 0) +
    (tenant.logo_url ? 6 : 0) +
    (tenant.resource_count && tenant.resource_count >= 3 ? 8 : 0) +
    (tenant.resource_count && tenant.resource_count >= 6 ? 5 : 0) +
    ((tenant.discovery_tags || []).length >= 2 ? 4 : 0) +
    ((tenant.discovery_badges || []).length >= 1 ? 4 : 0);

  const freshnessScore = tenant.is_new ? 14 : 0;
  const postScore =
    tenant.item_kind === "post"
      ? 14 +
        (tenant.post_type === "video" ? 8 : tenant.post_type === "promo" ? 6 : 4) +
        (tenant.post_published_at ? 8 : 0)
      : 0;

  return editorialScore + momentumScore + qualityScore + freshnessScore + postScore + queryBoost;
};
