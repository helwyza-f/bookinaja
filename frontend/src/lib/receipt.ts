export type ReceiptSettings = {
  name?: string;
  plan?: string;
  subscription_status?: string;
  receipt_title?: string;
  receipt_subtitle?: string;
  receipt_footer?: string;
  receipt_whatsapp_text?: string;
  receipt_template?: string;
  receipt_channel?: string;
  printer_enabled?: boolean;
  printer_auto_print?: boolean;
};

export type ReceiptBooking = {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  resource_name?: string;
  start_time?: string;
  end_time?: string;
  grand_total?: number;
  deposit_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  payment_status?: string;
};

export const defaultReceiptTemplate = [
  "=== {receipt_title} ===",
  "{receipt_subtitle}",
  "",
  "Pelanggan : {customer_name}",
  "Booking   : {booking_id}",
  "Unit      : {resource_name}",
  "Waktu     : {booking_time}",
  "",
  "Total     : {grand_total}",
  "DP        : {deposit_amount}",
  "Dibayar   : {paid_amount}",
  "Sisa      : {balance_due}",
  "",
  "{receipt_footer}",
].join("\n");

export const isReceiptProEnabled = (settings?: ReceiptSettings | null) => {
  const plan = String(settings?.plan || "").toLowerCase();
  const status = String(settings?.subscription_status || "").toLowerCase();
  return plan === "pro" && status === "active";
};

export const formatReceiptIDR = (value?: number) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;

export const renderReceiptText = (
  settings: ReceiptSettings | null | undefined,
  booking: ReceiptBooking,
) => {
  const start = booking.start_time ? new Date(booking.start_time) : null;
  const end = booking.end_time ? new Date(booking.end_time) : null;
  const bookingTime =
    start && end
      ? `${start.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })} ${start.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}-${end.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "-";

  const values: Record<string, string> = {
    receipt_title: settings?.receipt_title || "Struk Bookinaja",
    receipt_subtitle: settings?.receipt_subtitle || "Bukti transaksi resmi",
    receipt_footer: settings?.receipt_footer || "Terima kasih sudah berkunjung",
    tenant_name: settings?.name || "Bookinaja",
    customer_name: booking.customer_name || "Customer",
    customer_phone: booking.customer_phone || "-",
    booking_id: booking.id.slice(0, 8).toUpperCase(),
    resource_name: booking.resource_name || "Unit",
    booking_time: bookingTime,
    grand_total: formatReceiptIDR(booking.grand_total),
    deposit_amount: formatReceiptIDR(booking.deposit_amount),
    paid_amount: formatReceiptIDR(booking.paid_amount),
    balance_due: formatReceiptIDR(booking.balance_due),
    payment_status: booking.payment_status || "-",
  };

  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    settings?.receipt_template || defaultReceiptTemplate,
  );
};

export const buildReceiptWhatsAppUrl = (
  settings: ReceiptSettings | null | undefined,
  booking: ReceiptBooking,
) => {
  const phone = normalizeIndonesianPhone(booking.customer_phone || "");
  if (!phone) return null;
  const intro =
    settings?.receipt_whatsapp_text ||
    "Berikut struk transaksi Anda dari Bookinaja.";
  const text = `${intro}\n\n${renderReceiptText(settings, booking)}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};

export const printReceiptText = (
  settings: ReceiptSettings | null | undefined,
  booking: ReceiptBooking,
) => {
  const text = renderReceiptText(settings, booking);
  const popup = window.open("", "_blank", "width=420,height=640");
  if (!popup) return false;

  popup.document.write(`
    <html>
      <head>
        <title>Nota ${booking.id.slice(0, 8).toUpperCase()}</title>
        <style>
          body { margin: 0; padding: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #0f172a; }
          pre { white-space: pre-wrap; font-size: 12px; line-height: 1.55; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body><pre>${escapeHtml(text)}</pre></body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
  return true;
};

const normalizeIndonesianPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
