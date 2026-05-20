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
  timezone: string;
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
  discovery_headline: string;
  discovery_subheadline: string;
  discovery_tags: string[];
  discovery_badges: string[];
  promo_label: string;
  featured_image_url: string;
  highlight_copy: string;
  discovery_featured: boolean;
  discovery_promoted: boolean;
  discovery_priority: number;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
  booking_form_config?: {
    cta_button_label?: string;
    sticky_mobile_cta?: boolean;
    show_whatsapp_help?: boolean;
    whatsapp_label?: string;
    controller_features?: {
      enable_fnb?: boolean;
      enable_addons?: boolean;
    };
  };
  [key: string]: unknown;
};

export const defaultTenantProfile: TenantProfile = {
  name: "",
  slug: "",
  slogan: "",
  tagline: "",
  about_us: "",
  features: [],
  address: "",
  open_time: "09:00",
  close_time: "21:00",
  timezone: "Asia/Jakarta",
  primary_color: "#3b82f6",
  logo_url: "",
  banner_url: "",
  instagram_url: "",
  tiktok_url: "",
  whatsapp_number: "",
  map_iframe_url: "",
  meta_title: "",
  meta_description: "",
  gallery: [],
  discovery_headline: "",
  discovery_subheadline: "",
  discovery_tags: [],
  discovery_badges: [],
  promo_label: "",
  featured_image_url: "",
  highlight_copy: "",
  discovery_featured: false,
  discovery_promoted: false,
  discovery_priority: 0,
  promo_starts_at: null,
  promo_ends_at: null,
  booking_form_config: {
    controller_features: {
      enable_fnb: true,
      enable_addons: true,
    },
  },
};

export type SectionProps = {
  profile: TenantProfile;
  saving: boolean;
  onSave: (patch: Partial<TenantProfile>) => void;
};
