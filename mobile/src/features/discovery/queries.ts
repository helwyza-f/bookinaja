import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import type { DiscoveryFeed, TenantDirectoryItem } from "./types";

export const discoveryKeys = {
  feed: ["discovery", "feed"] as const,
  tenants: ["discovery", "tenants"] as const,
};

export function useDiscoveryFeedQuery() {
  return useQuery({
    queryKey: discoveryKeys.feed,
    queryFn: () => apiRequest<DiscoveryFeed>("/public/discover/feed"),
  });
}

export function usePublicTenantsQuery() {
  return useQuery({
    queryKey: discoveryKeys.tenants,
    queryFn: async () => {
      const response = await apiRequest<{ items: TenantDirectoryItem[] }>("/public/tenants");
      return response.items || [];
    },
  });
}
