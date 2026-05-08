import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { customerKeys, patchCustomerDashboardBooking } from "./queries";
import type { CustomerBookingDetail, CustomerDashboard } from "./types";

export type CustomerLiveContext = {
  booking: Record<string, unknown>;
  busy_slots: {
    start_time: string;
    end_time: string;
  }[];
};

export function useCustomerLiveContextQuery(bookingId: string, enabled = true) {
  return useQuery({
    queryKey: customerKeys.bookingContext(bookingId),
    queryFn: async () => {
      const data = await apiRequest<CustomerLiveContext>(`/user/me/bookings/${bookingId}/context`);
      return {
        ...data,
        busy_slots: Array.isArray(data?.busy_slots) ? data.busy_slots : [],
      };
    },
    enabled: enabled && Boolean(bookingId),
    retry: false,
    refetchInterval: 30000,
  });
}

export function useUploadBookingProofMutation(bookingId: string) {
  return useMutation({
    mutationFn: async (uri: string) => {
      const filename = uri.split("/").pop() || `proof-${Date.now()}.jpg`;
      const extension = filename.split(".").pop()?.toLowerCase();
      const mimeType =
        extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : "image/jpeg";

      const form = new FormData();
      form.append("image", {
        uri,
        name: filename,
        type: mimeType,
      } as never);

      return apiRequest<{ url?: string }>(`/user/me/bookings/${bookingId}/upload-proof`, {
        method: "POST",
        body: form,
      });
    },
  });
}

function useSyncBookingCaches(bookingId: string) {
  const queryClient = useQueryClient();

  const syncFromDetail = (patch?: Partial<CustomerBookingDetail>) => {
    const detail = queryClient.getQueryData<CustomerBookingDetail>(
      customerKeys.bookingDetail(bookingId),
    );

    const nextDetail = patch ? { ...detail, ...patch } : detail;
    if (nextDetail) {
      queryClient.setQueryData(customerKeys.bookingDetail(bookingId), nextDetail);
      queryClient.setQueryData<CustomerDashboard | undefined>(customerKeys.dashboard, (previous) =>
        patchCustomerDashboardBooking(previous, bookingId, nextDetail),
      );
    }

    void queryClient.invalidateQueries({ queryKey: customerKeys.bookingDetail(bookingId) });
    void queryClient.invalidateQueries({ queryKey: customerKeys.bookingContext(bookingId) });
    void queryClient.invalidateQueries({ queryKey: customerKeys.bookingFnb(bookingId) });
    void queryClient.invalidateQueries({ queryKey: customerKeys.dashboard });
  };

  return {
    syncFromDetail,
  };
}

export function useBookingCheckoutMutation(bookingId: string) {
  const { syncFromDetail } = useSyncBookingCaches(bookingId);

  return useMutation({
    mutationFn: (payload: { scope: "deposit" | "settlement"; method: string }) =>
      apiRequest<{
        order_id?: string;
        snap_token?: string;
        redirect_url?: string;
        amount?: number;
        booking_id?: string;
        display_label?: string;
        method_code?: string;
        method_label?: string;
        status?: string;
      }>(`/public/bookings/${bookingId}/checkout`, {
        method: "POST",
        query: {
          mode: payload.scope === "deposit" ? "dp" : "settlement",
          method: payload.method,
        },
      }),
    onSuccess: () => {
      syncFromDetail();
    },
  });
}

export function useSubmitManualBookingPaymentMutation(bookingId: string) {
  const { syncFromDetail } = useSyncBookingCaches(bookingId);

  return useMutation({
    mutationFn: (payload: {
      scope: "deposit" | "settlement";
      method: string;
      note?: string;
      proof_url?: string;
    }) =>
      apiRequest<{
        amount?: number;
        booking_id?: string;
        display_label?: string;
        method_code?: string;
        method_label?: string;
        status?: string;
        instructions?: string;
        reference?: string;
          proof_upload?: boolean;
      }>(`/user/me/bookings/${bookingId}/manual-payment`, {
        method: "POST",
        body: JSON.stringify({
          booking_id: bookingId,
          scope: payload.scope,
          method: payload.method,
          note: payload.note || "",
          proof_url: payload.proof_url || "",
        }),
      }),
    onSuccess: () => {
      syncFromDetail();
    },
  });
}

export function useActivateBookingMutation(bookingId: string) {
  const { syncFromDetail } = useSyncBookingCaches(bookingId);

  return useMutation({
    mutationFn: () =>
      apiRequest<{ message?: string }>(`/user/me/bookings/${bookingId}/activate`, {
        method: "POST",
      }),
    onSuccess: () => {
      syncFromDetail();
    },
  });
}

export function useCompleteBookingMutation(bookingId: string) {
  const { syncFromDetail } = useSyncBookingCaches(bookingId);

  return useMutation({
    mutationFn: () =>
      apiRequest<{ message?: string }>(`/user/me/bookings/${bookingId}/complete`, {
        method: "POST",
      }),
    onSuccess: () => {
      syncFromDetail();
    },
  });
}

export function useExtendBookingMutation(bookingId: string) {
  const { syncFromDetail } = useSyncBookingCaches(bookingId);

  return useMutation({
    mutationFn: (additionalDuration: number) =>
      apiRequest<{ message?: string }>(`/user/me/bookings/${bookingId}/extend`, {
        method: "POST",
        body: JSON.stringify({ additional_duration: additionalDuration }),
      }),
    onSuccess: () => {
      syncFromDetail();
    },
  });
}

export function useCustomerFnbMenuQuery(bookingId: string, enabled = true) {
  return useQuery({
    queryKey: customerKeys.bookingFnb(bookingId),
    queryFn: async () => {
      const data = await apiRequest<{ id: string; name: string; price?: number; category?: string }[] | null>(
        "/customer/fnb",
        {
          query: { booking_id: bookingId },
        },
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: enabled && Boolean(bookingId),
  });
}

export function useAddBookingOrderMutation(bookingId: string) {
  const { syncFromDetail } = useSyncBookingCaches(bookingId);

  return useMutation({
    mutationFn: (payload: { fnb_item_id: string; quantity: number }) =>
      apiRequest<{ message?: string }>(`/user/me/bookings/${bookingId}/orders`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      syncFromDetail();
    },
  });
}

export function useAddBookingAddonMutation(bookingId: string) {
  const { syncFromDetail } = useSyncBookingCaches(bookingId);

  return useMutation({
    mutationFn: (itemId: string) =>
      apiRequest<{ message?: string }>(`/user/me/bookings/${bookingId}/addons`, {
        method: "POST",
        body: JSON.stringify({ item_id: itemId }),
      }),
    onSuccess: () => {
      syncFromDetail();
    },
  });
}
