import type { TenantDirectoryItem } from "@/features/discovery/types";

export type TenantProfile = {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  about_us?: string;
  logo_url?: string;
  banner_url?: string;
  primary_color?: string;
  open_time?: string;
  close_time?: string;
  business_category?: string;
  business_type?: string;
};

export type PublicResourceItem = {
  id: string;
  resource_id: string;
  name: string;
  price: number;
  price_unit: string;
  unit_duration: number;
  item_type: string;
  is_default: boolean;
};

export type BusySlot = {
  start_time: string;
  end_time: string;
};

export type PublicResource = {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  description?: string;
  image_url?: string;
  gallery?: string[];
  status?: string;
  items: PublicResourceItem[];
};

export type PublicResourcesResponse = {
  business_category?: string;
  business_type?: string;
  resources: PublicResource[];
};

export type TenantLandingPayload = {
  profile: TenantProfile;
  resources: PublicResource[];
};

export type TenantDirectoryCard = TenantDirectoryItem;
