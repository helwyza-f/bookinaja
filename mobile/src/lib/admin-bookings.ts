import type { RealtimeEvent } from "@/lib/realtime/event-types";

export type AdminBookingRow = {
  id: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  resource_name?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  payment_status?: string;
  deposit_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  grand_total?: number;
  total_resource?: number;
  total_fnb?: number;
};

export function getAdminBookingTotal(item: Pick<AdminBookingRow, "grand_total" | "total_resource" | "total_fnb">) {
  const explicit = Number(item.grand_total || 0);
  if (explicit > 0) return explicit;
  return Number(item.total_resource || 0) + Number(item.total_fnb || 0);
}

export function isAdminBookingActionable(item: Pick<AdminBookingRow, "status" | "payment_status" | "balance_due">) {
  const booking = String(item.status || "").toLowerCase();
  const payment = String(item.payment_status || "").toLowerCase();
  const balanceDue = Number(item.balance_due || 0);
  return (
    booking === "active" ||
    booking === "ongoing" ||
    payment === "awaiting_verification" ||
    (booking === "completed" && (balanceDue > 0 || ["pending", "partial_paid", "unpaid", "failed", "expired"].includes(payment)))
  );
}

export function getAdminBookingStatusMeta(item: Pick<AdminBookingRow, "status" | "payment_status" | "balance_due">) {
  const booking = String(item.status || "").toLowerCase();
  const payment = String(item.payment_status || "").toLowerCase();

  if (isAdminBookingActionable(item) && booking === "completed") {
    return { label: "Perlu pelunasan", tone: "#b45309", bg: "#fef3c7" };
  }
  if (payment === "awaiting_verification") {
    return { label: "Verifikasi", tone: "#b45309", bg: "#fef3c7" };
  }
  if (booking === "active" || booking === "ongoing") {
    return { label: "Sedang berjalan", tone: "#059669", bg: "#d1fae5" };
  }
  if (booking === "confirmed") {
    return { label: "Terjadwal", tone: "#2563eb", bg: "#dbeafe" };
  }
  if (booking === "completed") {
    return { label: "Selesai", tone: "#475569", bg: "#e2e8f0" };
  }
  return { label: "Pending", tone: "#b45309", bg: "#fef3c7" };
}

export function patchAdminBookingList(current: AdminBookingRow[], event: RealtimeEvent) {
  const entityId = String(event.entity_id || "");
  if (!entityId) return current;

  let found = false;
  const next = current.map((booking) => {
    if (booking.id !== entityId) return booking;
    found = true;
    return {
      ...booking,
      status:
        typeof event.summary?.status === "string" ? event.summary.status : booking.status,
      payment_status:
        typeof event.summary?.payment_status === "string"
          ? event.summary.payment_status
          : booking.payment_status,
      customer_name:
        typeof event.summary?.customer_name === "string"
          ? event.summary.customer_name
          : booking.customer_name,
      customer_phone:
        typeof event.summary?.customer_phone === "string"
          ? event.summary.customer_phone
          : booking.customer_phone,
      resource_name:
        typeof event.summary?.resource_name === "string"
          ? event.summary.resource_name
          : booking.resource_name,
      start_time:
        typeof event.summary?.start_time === "string" ? event.summary.start_time : booking.start_time,
      end_time: typeof event.summary?.end_time === "string" ? event.summary.end_time : booking.end_time,
      balance_due:
        typeof event.summary?.balance_due === "number"
          ? Number(event.summary.balance_due)
          : booking.balance_due,
      paid_amount:
        typeof event.summary?.paid_amount === "number"
          ? Number(event.summary.paid_amount)
          : booking.paid_amount,
      deposit_amount:
        typeof event.summary?.deposit_amount === "number"
          ? Number(event.summary.deposit_amount)
          : booking.deposit_amount,
      grand_total:
        typeof event.summary?.grand_total === "number"
          ? Number(event.summary.grand_total)
          : booking.grand_total,
    };
  });

  return found ? next : current;
}
