import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";

type PromoPreviewPayload = {
  tenant_id: string;
  code: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  subtotal: number;
  customer_id?: string | null;
};

type PromoPreviewResponse = {
  valid: boolean;
  reason_code?: string;
  message?: string;
  code?: string;
  discount_amount?: number;
  original_amount?: number;
  final_amount?: number;
  label?: string;
};

type CreateBookingPayload = {
  slug: string;
  resource_id: string;
  customer_name: string;
  customer_phone: string;
  item_ids: string[];
  start_time: string;
  duration: number;
  promo_code?: string;
};

type CreateBookingResponse = {
  booking_id: string;
  redirect_url?: string;
  booking?: {
    id: string;
    access_token?: string;
    deposit_amount?: number;
  };
};

export function usePromoPreviewMutation() {
  return useMutation({
    mutationFn: (payload: PromoPreviewPayload) =>
      apiRequest<PromoPreviewResponse>("/public/promos/preview", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}

export function useCreateBookingMutation() {
  return useMutation({
    mutationFn: ({ slug, ...payload }: CreateBookingPayload) =>
      apiRequest<CreateBookingResponse>("/public/bookings", {
        method: "POST",
        query: { slug },
        body: JSON.stringify(payload),
      }),
  });
}
