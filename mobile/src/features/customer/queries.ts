import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session-store";
import type { CustomerBookingDetail, CustomerDashboard } from "./types";

export const customerKeys = {
  dashboard: ["customer", "dashboard"] as const,
  bookingDetail: (bookingId: string) => ["customer", "booking", bookingId] as const,
  bookingContext: (bookingId: string) =>
    ["customer", "booking", bookingId, "context"] as const,
  bookingFnb: (bookingId: string) => ["customer", "booking", bookingId, "fnb"] as const,
};

export function useCustomerDashboardQuery(enabled = true) {
  const token = useSessionStore((state) => state.token);
  const role = useSessionStore((state) => state.role);

  return useQuery({
    queryKey: customerKeys.dashboard,
    queryFn: () => apiRequest<CustomerDashboard>("/user/me"),
    enabled: enabled && role === "customer" && Boolean(token),
  });
}

export function useCustomerBookingDetailQuery(bookingId: string, enabled = true) {
  const token = useSessionStore((state) => state.token);
  const role = useSessionStore((state) => state.role);
  const setTenantContext = useSessionStore((state) => state.setTenantContext);

  const query = useQuery<CustomerBookingDetail>({
    queryKey: customerKeys.bookingDetail(bookingId),
    queryFn: () => apiRequest<CustomerBookingDetail>(`/user/me/bookings/${bookingId}`),
    enabled: enabled && role === "customer" && Boolean(token) && Boolean(bookingId),
  });

  useEffect(() => {
    if (!query.data) return;
    void setTenantContext({
      tenantSlug: query.data.tenant_slug || null,
      tenantId: query.data.tenant_id || null,
    });
  }, [query.data, setTenantContext]);

  return query;
}
