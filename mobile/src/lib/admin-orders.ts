import { formatCurrency } from "@/lib/format";

export type POSCatalogItem = {
  id: string;
  name: string;
  price?: number;
  price_unit?: string;
  unit_duration?: number;
  item_type?: string;
  is_default?: boolean;
};

export type POSCatalogResource = {
  resource_id: string;
  resource_name: string;
  resource_image_url?: string;
  category?: string;
  status?: string;
  operating_mode?: string;
  available_items?: POSCatalogItem[];
};

export type OpenOrder = {
  id: string;
  resource_name?: string;
  status?: string;
  payment_status?: string;
  grand_total?: number;
  balance_due?: number;
  created_at?: string;
};

export type PaymentMethod = {
  code?: string;
  display_name?: string;
  category?: string;
  verification_type?: string;
  provider?: string;
  instructions?: string;
  is_active?: boolean;
  metadata?: Record<string, string> | null;
};

export type PaymentAttempt = {
  id?: string;
  method_code?: string;
  method_label?: string;
  verification_type?: string;
  payment_scope?: string;
  amount?: number;
  status?: string;
  reference_code?: string;
  payer_note?: string;
  admin_note?: string;
  proof_url?: string;
  created_at?: string;
  submitted_at?: string;
  verified_at?: string;
};

export type OrderItem = {
  id: string;
  resource_item_id?: string | null;
  item_name: string;
  item_type?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type OrderDetail = {
  id: string;
  resource_id: string;
  resource_name?: string;
  customer_name?: string;
  customer_phone?: string;
  status?: string;
  payment_status?: string;
  subtotal?: number;
  discount_amount?: number;
  grand_total?: number;
  paid_amount?: number;
  balance_due?: number;
  payment_method?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  payment_methods?: PaymentMethod[];
  payment_attempts?: PaymentAttempt[];
  items?: OrderItem[];
};

export type ChipTone = "blue" | "success" | "amber" | "danger" | "slate";

export function formatAmount(value?: number) {
  const formatted = formatCurrency(value || 0);
  return formatted === "Cek harga" ? "Rp 0" : formatted;
}

export function labelItemType(value?: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "add_on" || normalized === "addon") return "Add-on";
  if (normalized === "main_option") return "Paket";
  return "Item jual";
}

export function orderStatusLabel(value?: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "pending_payment") return "Menunggu bayar";
  if (normalized === "completed") return "Selesai";
  if (normalized === "cancelled") return "Batal";
  if (normalized === "open") return "Open";
  return normalized ? normalized.replace(/_/g, " ") : "Open";
}

export function orderStatusTone(value?: string): ChipTone {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "completed") return "success";
  if (normalized === "cancelled") return "danger";
  if (normalized === "pending_payment") return "amber";
  return "blue";
}

export function orderPaymentStatusLabel(value?: string, balanceDue = 0): string {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "paid" || balanceDue <= 0) return "Lunas";
  if (normalized === "awaiting_verification") return "Menunggu verifikasi";
  if (normalized === "pending" || normalized === "unpaid") return "Belum bayar";
  if (normalized === "failed") return "Gagal";
  return normalized ? normalized.replace(/_/g, " ") : "Belum bayar";
}

export function orderPaymentStatusTone(value?: string, balanceDue = 0): ChipTone {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "paid" || balanceDue <= 0) return "success";
  if (normalized === "awaiting_verification") return "amber";
  if (normalized === "failed") return "danger";
  return "slate";
}

export function paymentMethodIcon(code?: string) {
  const normalized = String(code || "").toLowerCase();
  if (normalized === "cash") return "cash-fast";
  if (normalized === "bank_transfer") return "bank-transfer";
  if (normalized === "qris_static") return "qrcode-scan";
  return "credit-card-outline";
}

export function paymentMethodHint(method: PaymentMethod) {
  const code = String(method.code || "").toLowerCase();
  if (code === "cash") return "Bayar langsung di kasir.";
  if (code === "midtrans") return "Lanjut ke gateway.";
  if (code === "bank_transfer") return "Transfer manual dan review bukti bayar.";
  if (code === "qris_static") return "Scan QRIS tenant lalu verifikasi.";
  return method.instructions || "Gunakan metode aktif tenant ini.";
}

export function isDirectSaleResource(resource: POSCatalogResource) {
  const mode = String(resource.operating_mode || "").toLowerCase();
  return mode === "direct_sale" || mode === "hybrid";
}

export function lowestCatalogPrice(items: POSCatalogItem[] = []) {
  const prices = items.map((item) => Number(item.price || 0)).filter((value) => value > 0);
  return prices.length ? Math.min(...prices) : 0;
}
