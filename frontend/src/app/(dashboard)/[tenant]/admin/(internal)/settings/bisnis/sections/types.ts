export type TenantProfile = {
  id?: string;
  name: string;
  slug: string;
  business_category?: string;
  business_type?: string;
  slogan: string;
  tagline: string;
  about_us: string;
  features: string[];
  address: string;
  open_time: string;
  close_time: string;
  primary_color: string;
  logo_url: string;
  banner_url: string;
  gallery: string[];
  instagram_url: string;
  tiktok_url: string;
  whatsapp_number: string;
  map_iframe_url: string;
  meta_title: string;
  meta_description: string;
  [key: string]: unknown;
};

export type SectionProps = {
  profile: TenantProfile;
  saving: boolean;
  onSave: (patch: Partial<TenantProfile>) => void;
};
