export type DiscoveryTenant = {
  id: string;
  item_kind?: "tenant" | "post";
  tenant_id?: string;
  name: string;
  slug: string;
  business_category?: string;
  business_type?: string;
  tagline?: string;
  about_us?: string;
  starting_price?: number;
  resource_count?: number;
  featured_image_url?: string;
  banner_url?: string;
  promo_label?: string;
  feed_title?: string;
  feed_summary?: string;
  feed_badges?: string[];
  discovery_tags?: string[];
  post_id?: string;
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

export function getDiscoverySummary(item: DiscoveryTenant) {
  return item.feed_summary || item.tagline || item.about_us || "Buka detail bisnis untuk lihat konteks booking.";
}

export function getDiscoveryTitle(item: DiscoveryTenant) {
  return item.feed_title || item.name;
}
