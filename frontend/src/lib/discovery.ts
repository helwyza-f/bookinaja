export type DiscoveryTenant = {
  id: string;
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
  is_featured?: boolean;
  is_new?: boolean;
  is_promoted?: boolean;
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
};

export const formatStartingPrice = (value?: number) => {
  if (!value || value <= 0) return "Cek tenant";
  return `Mulai Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
};

export const getDiscoveryCategoryLabel = (tenant: DiscoveryTenant) =>
  tenant.business_category || tenant.business_type || "Bisnis";

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
    tenant.discovery_headline,
    tenant.discovery_subheadline,
    tenant.business_category,
    tenant.business_type,
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

  return editorialScore + momentumScore + qualityScore + freshnessScore + queryBoost;
};
