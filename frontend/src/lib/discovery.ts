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
