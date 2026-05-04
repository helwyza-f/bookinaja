export type BuilderSectionType =
  | "hero"
  | "highlights"
  | "catalog"
  | "gallery"
  | "testimonials"
  | "faq"
  | "about"
  | "contact"
  | "booking_form";

export type BuilderSection = {
  id: string;
  type: BuilderSectionType;
  label: string;
  enabled: boolean;
  variant?: string;
  props?: Record<string, unknown>;
};

export type LandingPageConfig = {
  version: number;
  sections: BuilderSection[];
};

export type LandingThemeConfig = {
  preset: string;
  primary_color: string;
  accent_color: string;
  surface_style: string;
  font_style: string;
  radius_style: string;
};

export type BookingFormConfig = {
  cta_button_label: string;
  sticky_mobile_cta: boolean;
  show_whatsapp_help: boolean;
  whatsapp_label: string;
};

export type BuilderProfile = {
  id?: string;
  name: string;
  slug: string;
  business_category?: string;
  business_type?: string;
  slogan?: string;
  tagline?: string;
  about_us?: string;
  features?: string[];
  address?: string;
  open_time?: string;
  close_time?: string;
  primary_color?: string;
  logo_url?: string;
  banner_url?: string;
  gallery?: string[];
  instagram_url?: string;
  tiktok_url?: string;
  whatsapp_number?: string;
  map_iframe_url?: string;
  meta_title?: string;
  meta_description?: string;
  landing_page_config?: LandingPageConfig;
  landing_theme_config?: LandingThemeConfig;
  booking_form_config?: BookingFormConfig;
};

export type BuilderResourceItem = {
  id: string;
  name: string;
  item_type: string;
  price: number;
  price_unit?: string;
  unit_duration?: number;
};

export type BuilderResource = {
  id: string;
  name: string;
  category?: string;
  description?: string;
  image_url?: string;
  items?: BuilderResourceItem[];
};

type FallbackAsset = {
  banner: string;
  tagline: string;
  copy: string;
  features: string[];
};

const FALLBACK_ASSETS: Record<string, FallbackAsset> = {
  gaming_hub: {
    banner:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070",
    tagline: "Arena Pro Player",
    copy: "Hardware spesifikasi tinggi dengan koneksi ultra stabil.",
    features: [
      "RTX 4090 Ready",
      "Internet 1Gbps",
      "Pro Peripherals",
      "240Hz Monitor",
    ],
  },
  creative_space: {
    banner:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070",
    tagline: "Unlimited Creativity",
    copy: "Ruang estetik dengan pencahayaan profesional.",
    features: [
      "Pro Lighting",
      "Set Aesthetic",
      "High-End Camera",
      "Private Studio",
    ],
  },
  sport_center: {
    banner:
      "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2070",
    tagline: "World Class Facility",
    copy: "Fasilitas olahraga standar internasional.",
    features: ["Vinyl Court", "Locker Room", "Standard Inter", "Training Gear"],
  },
  social_space: {
    banner:
      "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?q=80&w=2070",
    tagline: "Elite Collaboration",
    copy: "Lingkungan produktif yang homey dan nyaman.",
    features: ["Fast Wi-Fi", "Free Coffee", "Focus Zone", "Meeting Room"],
  },
};

