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

function normalizeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeDashboard(data: CustomerDashboard): CustomerDashboard {
  return {
    ...data,
    active_bookings: normalizeArray(data.active_bookings),
    past_history: normalizeArray(data.past_history),
  };
}

function normalizeBookingDetail(data: CustomerBookingDetail): CustomerBookingDetail {
  return {
    ...data,
    payment_methods: normalizeArray(data.payment_methods),
    payment_attempts: normalizeArray(data.payment_attempts),
    options: normalizeArray(data.options),
    orders: normalizeArray(data.orders),
    events: normalizeArray(data.events),
  };
}

export function patchCustomerDashboardBooking(
  previous: CustomerDashboard | undefined,
  bookingId: string,
  patch: Partial<CustomerBookingDetail>,
) {
  if (!previous) return previous;

  const applyPatch = (items: CustomerDashboard["active_bookings"]) =>
    normalizeArray(items).map((item) => (item.id === bookingId ? { ...item, ...patch } : item));

  return {
    ...previous,
    active_bookings: applyPatch(previous.active_bookings),
    past_history: applyPatch(previous.past_history),
  };
}

export function useCustomerDashboardQuery(enabled = true) {
  const token = useSessionStore((state) => state.token);
  const role = useSessionStore((state) => state.role);

  return useQuery({
    queryKey: customerKeys.dashboard,
    queryFn: async () => normalizeDashboard(await apiRequest<CustomerDashboard>("/user/me")),
    enabled: enabled && role === "customer" && Boolean(token),
  });
}

export function useCustomerBookingDetailQuery(bookingId: string, enabled = true) {
  const token = useSessionStore((state) => state.token);
  const role = useSessionStore((state) => state.role);
  const setTenantContext = useSessionStore((state) => state.setTenantContext);

  const query = useQuery<CustomerBookingDetail>({
    queryKey: customerKeys.bookingDetail(bookingId),
    queryFn: async () =>
      normalizeBookingDetail(await apiRequest<CustomerBookingDetail>(`/user/me/bookings/${bookingId}`)),
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
