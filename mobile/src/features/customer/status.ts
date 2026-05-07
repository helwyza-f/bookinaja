export type PaymentStatusInput =
  | string
  | {
      status?: string;
      balanceDue?: number;
      paidAmount?: number;
      grandTotal?: number;
      depositAmount?: number;
    };

export function resolvePaymentStatusCode(input?: PaymentStatusInput) {
  if (typeof input === "string" || input == null) {
    return String(input || "").toLowerCase();
  }

  const normalized = String(input.status || "").toLowerCase();
  const balanceDue = Number(input.balanceDue || 0);
  const paidAmount = Number(input.paidAmount || 0);
  const grandTotal = Number(input.grandTotal || 0);

  if (normalized === "awaiting_verification") return normalized;
  if (normalized === "expired" || normalized === "failed") return normalized;

  const fullyPaid =
    balanceDue <= 0 &&
    (grandTotal <= 0 ||
      paidAmount > 0 ||
      normalized === "settled" ||
      normalized === "paid" ||
      normalized === "partial_paid");

  if (fullyPaid) return "settled";
  if (normalized === "settled" || normalized === "paid" || normalized === "partial_paid") {
    return "partial_paid";
  }

  return normalized || "pending";
}

export function getPaymentStatusMeta(input?: PaymentStatusInput) {
  const normalized = resolvePaymentStatusCode(input);

  if (normalized === "awaiting_verification") {
    return {
      label: "Menunggu Verifikasi",
      tone: "warning" as const,
    };
  }

  if (normalized === "partial_paid") {
    return {
      label: "DP Sudah Masuk",
      tone: "info" as const,
    };
  }

  if (normalized === "settled" || normalized === "paid") {
    return {
      label: "Lunas",
      tone: "success" as const,
    };
  }

  if (normalized === "expired" || normalized === "failed") {
    return {
      label: "Gagal",
      tone: "danger" as const,
    };
  }

  return {
    label: "Menunggu Pembayaran",
    tone: "neutral" as const,
  };
}

export function getSessionStatusMeta(status?: string) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "active" || normalized === "ongoing") {
    return {
      label: "Sedang Berjalan",
      tone: "success" as const,
    };
  }

  if (normalized === "completed") {
    return {
      label: "Selesai",
      tone: "neutral" as const,
    };
  }

  if (normalized === "cancelled") {
    return {
      label: "Dibatalkan",
      tone: "danger" as const,
    };
  }

  if (normalized === "confirmed") {
    return {
      label: "Siap Mulai",
      tone: "info" as const,
    };
  }

  return {
    label: "Menunggu",
    tone: "warning" as const,
  };
}
