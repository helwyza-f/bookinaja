import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import type {
  BusySlot,
  PublicResource,
  PublicResourcesResponse,
  TenantLandingPayload,
  TenantProfile,
} from "./types";

export const tenantKeys = {
  profile: (slug: string) => ["tenant", "profile", slug] as const,
  resources: (slug: string) => ["tenant", "resources", slug] as const,
  landing: (slug: string) => ["tenant", "landing", slug] as const,
  resource: (id: string, slug: string) => ["tenant", "resource", slug, id] as const,
  availability: (resourceId: string, date: string) => ["tenant", "availability", resourceId, date] as const,
};

export function useTenantProfileQuery(slug: string) {
  return useQuery({
    queryKey: tenantKeys.profile(slug),
    queryFn: () =>
      apiRequest<TenantProfile>("/public/profile", {
        query: { slug },
      }),
    enabled: Boolean(slug),
  });
}

export function useTenantResourcesQuery(slug: string) {
  return useQuery({
    queryKey: tenantKeys.resources(slug),
    queryFn: () =>
      apiRequest<PublicResourcesResponse>("/public/resources", {
        query: { slug },
      }),
    enabled: Boolean(slug),
  });
}

export function useTenantLandingQuery(slug: string) {
  return useQuery({
    queryKey: tenantKeys.landing(slug),
    queryFn: async () => {
      const [profile, resourceResponse] = await Promise.all([
        apiRequest<TenantProfile>("/public/profile", { query: { slug } }),
        apiRequest<PublicResourcesResponse>("/public/resources", { query: { slug } }),
      ]);

      const payload: TenantLandingPayload = {
        profile,
        resources: resourceResponse.resources || [],
      };

      return payload;
    },
    enabled: Boolean(slug),
  });
}

export function usePublicResourceDetailQuery(slug: string, id: string) {
  return useQuery({
    queryKey: tenantKeys.resource(id, slug),
    queryFn: () =>
      apiRequest<PublicResource>(`/public/resources/${id}`, {
        query: { slug },
      }),
    enabled: Boolean(slug && id),
  });
}

export function useGuestAvailabilityQuery(resourceId: string, date: string, enabled = true) {
  return useQuery({
    queryKey: tenantKeys.availability(resourceId, date),
    queryFn: async () => {
      const response = await apiRequest<{ busy_slots: BusySlot[] }>(`/guest/availability/${resourceId}`, {
        query: { date },
      });
      return response.busy_slots || [];
    },
    enabled: enabled && Boolean(resourceId && date),
  });
}
