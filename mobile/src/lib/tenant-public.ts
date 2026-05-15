export type PublicTenantProfile = {
  id: string;
  name: string;
  slug: string;
  business_category?: string;
  business_type?: string;
  slogan?: string;
  tagline?: string;
  about_us?: string;
  features?: string[];
  primary_color?: string;
  logo_url?: string;
  banner_url?: string;
  gallery?: string[];
  address?: string;
  whatsapp_number?: string;
  instagram_url?: string;
  tiktok_url?: string;
  open_time?: string;
  close_time?: string;
  timezone?: string;
};

export type PublicTenantResourcesResponse = {
  business_category?: string;
  business_type?: string;
  resources: PublicTenantResource[];
};

export type PublicTenantResource = {
  id: string;
  name: string;
  category?: string;
  operating_mode?: string;
  description?: string;
  image_url?: string;
  starting_price?: number;
  starting_price_unit?: string;
  primary_offer_name?: string;
  primary_offer_price?: number;
  primary_offer_unit?: string;
  primary_offer_duration?: number;
};
