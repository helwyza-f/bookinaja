import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { appToast } from "@/lib/toast";
import { customerBookingChannel } from "@/lib/realtime/channels";
import {
  BOOKING_EVENT_PREFIXES,
  matchesRealtimePrefix,
  type RealtimeEvent,
} from "@/lib/realtime/event-types";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { useSessionStore } from "@/stores/session-store";
import { customerKeys } from "./queries";
import type { CustomerBookingDetail } from "./types";

type Options = {
  bookingId: string;
  enabled?: boolean;
  showToasts?: boolean;
  onEvent?: (event: RealtimeEvent) => void;
  onReconnect?: () => void;
};

const TOAST_COPY: Record<string, { title: string; message?: string; tone: "success" | "warning" | "info" }> = {
  "payment.dp.paid": { title: "DP masuk", message: "Pembayaran DP sudah tercatat.", tone: "success" },
  "payment.awaiting_verification": {
    title: "Menunggu verifikasi",
    message: "Pembayaran manual sudah dikirim.",
    tone: "warning",
  },
  "payment.manual.rejected": {
    title: "Pembayaran ditolak",
    message: "Cek metode atau bukti bayar lalu kirim lagi.",
    tone: "warning",
  },
  "payment.settlement.paid": { title: "Booking lunas", message: "Pelunasan sudah tercatat.", tone: "success" },
  "payment.cash.settled": { title: "Booking lunas", message: "Pelunasan sudah tercatat.", tone: "success" },
  "session.activated": { title: "Sesi aktif", message: "Live session sudah dimulai.", tone: "success" },
  "session.completed": { title: "Sesi selesai", message: "Cek sisa tagihan atau riwayat booking.", tone: "info" },
  "order.fnb.added": { title: "Pesanan masuk", message: "Pesanan F&B berhasil ditambahkan.", tone: "info" },
  "order.addon.added": { title: "Add-on masuk", message: "Add-on berhasil ditambahkan.", tone: "info" },
};

function patchBookingSummary(
  previous: CustomerBookingDetail | undefined,
  event: RealtimeEvent,
) {
  if (!previous) return previous;
  const summary = event.summary || {};
  return {
    ...previous,
    status: String(summary.status ?? previous.status),
    payment_status: String(summary.payment_status ?? previous.payment_status),
    grand_total: Number(summary.grand_total ?? previous.grand_total ?? 0),
    balance_due: Number(summary.balance_due ?? previous.balance_due ?? 0),
    paid_amount: Number(summary.paid_amount ?? previous.paid_amount ?? 0),
    deposit_amount: Number(summary.deposit_amount ?? previous.deposit_amount ?? 0),
  };
}

export function useCustomerBookingRealtime({
  bookingId,
  enabled = true,
  showToasts = false,
  onEvent,
  onReconnect,
}: Options) {
  const customerId = useSessionStore((state) => state.customerId);
  const queryClient = useQueryClient();
  const lastToastKeyRef = useRef("");

  const handleEvent = useCallback(
    (event: RealtimeEvent) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;

      queryClient.setQueryData<CustomerBookingDetail | undefined>(
        customerKeys.bookingDetail(bookingId),
        (previous) => patchBookingSummary(previous, event),
      );

      if (
        event.type.startsWith("session.") ||
        event.type.startsWith("payment.")
      ) {
        void queryClient.invalidateQueries({
          queryKey: customerKeys.bookingContext(bookingId),
        });
      }

      if (
        event.type === "order.fnb.added" ||
        event.type === "order.addon.added" ||
        event.type.startsWith("booking.")
      ) {
        void queryClient.invalidateQueries({
          queryKey: customerKeys.bookingDetail(bookingId),
        });
        void queryClient.invalidateQueries({
          queryKey: customerKeys.bookingFnb(bookingId),
        });
      }

      if (showToasts) {
        const eventKey = `${event.type}:${event.entity_id || ""}:${event.occurred_at || ""}`;
        if (lastToastKeyRef.current !== eventKey) {
          lastToastKeyRef.current = eventKey;
          const toast = TOAST_COPY[event.type];
          if (toast) {
            if (toast.tone === "success") appToast.success(toast.title, toast.message);
            if (toast.tone === "warning") appToast.warning(toast.title, toast.message);
            if (toast.tone === "info") appToast.info(toast.title, toast.message);
          }
        }
      }

      onEvent?.(event);
    },
    [bookingId, onEvent, queryClient, showToasts],
  );

  const handleReconnect = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: customerKeys.bookingDetail(bookingId),
    });
    void queryClient.invalidateQueries({
      queryKey: customerKeys.bookingContext(bookingId),
    });
    onReconnect?.();
  }, [bookingId, onReconnect, queryClient]);

  return useRealtime({
    enabled: enabled && Boolean(customerId) && Boolean(bookingId),
    channels:
      customerId && bookingId ? [customerBookingChannel(customerId, bookingId)] : [],
    onEvent: handleEvent,
    onReconnect: handleReconnect,
  });
}
