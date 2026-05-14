export type CustomerPortalItem = {
  id: string;
  kind?: string;
  tenant_name?: string;
  tenant_slug?: string;
  resource?: string;
  resource_name?: string;
  date?: string;
  status?: string;
  payment_status?: string;
  grand_total?: number;
  balance_due?: number;
  start_time?: string;
  end_time?: string;
};

type StatusMeta = {
  label: string;
  tone: string;
  hint?: string;
};

export function getBookingStatusMeta(status?: string): StatusMeta {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active" || normalized === "ongoing") {
    return {
      label: "Sedang berjalan",
      tone: "#059669",
    };
  }
  if (normalized === "confirmed") {
    return {
      label: "Terjadwal",
      tone: "#2563eb",
    };
  }
  if (normalized === "pending") {
    return {
      label: "Menunggu konfirmasi",
      tone: "#d97706",
    };
  }
  if (normalized === "completed") {
    return {
      label: "Selesai",
      tone: "#0f172a",
    };
  }
  if (normalized === "cancelled") {
    return {
      label: "Dibatalkan",
      tone: "#e11d48",
    };
  }
  return {
    label: "Booking",
    tone: "#475569",
  };
}

export function getOrderStatusMeta(status?: string, paymentStatus?: string, balanceDue?: number): StatusMeta {
  const flow = String(status || "").toLowerCase();
  const payment = String(paymentStatus || "").toLowerCase();
  const due = Number(balanceDue || 0);

  if (payment === "awaiting_verification" || payment === "submitted") {
    return {
      label: "Menunggu verifikasi",
      tone: "#d97706",
      hint: "Bukti bayar sedang diperiksa admin.",
    };
  }
  if (payment === "settled" || payment === "paid" || (flow === "completed" && due <= 0)) {
    return {
      label: "Lunas",
      tone: "#059669",
      hint: "Pembayaran sudah masuk.",
    };
  }
  if (flow === "cancelled") {
    return {
      label: "Dibatalkan",
      tone: "#e11d48",
    };
  }
  if (payment === "failed") {
    return {
      label: "Pembayaran gagal",
      tone: "#e11d48",
    };
  }
  if (payment === "expired") {
    return {
      label: "Kedaluwarsa",
      tone: "#e11d48",
    };
  }
  if (payment === "pending" || flow === "pending_payment") {
    return {
      label: "Diproses",
      tone: "#2563eb",
      hint: "Pembayaran sedang diproses oleh gateway.",
    };
  }
  if (payment === "unpaid" || flow === "open") {
    return {
      label: "Belum dibayar",
      tone: "#0f172a",
      hint: "Order sudah dibuat, tinggal bayar.",
    };
  }
  return {
    label: "Order",
    tone: "#475569",
  };
}
