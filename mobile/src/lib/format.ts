export function formatCurrency(value?: number | null) {
  if (!value || value <= 0) return "Cek harga";
  return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
