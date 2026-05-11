export type CustomerPortalItem = {
  id: string;
  kind?: string;
  tenant_name?: string;
  tenant_slug?: string;
  resource?: string;
  date?: string;
  status?: string;
  payment_status?: string;
  grand_total?: number;
  balance_due?: number;
};

type StatusMeta = {
  label: string;
  className: string;
  hint?: string;
};

export function getBookingStatusMeta(status?: string): StatusMeta {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active" || normalized === "ongoing") {
    return {
      label: "Sedang berjalan",
      className: "rounded-full border-none bg-emerald-500 text-white",
    };
  }
  if (normalized === "confirmed") {
    return {
      label: "Terjadwal",
      className: "rounded-full border-none bg-blue-600 text-white",
    };
  }
  if (normalized === "pending") {
    return {
      label: "Menunggu konfirmasi",
      className: "rounded-full border-none bg-amber-500 text-white",
    };
  }
  if (normalized === "completed") {
    return {
      label: "Selesai",
      className: "rounded-full border-none bg-slate-900 text-white dark:bg-white/15",
    };
  }
  if (normalized === "cancelled") {
    return {
      label: "Dibatalkan",
      className: "rounded-full border-none bg-rose-500 text-white",
    };
  }
  return {
    label: "Booking",
    className: "rounded-full border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  };
}

export function getOrderStatusMeta(status?: string, paymentStatus?: string, balanceDue?: number): StatusMeta {
  const flow = String(status || "").toLowerCase();
  const payment = String(paymentStatus || "").toLowerCase();
  const due = Number(balanceDue || 0);

  if (payment === "awaiting_verification" || payment === "submitted") {
    return {
      label: "Menunggu verifikasi",
      className: "rounded-full border-none bg-amber-500 text-white",
      hint: "Bukti pembayaran sudah dikirim dan sedang direview admin.",
    };
  }
  if (payment === "settled" || payment === "paid" || (flow === "completed" && due <= 0)) {
    return {
      label: "Selesai",
      className: "rounded-full border-none bg-emerald-600 text-white",
      hint: "Order langsung sudah lunas dan selesai diproses.",
    };
  }
  if (flow === "cancelled") {
    return {
      label: "Dibatalkan",
      className: "rounded-full border-none bg-rose-500 text-white",
    };
  }
  if (payment === "failed") {
    return {
      label: "Pembayaran gagal",
      className: "rounded-full border-none bg-rose-500 text-white",
    };
  }
  if (payment === "expired") {
    return {
      label: "Pembayaran kadaluarsa",
      className: "rounded-full border-none bg-rose-500 text-white",
    };
  }
  if (payment === "pending" || flow === "pending_payment") {
    return {
      label: "Pembayaran diproses",
      className: "rounded-full border-none bg-blue-600 text-white",
      hint: "Pembayaran sedang diproses gateway atau menunggu update otomatis.",
    };
  }
  if (payment === "unpaid" || flow === "open") {
    return {
      label: "Belum dibayar",
      className: "rounded-full border-none bg-slate-900 text-white dark:bg-white/15",
      hint: "Order sudah dibuat dan menunggu pembayaran customer.",
    };
  }
  return {
    label: "Direct sale",
    className: "rounded-full border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  };
}

export function formatPortalDate(value?: string, withYear = false) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function formatPortalTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
