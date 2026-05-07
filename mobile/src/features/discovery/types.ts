export type DiscoveryTenant = {
  id: string;
  item_kind?: "tenant" | "post";
  tenant_id?: string;
  name: string;
  slug: string;
  business_category?: string;
  business_type?: string;
  tagline?: string;
  primary_color?: string;
  banner_url?: string;
  logo_url?: string;
  starting_price?: number;
  top_resource_name?: string;
  featured_image_url?: string;
  promo_label?: string;
  feed_title?: string;
  feed_summary?: string;
  feed_image_url?: string;
  feed_label?: string;
  feed_reason?: string;
  post_id?: string;
  post_type?: string;
};

export type DiscoverySection = {
  id: string;
  title: string;
  description: string;
  style: string;
  items: DiscoveryTenant[];
};

export type DiscoveryFeed = {
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

export type TenantDirectoryItem = {
  id: string;
  name: string;
  slug: string;
  business_category?: string;
  business_type?: string;
  tagline?: string;
  primary_color?: string;
  logo_url?: string;
  banner_url?: string;
  starting_price?: number;
  top_resource_name?: string;
  promo_label?: string;
};
