import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { customerKeys } from "./queries";

export type CustomerLiveContext = {
  booking: Record<string, unknown>;
  busy_slots: Array<{
    start_time: string;
    end_time: string;
  }>;
};

export function useCustomerLiveContextQuery(bookingId: string, enabled = true) {
  return useQuery({
    queryKey: customerKeys.bookingContext(bookingId),
    queryFn: () => apiRequest<CustomerLiveContext>(`/user/me/bookings/${bookingId}/context`),
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

export function useBookingCheckoutMutation(bookingId: string) {
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
  });
}

export function useSubmitManualBookingPaymentMutation(bookingId: string) {
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
  });
}

export function useActivateBookingMutation(bookingId: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest<{ message?: string }>(`/user/me/bookings/${bookingId}/activate`, {
        method: "POST",
      }),
  });
}

export function useCompleteBookingMutation(bookingId: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest<{ message?: string }>(`/user/me/bookings/${bookingId}/complete`, {
        method: "POST",
      }),
  });
}

export function useExtendBookingMutation(bookingId: string) {
  return useMutation({
    mutationFn: (additionalDuration: number) =>
      apiRequest<{ message?: string }>(`/user/me/bookings/${bookingId}/extend`, {
        method: "POST",
        body: JSON.stringify({ additional_duration: additionalDuration }),
      }),
  });
}

export function useCustomerFnbMenuQuery(bookingId: string, enabled = true) {
  return useQuery({
    queryKey: customerKeys.bookingFnb(bookingId),
    queryFn: () =>
      apiRequest<Array<{ id: string; name: string; price?: number; category?: string }>>("/customer/fnb", {
        query: { booking_id: bookingId },
      }),
    enabled: enabled && Boolean(bookingId),
  });
}

export function useAddBookingOrderMutation(bookingId: string) {
  return useMutation({
    mutationFn: (payload: { fnb_item_id: string; quantity: number }) =>
      apiRequest<{ message?: string }>(`/user/me/bookings/${bookingId}/orders`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}

export function useAddBookingAddonMutation(bookingId: string) {
  return useMutation({
    mutationFn: (itemId: string) =>
      apiRequest<{ message?: string }>(`/user/me/bookings/${bookingId}/addons`, {
        method: "POST",
        body: JSON.stringify({ item_id: itemId }),
      }),
  });
}
