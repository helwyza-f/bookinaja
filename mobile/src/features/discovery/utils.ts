import type { DiscoveryTenant, TenantDirectoryItem } from "./types";

export function formatMoney(value?: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

export function getDiscoveryTitle(item: DiscoveryTenant | TenantDirectoryItem) {
  return "feed_title" in item && item.feed_title ? item.feed_title : item.name;
}

export function getDiscoverySummary(item: DiscoveryTenant | TenantDirectoryItem) {
  if ("feed_summary" in item && item.feed_summary) return item.feed_summary;
  return item.tagline || item.business_category || "Tempat booking yang siap dijelajahi";
}

export function getDiscoveryImage(item: DiscoveryTenant | TenantDirectoryItem) {
  if ("feed_image_url" in item && item.feed_image_url) return item.feed_image_url;
  if ("featured_image_url" in item && item.featured_image_url) return item.featured_image_url;
  return item.banner_url || item.logo_url || "";
}

export function getDiscoveryLabel(item: DiscoveryTenant | TenantDirectoryItem) {
  if ("feed_label" in item && item.feed_label) return item.feed_label;
  return item.business_category || item.business_type || "Tenant";
}