export const DEFAULT_PAGE_BUILDER_CONFIG: LandingPageConfig = {
  version: 1,
  sections: [
    {
      id: "hero",
      type: "hero",
      label: "Hero",
      enabled: true,
      variant: "immersive",
      props: {
        description: "Kelola tampilan halaman publik yang lebih sesuai dengan karakter bisnis kamu.",
      },
    },
    {
      id: "highlights",
      type: "highlights",
      label: "Keunggulan",
      enabled: true,
      variant: "pills",
      props: {
        title: "Keunggulan utama",
      },
    },
    {
      id: "catalog",
      type: "catalog",
      label: "Katalog",
      enabled: true,
      variant: "cards",
      props: {
        title: "Pilih layanan",
        description: "Tampilkan resource, paket, atau unit yang paling relevan untuk customer.",
      },
    },
    {
      id: "gallery",
      type: "gallery",
      label: "Galeri",
      enabled: true,
      variant: "bento",
      props: {
        eyebrow: "Visual Experience",
        title: "Inside The Hub.",
        description: "Tampilkan suasana, setup, dan detail bisnis dari sudut terbaik.",
      },
    },
    {
      id: "testimonials",
      type: "testimonials",
      label: "Testimoni",
      enabled: false,
      variant: "cards",
      props: {
        title: "Kata pelanggan",
        items: [
          { name: "Customer pertama", quote: "Proses booking rapi dan respons tim cepat." },
          { name: "Customer kedua", quote: "Lokasi enak dicari dan cocok untuk repeat booking." },
        ],
      },
    },
    {
      id: "faq",
      type: "faq",
      label: "FAQ",
      enabled: false,
      variant: "accordion",
      props: {
        title: "Pertanyaan yang sering muncul",
        items: [
          { question: "Bagaimana cara booking?", answer: "Pilih resource, tentukan jadwal, lalu lanjutkan checkout." },
          { question: "Bisa hubungi WhatsApp?", answer: "Bisa. Tombol WhatsApp akan tampil jika nomor bisnis sudah diisi." },
        ],
      },
    },
    {
      id: "about",
      type: "about",
      label: "Tentang Bisnis",
      enabled: true,
      variant: "split",
      props: {
        title: "Tentang bisnis ini",
      },
    },
    {
      id: "contact",
      type: "contact",
      label: "Kontak & Lokasi",
      enabled: true,
      variant: "panel",
      props: {
        title: "Hubungi bisnis",
        description: "Tampilkan lokasi, jam operasional, dan tombol WhatsApp.",
      },
    },
    {
      id: "booking_form",
      type: "booking_form",
      label: "Form Booking",
      enabled: true,
      variant: "sticky_cta",
      props: {
        title: "Arahkan customer ke booking",
        description: "Gunakan tombol ini untuk membawa customer langsung ke katalog atau kanal bantuan tercepat.",
      },
    },
  ],
};

export const DEFAULT_THEME_CONFIG: LandingThemeConfig = {
  preset: "bookinaja-classic",
  primary_color: "#3b82f6",
  accent_color: "#0f1f4a",
  surface_style: "soft",
  font_style: "bold",
  radius_style: "rounded",
};

export const DEFAULT_BOOKING_FORM_CONFIG: BookingFormConfig = {
  cta_button_label: "Cek Ketersediaan",
  sticky_mobile_cta: true,
  show_whatsapp_help: true,
  whatsapp_label: "Butuh bantuan cepat? Chat WhatsApp",
};

export function normalizePageBuilderConfig(input?: Partial<LandingPageConfig> | null) {
  return {
    version: input?.version || DEFAULT_PAGE_BUILDER_CONFIG.version,
    sections:
      input?.sections && input.sections.length
        ? input.sections.map((section) => ({
            ...section,
            enabled: section.enabled !== false,
            props: section.props || {},
          }))
        : DEFAULT_PAGE_BUILDER_CONFIG.sections.map((section) => ({
            ...section,
            props: section.props ? structuredClone(section.props) : {},
          })),
  } satisfies LandingPageConfig;
}

export function normalizeThemeConfig(input?: Partial<LandingThemeConfig> | null, primaryColor?: string) {
  return {
    ...DEFAULT_THEME_CONFIG,
    ...input,
    primary_color: input?.primary_color || primaryColor || DEFAULT_THEME_CONFIG.primary_color,
  } satisfies LandingThemeConfig;
}

export function normalizeBookingFormConfig(input?: Partial<BookingFormConfig> | null) {
  return {
    ...DEFAULT_BOOKING_FORM_CONFIG,
    ...input,
  } satisfies BookingFormConfig;
}

export function enrichBuilderProfile(profile: BuilderProfile): BuilderProfile {
  const fallback =
    FALLBACK_ASSETS[profile.business_category || "gaming_hub"] || FALLBACK_ASSETS.gaming_hub;

  return {
    ...profile,
    banner_url: profile.banner_url || fallback.banner,
    tagline: profile.tagline || fallback.tagline,
    about_us: profile.about_us || fallback.copy,
    features: profile.features?.length ? profile.features : fallback.features,
  };
}
