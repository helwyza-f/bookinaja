export function formatMoney(value?: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateChip(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function buildDateOptions(baseDate = new Date(), total = 7) {
  return Array.from({ length: total }, (_, index) => {
    const next = new Date(baseDate);
    next.setDate(baseDate.getDate() + index);
    next.setHours(0, 0, 0, 0);
    return next;
  });
}

export function buildSimpleTimeSlots(openTime?: string, closeTime?: string, stepMinutes = 60) {
  const [openH, openM] = (openTime || "08:00").split(":").map(Number);
  const [closeH, closeM] = (closeTime || "22:00").split(":").map(Number);
  const openTotal = openH * 60 + openM;
  const closeTotal = closeH * 60 + closeM;
  const slots: string[] = [];

  for (let current = openTotal; current + stepMinutes <= closeTotal; current += stepMinutes) {
    const hours = String(Math.floor(current / 60)).padStart(2, "0");
    const minutes = String(current % 60).padStart(2, "0");
    slots.push(`${hours}:${minutes}`);
  }

  return slots;
}

export function isoFromDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return value.toISOString();
}

export function formatTimelineRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(start);
  const timeLabel = `${new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(start)} - ${new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(end)}`;

  return { dateLabel, timeLabel };
}
