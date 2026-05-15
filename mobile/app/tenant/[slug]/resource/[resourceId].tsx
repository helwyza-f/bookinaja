import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { apiFetch, ApiError } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { Field } from "@/components/field";
import { ScreenShell } from "@/components/screen-shell";
import { formatCurrency } from "@/lib/format";
import { BusySlot, PublicResourceDetail, PublicResourceItem } from "@/lib/resource-public";
import { PublicTenantProfile } from "@/lib/tenant-public";
import { useSession } from "@/providers/session-provider";

type BookingCreateResponse = {
  booking?: {
    id: string;
    access_token?: string;
  };
};

type BookingExchangeResponse = {
  booking_id: string;
  customer_token?: string;
};

type SalesOrderCreateResponse = {
  order?: {
    id: string;
    access_token?: string;
  };
  order_id?: string;
};

type SalesOrderExchangeResponse = {
  order_id: string;
  customer_token?: string;
};

type CustomerSettingsResponse = {
  customer?: {
    name?: string;
    phone?: string;
  };
};

type DateChoice = {
  value: string;
  weekday: string;
  day: string;
  month: string;
  isToday: boolean;
};

type SlotStatus = "available" | "selected" | "passed" | "booked" | "active" | "done";

type TimeSlot = {
  value: string;
  endValue: string;
  status: SlotStatus;
  disabled: boolean;
};

type BusyRange = {
  id: string;
  start: number;
  end: number;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function makeTenantPath(path: string, slug: string) {
  return `${path}${path.includes("?") ? "&" : "?"}slug=${encodeURIComponent(slug)}`;
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function timeToMinutes(value?: string) {
  const [hours, minutes] = String(value || "00:00")
    .slice(0, 5)
    .split(":")
    .map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function minutesToTime(value: number) {
  const safe = Math.max(0, value);
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

function buildStartTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

function normalizeOperatingMode(value?: string) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "direct_sale") return "direct_sale";
  return "timed";
}

function getFlowMeta(mode: string) {
  if (mode === "direct_sale") {
    return {
      eyebrow: "Direct Sale",
      title: "Pilih item yang mau dibeli",
      description: "Pilih produk, atur jumlah, lalu buat order.",
      cta: "Buat order",
    };
  }
  return {
    eyebrow: "Booking",
    title: "Pilih jadwal booking",
    description: "Pilih paket, tanggal, jam, dan sesi yang tersedia.",
    cta: "Buat booking",
  };
}

function isInterdayPriceUnit(value?: string) {
  return ["day", "week", "month", "year"].includes(String(value || "").toLowerCase());
}

function getDurationUnitLabel(value?: string, count = 1) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "day") return `${count} hari`;
  if (normalized === "week") return `${count} minggu`;
  if (normalized === "month") return `${count} bulan`;
  if (normalized === "year") return `${count} tahun`;
  return `${count} sesi`;
}

function getPriceUnitLabel(value?: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "hour") return "jam";
  if (normalized === "day") return "hari";
  if (normalized === "week") return "minggu";
  if (normalized === "month") return "bulan";
  if (normalized === "year") return "tahun";
  return normalized || "sesi";
}

function calculateEstimatedDeposit(total: number, enabled?: boolean, percentage?: number) {
  if (!enabled || total <= 0) return 0;
  const safePercentage = Number(percentage || 0);
  if (safePercentage <= 0) return 0;
  const dp = Math.round(total * (safePercentage / 100));
  if (dp < 10000) return Math.min(total, 10000);
  return Math.min(total, dp);
}

function addDurationToDate(dateValue: string, unit: string | undefined, count: number) {
  const date = parseDateValue(dateValue);
  const normalized = String(unit || "").toLowerCase();
  if (normalized === "day") {
    date.setDate(date.getDate() + count);
  } else if (normalized === "week") {
    date.setDate(date.getDate() + count * 7);
  } else if (normalized === "month") {
    date.setMonth(date.getMonth() + count);
  } else if (normalized === "year") {
    date.setFullYear(date.getFullYear() + count);
  }
  return date;
}

function getDateChoices() {
  const today = new Date();
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return {
      value: formatDateInput(date),
      weekday: date.toLocaleDateString("id-ID", { weekday: "short" }),
      day: date.toLocaleDateString("id-ID", { day: "numeric" }),
      month: date.toLocaleDateString("id-ID", { month: "short" }),
      isToday: index === 0,
    };
  });
}

function buildBusyRanges(slots: BusySlot[]) {
  return slots.map((slot) => ({
    id: slot.id,
    start: timeToMinutes(slot.start_time),
    end: timeToMinutes(slot.end_time),
  }));
}

function getSlotStatus(dateValue: string, start: number, end: number, busyRanges: BusyRange[]) {
  const now = new Date();
  const isToday = dateValue === formatDateInput(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const busy = busyRanges.find((range) => start < range.end && end > range.start);

  if (busy) {
    if (isToday && nowMinutes >= busy.end) return "done";
    if (isToday && nowMinutes >= busy.start && nowMinutes < busy.end) return "active";
    return "booked";
  }

  if (isToday && end <= nowMinutes) return "passed";
  return "available";
}

function buildTimedSlots(params: {
  dateValue: string;
  openTime: string;
  closeTime: string;
  unitDuration: number;
  busyRanges: BusyRange[];
  selectedTime: string;
}) {
  const openMinutes = timeToMinutes(params.openTime);
  const closeMinutes = timeToMinutes(params.closeTime);
  const slots: TimeSlot[] = [];

  for (let cursor = openMinutes; cursor + params.unitDuration <= closeMinutes; cursor += params.unitDuration) {
    const startValue = minutesToTime(cursor);
    const endValue = minutesToTime(cursor + params.unitDuration);
    const baseStatus = getSlotStatus(params.dateValue, cursor, cursor + params.unitDuration, params.busyRanges);
    const status = startValue === params.selectedTime && baseStatus === "available" ? "selected" : baseStatus;

    slots.push({
      value: startValue,
      endValue,
      status,
      disabled: baseStatus !== "available",
    });
  }

  return slots;
}

function getMaxAvailableSessions(params: {
  dateValue: string;
  selectedTime: string;
  openTime: string;
  closeTime: string;
  unitDuration: number;
  busyRanges: BusyRange[];
}) {
  if (!params.selectedTime) return 0;

  const now = new Date();
  const isToday = params.dateValue === formatDateInput(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(params.selectedTime);
  const closeMinutes = timeToMinutes(params.closeTime);

  if (isToday && startMinutes < nowMinutes) return 0;
  if (params.busyRanges.some((range) => startMinutes < range.end && startMinutes + params.unitDuration > range.start)) {
    return 0;
  }

  const nextBusy = params.busyRanges
    .filter((range) => range.start >= startMinutes + params.unitDuration)
    .sort((left, right) => left.start - right.start)[0];

  const limit = nextBusy ? Math.min(closeMinutes, nextBusy.start) : closeMinutes;
  const availableMinutes = Math.max(0, limit - startMinutes);
  return Math.max(0, Math.floor(availableMinutes / params.unitDuration));
}

function getSlotBadge(status: SlotStatus) {
  switch (status) {
    case "selected":
      return { label: "Dipilih", text: "#1d4ed8", bg: "#dbeafe", cardBg: "#eff6ff", border: "#93c5fd", title: "#1d4ed8" };
    case "booked":
      return { label: "Dibooking", text: "#b45309", bg: "#fef3c7", cardBg: "#fff7ed", border: "#fdba74", title: "#9a3412" };
    case "active":
      return { label: "Aktif", text: "#0f766e", bg: "#ccfbf1", cardBg: "#f0fdfa", border: "#5eead4", title: "#115e59" };
    case "done":
      return { label: "Selesai", text: "#475569", bg: "#e2e8f0", cardBg: "#f8fafc", border: "#cbd5e1", title: "#475569" };
    case "passed":
      return { label: "Lewat", text: "#94a3b8", bg: "#f1f5f9", cardBg: "#f8fafc", border: "#e2e8f0", title: "#94a3b8" };
    default:
      return { label: "Tersedia", text: "#166534", bg: "#dcfce7", cardBg: "#ffffff", border: "#d9e2ec", title: "#0f172a" };
  }
}

export default function ResourceDetailScreen() {
  const { slug, resourceId } = useLocalSearchParams<{ slug: string; resourceId: string }>();
  const session = useSession();
  const [selectedMainItemId, setSelectedMainItemId] = useState<string>("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [duration, setDuration] = useState(1);
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [time, setTime] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [confirmBookingOpen, setConfirmBookingOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, setNowTick] = useState(() => Date.now());
  const dateChoices = useMemo(() => getDateChoices(), []);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const resourceQuery = useQuery({
    queryKey: ["public-resource-detail", resourceId],
    enabled: Boolean(resourceId),
    queryFn: () => apiFetch<PublicResourceDetail>(`/public/resources/${resourceId}`),
  });

  const profileQuery = useQuery({
    queryKey: ["tenant-public-profile-resource", slug],
    enabled: Boolean(slug),
    queryFn: () => apiFetch<PublicTenantProfile>(makeTenantPath("/public/profile", String(slug))),
  });

  const settingsQuery = useQuery({
    queryKey: ["customer-settings-prefill"],
    enabled: Boolean(session.customerToken),
    queryFn: () => apiFetch<CustomerSettingsResponse>("/user/me/settings", { audience: "customer" }),
  });

  const resource = resourceQuery.data;
  const operatingMode = normalizeOperatingMode(resource?.operating_mode);
  const profile = profileQuery.data;
  const flowMeta = getFlowMeta(operatingMode);
  const gallery = [resource?.image_url, ...(resource?.gallery || [])].filter(Boolean) as string[];
  const items = resource?.items || [];
  const mainItems = items.filter((item) =>
    ["main_option", "main", "console_option"].includes(String(item.item_type || "").toLowerCase()),
  );
  const addonItems = items.filter((item) => String(item.item_type || "").toLowerCase() === "add_on");
  const sellableItems = operatingMode === "direct_sale" ? items : [];
  const selectedMainItem = mainItems.find((item) => item.id === selectedMainItemId) || mainItems[0];
  const isInterday = useMemo(() => isInterdayPriceUnit(selectedMainItem?.price_unit), [selectedMainItem?.price_unit]);
  const unitDuration = Math.max(30, Number(selectedMainItem?.unit_duration || 60));
  const openTime = profile?.open_time || "09:00";
  const closeTime = profile?.close_time || "22:00";

  const availabilityQuery = useQuery({
    queryKey: ["guest-availability", resourceId, date],
    enabled: operatingMode === "timed" && !isInterday && Boolean(resourceId && date),
    queryFn: () => apiFetch<{ busy_slots: BusySlot[] }>(`/guest/availability/${resourceId}?date=${encodeURIComponent(date)}`),
  });

  const busyRanges = useMemo(() => buildBusyRanges(availabilityQuery.data?.busy_slots || []), [availabilityQuery.data?.busy_slots]);
  const timeSlots = useMemo(
    () =>
      buildTimedSlots({
        dateValue: date,
        openTime,
        closeTime,
        unitDuration,
        busyRanges,
        selectedTime: time,
      }),
    [busyRanges, closeTime, date, openTime, time, unitDuration],
  );

  const selectedSlot = timeSlots.find((slot) => slot.value === time);
  const maxAvailableSessions = useMemo(
    () =>
      getMaxAvailableSessions({
        dateValue: date,
        selectedTime: time,
        openTime,
        closeTime,
        unitDuration,
        busyRanges,
      }),
    [busyRanges, closeTime, date, openTime, time, unitDuration],
  );

  const durationChoices = useMemo(
    () =>
      isInterday
        ? Array.from({ length: 6 }, (_, index) => index + 1)
        : Array.from({ length: Math.min(6, maxAvailableSessions || 1) }, (_, index) => index + 1),
    [isInterday, maxAvailableSessions],
  );

  const selectedEndTime = useMemo(() => {
    if (!time) return "";
    return minutesToTime(timeToMinutes(time) + unitDuration * duration);
  }, [duration, time, unitDuration]);
  const selectedPeriodEndDateLabel = useMemo(() => {
    if (!isInterday) return "";
    return addDurationToDate(date, selectedMainItem?.price_unit, duration).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [date, duration, isInterday, selectedMainItem?.price_unit]);
  const selectedDateLabel = useMemo(
    () =>
      parseDateValue(date).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [date],
  );

  useEffect(() => {
    if (operatingMode === "timed" && !selectedMainItemId && mainItems[0]?.id) {
      setSelectedMainItemId(mainItems[0].id);
    }
  }, [mainItems, operatingMode, selectedMainItemId]);

  useEffect(() => {
    if (settingsQuery.data?.customer?.name && !customerName) {
      setCustomerName(settingsQuery.data.customer.name);
    }
    if (settingsQuery.data?.customer?.phone && !customerPhone) {
      setCustomerPhone(settingsQuery.data.customer.phone);
    }
  }, [customerName, customerPhone, settingsQuery.data]);

  useEffect(() => {
    if (operatingMode !== "timed" || isInterday) return;
    if (selectedSlot && selectedSlot.status === "selected") return;

    const nextAvailable = timeSlots.find((slot) => slot.status === "available");
    setTime(nextAvailable?.value || "");
  }, [isInterday, operatingMode, selectedSlot, timeSlots]);

  useEffect(() => {
    if (operatingMode !== "timed" || !isInterday) return;
    setTime(openTime);
  }, [isInterday, openTime, operatingMode]);

  useEffect(() => {
    if (operatingMode !== "timed" || isInterday) return;
    if (!maxAvailableSessions) {
      setDuration(1);
      return;
    }
    if (duration > maxAvailableSessions) {
      setDuration(maxAvailableSessions);
    }
  }, [duration, isInterday, maxAvailableSessions, operatingMode]);

  useEffect(() => {
    if (operatingMode !== "direct_sale") return;
    if (!sellableItems.length) return;
    setItemQuantities((current) => {
      if (Object.keys(current).length > 0) return current;
      const defaults: Record<string, number> = {};
      for (const item of sellableItems) {
        if (item.is_default) defaults[item.id] = 1;
      }
      return defaults;
    });
  }, [operatingMode, sellableItems]);

  const timedTotal = useMemo(() => {
    const base = (selectedMainItem?.price || 0) * duration;
    const addons = addonItems
      .filter((item) => selectedAddons.includes(item.id))
      .reduce((sum, item) => sum + (item.price || 0), 0);
    return base + addons;
  }, [addonItems, duration, selectedAddons, selectedMainItem?.price]);

  const directSaleSelections = useMemo(
    () =>
      sellableItems
        .map((item) => ({ item, quantity: itemQuantities[item.id] || 0 }))
        .filter((entry) => entry.quantity > 0),
    [itemQuantities, sellableItems],
  );

  const directSaleTotal = useMemo(
    () => directSaleSelections.reduce((sum, entry) => sum + (entry.item.price || 0) * entry.quantity, 0),
    [directSaleSelections],
  );

  const total = operatingMode === "direct_sale" ? directSaleTotal : timedTotal;
  const depositPercentage = Number(resource?.dp_percentage || 0);
  const estimatedDeposit = calculateEstimatedDeposit(total, resource?.dp_enabled, depositPercentage);
  const topFacts = [
    resource?.category,
    operatingMode === "direct_sale" ? "Direct sale" : "Booking waktu",
    operatingMode === "timed" ? `${unitDuration} menit / sesi` : null,
  ].filter(Boolean);
  const statusCopy =
    operatingMode === "direct_sale"
      ? directSaleSelections.length
        ? `${directSaleSelections.length} item dipilih`
        : "Pilih item yang mau dibeli"
      : selectedMainItem
        ? isInterday
          ? `${duration} ${getDurationUnitLabel(selectedMainItem.price_unit, duration)}`
          : time
            ? `${selectedDateLabel}, ${time} - ${selectedEndTime || "--"}`
            : "Pilih tanggal dan jam"
        : "Pilih paket utama dulu";

  function toggleAddon(item: PublicResourceItem) {
    setSelectedAddons((current) =>
      current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id],
    );
  }

  function updateQuantity(itemId: string, next: number) {
    setItemQuantities((current) => {
      const safe = Math.max(0, Math.min(99, next));
      if (safe === 0) {
        const { [itemId]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [itemId]: safe };
    });
  }

  async function submitTimedBooking() {
    if (!resourceId || !slug) return;
    if (!selectedMainItem) {
      Alert.alert("Pilih paket", "Pilih paket utama dulu sebelum lanjut booking.");
      return;
    }
    if (!customerName.trim() || customerPhone.replace(/\D/g, "").length < 9) {
      Alert.alert("Data belum lengkap", "Isi nama dan nomor WhatsApp dulu.");
      return;
    }
    if (isInterday) {
      if (!date) {
        Alert.alert("Pilih tanggal", "Pilih tanggal mulai booking dulu.");
        return;
      }
    } else if (!date || !time || !selectedSlot || selectedSlot.status !== "selected") {
      Alert.alert("Pilih slot", "Pilih slot booking yang masih tersedia.");
      return;
    }
    if (!isInterday && duration > maxAvailableSessions) {
      Alert.alert("Durasi terlalu panjang", `Maksimal ${maxAvailableSessions} sesi untuk jam mulai ini.`);
      return;
    }

    const payload = {
      resource_id: String(resourceId),
      customer_name: customerName.trim(),
      customer_phone: customerPhone.replace(/\D/g, ""),
      item_ids: [selectedMainItem.id, ...selectedAddons],
      start_time: buildStartTime(date, time),
      duration,
    };

    const created = await apiFetch<BookingCreateResponse>("/public/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const accessToken = created.booking?.access_token;
    const bookingId = created.booking?.id;

    if (accessToken) {
      const exchanged = await apiFetch<BookingExchangeResponse>("/public/bookings/exchange", {
        method: "POST",
        body: JSON.stringify({ code: accessToken }),
      });
      if (exchanged.customer_token) {
        await session.setCustomerSession(exchanged.customer_token, String(slug));
      }
      router.replace(`/user/me/bookings/${exchanged.booking_id}`);
      return;
    }

    if (bookingId && session.customerToken) {
      router.replace(`/user/me/bookings/${bookingId}`);
      return;
    }

    Alert.alert("Booking dibuat", "Booking berhasil dibuat.");
  }

  async function submitDirectSaleOrder() {
    if (!resourceId || !slug) return;
    if (!customerName.trim() || customerPhone.replace(/\D/g, "").length < 9) {
      Alert.alert("Data belum lengkap", "Isi nama dan nomor WhatsApp dulu.");
      return;
    }
    if (!directSaleSelections.length) {
      Alert.alert("Pilih item", "Pilih minimal satu item untuk dibuatkan order.");
      return;
    }

    const payload = {
      resource_id: String(resourceId),
      customer_name: customerName.trim(),
      customer_phone: customerPhone.replace(/\D/g, ""),
      notes: notes.trim(),
      items: directSaleSelections.map((entry) => ({
        resource_item_id: entry.item.id,
        quantity: entry.quantity,
      })),
    };

    const created = await apiFetch<SalesOrderCreateResponse>("/public/sales-orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const accessToken = created.order?.access_token;
    const orderId = created.order?.id || created.order_id;

    if (accessToken) {
      const exchanged = await apiFetch<SalesOrderExchangeResponse>("/public/sales-orders/exchange", {
        method: "POST",
        body: JSON.stringify({ code: accessToken }),
      });
      if (exchanged.customer_token) {
        await session.setCustomerSession(exchanged.customer_token, String(slug));
      }
      router.replace(`/user/me/orders/${exchanged.order_id}`);
      return;
    }

    if (orderId && session.customerToken) {
      router.replace(`/user/me/orders/${orderId}`);
      return;
    }

    Alert.alert("Order dibuat", "Order berhasil dibuat.");
  }

  async function submit() {
    if (operatingMode === "timed") {
      if (!selectedMainItem) {
        Alert.alert("Pilih paket", "Pilih paket utama dulu sebelum lanjut booking.");
        return;
      }
      if (!customerName.trim() || customerPhone.replace(/\D/g, "").length < 9) {
        Alert.alert("Data belum lengkap", "Isi nama dan nomor WhatsApp dulu.");
        return;
      }
      if (isInterday) {
        if (!date) {
          Alert.alert("Pilih tanggal", "Pilih tanggal mulai booking dulu.");
          return;
        }
      } else if (!date || !time || !selectedSlot || selectedSlot.status !== "selected") {
        Alert.alert("Pilih slot", "Pilih slot booking yang masih tersedia.");
        return;
      }
      if (!isInterday && duration > maxAvailableSessions) {
        Alert.alert("Durasi terlalu panjang", `Maksimal ${maxAvailableSessions} sesi untuk jam mulai ini.`);
        return;
      }
      setConfirmBookingOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      await session.setTenantSlug(String(slug));
      await submitDirectSaleOrder();
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error ? error.message : "Order belum berhasil dibuat.";
      Alert.alert("Order gagal", message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmTimedBooking() {
    setConfirmBookingOpen(false);
    setSubmitting(true);
    try {
      await session.setTenantSlug(String(slug));
      await submitTimedBooking();
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error ? error.message : "Booking belum berhasil dibuat.";
      Alert.alert("Booking gagal", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenShell eyebrow={flowMeta.eyebrow} title={resource?.name || "Detail resource"} description={resource?.description || flowMeta.description}>
      <View style={{ gap: 12 }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {(gallery.length ? gallery : [""]).map((source, index) => (
            <View
              key={`${source || "fallback"}-${index}`}
              style={{
                width: 356,
                height: 236,
                borderRadius: 24,
                overflow: "hidden",
                backgroundColor: "#f8fafc",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {source ? (
                <Image source={source} contentFit="cover" style={{ width: "100%", height: "100%" }} />
              ) : (
                <View style={{ alignItems: "center", gap: 10 }}>
                  <MaterialIcons name="image" size={36} color="#94a3b8" />
                  <Text selectable style={{ color: "#64748b", fontSize: 13, fontWeight: "700" }}>
                    Visual belum ditambahkan
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {topFacts.map((item) => (
            <View
              key={String(item)}
              style={{
                borderRadius: 999,
                backgroundColor: "#eff6ff",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text selectable style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "800" }}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 18,
              backgroundColor: "#f8fafc",
              paddingHorizontal: 14,
              paddingVertical: 14,
              gap: 4,
            }}
          >
            <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              JADWAL
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900", lineHeight: 22 }}>
              {statusCopy}
            </Text>
          </View>

          <View
            style={{
              width: 112,
              borderRadius: 18,
              backgroundColor: "#eff6ff",
              paddingHorizontal: 14,
              paddingVertical: 14,
              gap: 4,
              justifyContent: "center",
            }}
          >
            <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              MULAI
            </Text>
            <Text selectable style={{ color: "#1d4ed8", fontSize: 22, fontWeight: "900" }}>
              {formatCurrency(total || selectedMainItem?.price || 0)}
            </Text>
          </View>
        </View>

        <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
          {operatingMode === "direct_sale"
            ? "Pilih item, isi kontak, lalu buat order."
            : "Pilih paket, tentukan jadwal, lalu lanjutkan booking."}
        </Text>
      </View>

      <CardBlock>
        <View style={{ gap: 2 }}>
          <Text selectable style={{ color: "#2563eb", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 }}>
            LANGKAH 1
          </Text>
          <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
            {operatingMode === "direct_sale" ? "Pilih item" : "Pilih paket"}
          </Text>
          <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
            {operatingMode === "direct_sale"
              ? "Tentukan item yang ingin dibeli."
              : "Pilih satu paket utama yang paling sesuai."}
          </Text>
        </View>

        {operatingMode === "direct_sale" ? (
          <View style={{ gap: 10 }}>
            {sellableItems.map((item) => {
              const quantity = itemQuantities[item.id] || 0;
              return (
                <View
                  key={item.id}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: quantity > 0 ? "#bfdbfe" : "#e2e8f0",
                    backgroundColor: quantity > 0 ? "#f8fbff" : "#ffffff",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                        {item.name}
                      </Text>
                      <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                        {formatCurrency(item.price)}
                      </Text>
                    </View>
                    <View
                      style={{
                        borderRadius: 999,
                        backgroundColor: "#eff6ff",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text selectable style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "800" }}>
                        {item.item_type || "item"}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                      Pilih jumlah
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Pressable
                        onPress={() => updateQuantity(item.id, quantity - 1)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 12,
                          backgroundColor: "#f1f5f9",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialIcons name="remove" size={18} color="#334155" />
                      </Pressable>
                      <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800", minWidth: 18, textAlign: "center" }}>
                        {quantity}
                      </Text>
                      <Pressable
                        onPress={() => updateQuantity(item.id, quantity + 1)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 12,
                          backgroundColor: "#eff6ff",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialIcons name="add" size={18} color="#2563eb" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {mainItems.map((item) => {
              const active = selectedMainItem?.id === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedMainItemId(item.id)}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: active ? "#2563eb" : "#d9e2ec",
                    backgroundColor: active ? "#f8fbff" : "#ffffff",
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                        {item.name}
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {item.unit_duration ? (
                          <View
                            style={{
                              borderRadius: 999,
                              backgroundColor: active ? "#dbeafe" : "#f1f5f9",
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                            }}
                          >
                            <Text selectable style={{ color: active ? "#1d4ed8" : "#475569", fontSize: 11, fontWeight: "800" }}>
                              {item.unit_duration} menit / sesi
                            </Text>
                          </View>
                        ) : null}
                        {item.price_unit ? (
                          <View
                            style={{
                              borderRadius: 999,
                              backgroundColor: active ? "#dbeafe" : "#f8fafc",
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                            }}
                          >
                            <Text selectable style={{ color: active ? "#1d4ed8" : "#64748b", fontSize: 11, fontWeight: "800" }}>
                              Per {getPriceUnitLabel(item.price_unit)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                      <Text selectable style={{ color: "#1d4ed8", fontSize: 20, fontWeight: "900" }}>
                        {formatCurrency(item.price)}
                      </Text>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          borderWidth: 1.5,
                          borderColor: active ? "#2563eb" : "#cbd5e1",
                          backgroundColor: active ? "#2563eb" : "#ffffff",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {active ? <MaterialIcons name="check" size={14} color="#ffffff" /> : null}
                      </View>
                    </View>
                  </View>
                  <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                    {active ? "Paket ini dipakai untuk hitung jadwal dan total." : "Pilih untuk lanjut ke jadwal."}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </CardBlock>

      {operatingMode === "timed" && addonItems.length ? (
        <CardBlock>
          <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
            Add-on
          </Text>
          <View style={{ gap: 10 }}>
            {addonItems.map((item) => {
              const active = selectedAddons.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleAddon(item)}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: active ? "#2563eb" : "#e2e8f0",
                    backgroundColor: active ? "#eff6ff" : "#ffffff",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                      {item.name}
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                      {formatCurrency(item.price)}
                    </Text>
                  </View>
                  <MaterialIcons
                    name={active ? "check-circle" : "radio-button-unchecked"}
                    size={20}
                    color={active ? "#2563eb" : "#94a3b8"}
                  />
                </Pressable>
              );
            })}
          </View>
        </CardBlock>
      ) : null}

      {operatingMode === "timed" ? (
        <CardBlock>
          <View style={{ gap: 2 }}>
            <Text selectable style={{ color: "#2563eb", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 }}>
              LANGKAH 2
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
              Pilih jadwal booking
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
              Pilih tanggal, lalu tentukan jam mulai yang masih tersedia.
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                  TANGGAL
                </Text>
                <Text selectable style={{ color: "#94a3b8", fontSize: 12 }}>
                  {parseDateValue(date).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                </Text>
              </View>

              <Pressable
                onPress={() => setCalendarOpen(true)}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#d9e2ec",
                  backgroundColor: "#f8fafc",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: "#ffffff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="calendar-month" size={18} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                      {selectedDateLabel}
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                      Tap untuk ganti tanggal
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="expand-more" size={22} color="#94a3b8" />
              </Pressable>
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                  {isInterday ? "PERIODE" : "JAM MULAI"}
                </Text>
                {isInterday ? (
                  <Text selectable style={{ color: "#94a3b8", fontSize: 12 }}>
                    {selectedMainItem?.price_unit || "periode"}
                  </Text>
                ) : (
                  <Text selectable style={{ color: "#94a3b8", fontSize: 12 }}>
                    {openTime} - {closeTime} / {unitDuration} menit
                  </Text>
                )}
              </View>

              {isInterday ? (
                <View
                  style={{
                    borderRadius: 16,
                    backgroundColor: "#f8fafc",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    gap: 10,
                  }}
                >
                  <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                    Booking periodik
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                    Untuk paket {String(selectedMainItem?.price_unit || "").toLowerCase()}, kamu cukup pilih tanggal mulai dan durasinya. Jam mulai akan mengikuti jam buka tenant.
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 16,
                        backgroundColor: "#eff6ff",
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        gap: 3,
                      }}
                    >
                      <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                        MULAI
                      </Text>
                      <Text selectable style={{ color: "#1d4ed8", fontSize: 15, fontWeight: "900" }}>
                        {selectedDateLabel}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 16,
                        backgroundColor: "#f8fafc",
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        gap: 3,
                      }}
                    >
                      <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                        BERAKHIR
                      </Text>
                      <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "900" }}>
                        {selectedPeriodEndDateLabel || "--"}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    {timeSlots.map((slot) => {
                      const badge = getSlotBadge(slot.status);
                      const active = slot.status === "selected";
                      return (
                        <Pressable
                          key={slot.value}
                          disabled={slot.disabled}
                          onPress={() => setTime(slot.value)}
                          style={{
                            width: "31%",
                            minWidth: 94,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: badge.border,
                            backgroundColor: badge.cardBg,
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            alignItems: "flex-start",
                            gap: 6,
                            opacity: slot.status === "passed" || slot.status === "done" ? 0.76 : 1,
                          }}
                        >
                          <Text selectable style={{ color: badge.title, fontSize: 15, fontWeight: "800" }}>
                            {slot.value}
                          </Text>
                          <Text selectable style={{ color: slot.status === "passed" || slot.status === "done" ? "#94a3b8" : "#64748b", fontSize: 11 }}>
                            sampai {slot.endValue}
                          </Text>
                          <View
                            style={{
                              borderRadius: 999,
                              backgroundColor: badge.bg,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                            }}
                          >
                            <Text selectable style={{ color: badge.text, fontSize: 10, fontWeight: "800" }}>
                              {badge.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {!timeSlots.length ? (
                    <View
                    style={{
                      borderRadius: 16,
                      backgroundColor: "#f8fafc",
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      }}
                    >
                      <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                        Belum ada slot yang bisa dipakai di tanggal ini.
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                  DURASI
                </Text>
                <Text selectable style={{ color: "#94a3b8", fontSize: 12 }}>
                  Maks {maxAvailableSessions || 0} sesi
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {(durationChoices.length ? durationChoices : [1, 2, 3]).map((value) => {
                  const active = duration === value;
                  const disabled = !isInterday && value > maxAvailableSessions;
                  return (
                    <Pressable
                      key={value}
                      disabled={disabled}
                      onPress={() => setDuration(value)}
                      style={{
                        minWidth: 82,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: active ? "#2563eb" : "#e2e8f0",
                        backgroundColor: active ? "#eff6ff" : "#ffffff",
                        paddingHorizontal: 16,
                        paddingVertical: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: disabled ? 0.5 : 1,
                      }}
                    >
                      <Text selectable style={{ color: active ? "#1d4ed8" : "#475569", fontSize: 13, fontWeight: "800" }}>
                        {getDurationUnitLabel(selectedMainItem?.price_unit, value)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {!isInterday ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: "#eff6ff",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      gap: 3,
                    }}
                  >
                    <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                      MULAI
                    </Text>
                    <Text selectable style={{ color: "#1d4ed8", fontSize: 16, fontWeight: "900" }}>
                      {time || "--:--"}
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: "#f8fafc",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      gap: 3,
                    }}
                  >
                    <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                      SELESAI
                    </Text>
                    <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "900" }}>
                      {selectedEndTime || "--:--"}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(15,23,42,0.42)",
                paddingHorizontal: 18,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: "100%",
                  maxWidth: 360,
                  borderRadius: 28,
                  backgroundColor: "#ffffff",
                  padding: 18,
                  gap: 14,
                  shadowColor: "#020617",
                  shadowOpacity: 0.12,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 6,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ gap: 2 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
                      Pilih tanggal
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                      {parseDateValue(date).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setCalendarOpen(false)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: "#f8fafc",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="close" size={20} color="#475569" />
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {dateChoices.map((choice) => {
                    const active = choice.value === date;
                    return (
                      <Pressable
                        key={choice.value}
                        onPress={() => {
                          setDate(choice.value);
                          setCalendarOpen(false);
                        }}
                        style={{
                          width: "22.7%",
                          minWidth: 70,
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: active ? "#2563eb" : "#e2e8f0",
                          backgroundColor: active ? "#2563eb" : "#ffffff",
                          paddingVertical: 10,
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <Text selectable style={{ color: active ? "#dbeafe" : "#94a3b8", fontSize: 11, fontWeight: "700" }}>
                          {choice.weekday}
                        </Text>
                        <Text selectable style={{ color: active ? "#ffffff" : "#0f172a", fontSize: 17, fontWeight: "900" }}>
                          {choice.day}
                        </Text>
                        <Text selectable style={{ color: active ? "#dbeafe" : "#64748b", fontSize: 11, fontWeight: "700" }}>
                          {choice.isToday ? "Hari ini" : choice.month}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </Modal>

          <Modal visible={confirmBookingOpen} transparent animationType="fade" onRequestClose={() => setConfirmBookingOpen(false)}>
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(15,23,42,0.42)",
                justifyContent: "flex-end",
              }}
            >
              <View
                style={{
                  width: "100%",
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  backgroundColor: "#ffffff",
                  paddingHorizontal: 20,
                  paddingTop: 12,
                  paddingBottom: 24,
                  gap: 18,
                  shadowColor: "#020617",
                  shadowOpacity: 0.12,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 6,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 999,
                    backgroundColor: "#d9e2ec",
                    alignSelf: "center",
                  }}
                />
                <View style={{ gap: 6 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 22, fontWeight: "900" }}>
                    Cek booking
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                    Ringkasannya sudah siap. Kalau sudah benar, lanjutkan buat booking.
                  </Text>
                </View>

                <View
                  style={{
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: "#eef2f7",
                    backgroundColor: "#ffffff",
                    padding: 18,
                    gap: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: "#f1f5f9",
                        backgroundColor: "#fcfdff",
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        gap: 4,
                      }}
                    >
                      <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                        PAKET
                      </Text>
                      <Text selectable numberOfLines={2} style={{ color: "#0f172a", fontSize: 14, fontWeight: "800", lineHeight: 18 }}>
                        {selectedMainItem?.name || "-"}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 96,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: "#dbeafe",
                        backgroundColor: "#f8fbff",
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        gap: 4,
                        justifyContent: "center",
                      }}
                    >
                      <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                        DURASI
                      </Text>
                      <Text selectable style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "900" }}>
                        {getDurationUnitLabel(selectedMainItem?.price_unit, duration)}
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <Text selectable style={{ color: "#64748b", fontSize: 12 }}>Tanggal</Text>
                      <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800", flex: 1, textAlign: "right" }}>
                        {selectedDateLabel}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <Text selectable style={{ color: "#64748b", fontSize: 12 }}>Waktu</Text>
                      <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800", flex: 1, textAlign: "right" }}>
                        {isInterday ? `${openTime} / ${getDurationUnitLabel(selectedMainItem?.price_unit, duration)}` : `${time} - ${selectedEndTime}`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <Text selectable style={{ color: "#64748b", fontSize: 12 }}>Kontak</Text>
                      <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800", flex: 1, textAlign: "right" }}>
                        {customerPhone || "-"}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: "#eef2f7",
                      backgroundColor: "#fcfdff",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      gap: 12,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                          TOTAL
                        </Text>
                        <Text selectable style={{ color: "#1d4ed8", fontSize: 26, fontWeight: "900" }}>
                          {formatCurrency(total)}
                        </Text>
                      </View>
                      <View
                        style={{
                          borderRadius: 999,
                          backgroundColor: "#eff6ff",
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                      >
                        <Text selectable style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "800" }}>
                          {isInterday ? "Periode" : "1 booking"}
                        </Text>
                      </View>
                    </View>

                    {estimatedDeposit > 0 ? (
                      <View
                        style={{
                          borderTopWidth: 1,
                          borderTopColor: "#e8eef5",
                          paddingTop: 12,
                          gap: 10,
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                              DP SAAT BOOKING
                            </Text>
                            <Text selectable style={{ color: "#0f172a", fontSize: 22, fontWeight: "900" }}>
                              {formatCurrency(estimatedDeposit)}
                            </Text>
                          </View>
                          <View style={{ alignItems: "flex-end", gap: 2 }}>
                            <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                              SISA
                            </Text>
                            <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800", textAlign: "right" }}>
                              {formatCurrency(Math.max(total - estimatedDeposit, 0))}
                            </Text>
                          </View>
                        </View>
                        <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
                          DP mengikuti policy tenant sebesar {depositPercentage}% dari total booking.
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={{ gap: 10 }}>
                  <CtaButton
                    label={submitting ? "Memproses..." : "Konfirmasi booking"}
                    disabled={submitting}
                    onPress={() => void confirmTimedBooking()}
                  />
                  <Pressable onPress={() => setConfirmBookingOpen(false)} style={{ alignItems: "center", paddingVertical: 6 }}>
                    <Text selectable style={{ color: "#64748b", fontSize: 13, fontWeight: "700" }}>
                      Ubah pilihan
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </CardBlock>
      ) : null}

      <CardBlock>
        <View style={{ gap: 2 }}>
          <Text selectable style={{ color: "#2563eb", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 }}>
            LANGKAH 3
          </Text>
          <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
            Isi data customer
          </Text>
          <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
            Data ini dipakai untuk akses detail booking dan pembayaran.
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          <Field
            label="Nama customer"
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Nama lengkap"
          />
          <Field
            label="WhatsApp"
            value={customerPhone}
            onChangeText={(value) => setCustomerPhone(value.replace(/\D/g, ""))}
            keyboardType="phone-pad"
            placeholder="08xxxxxxxxxx"
          />
          {operatingMode === "direct_sale" ? (
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Catatan order"
              placeholderTextColor="#94a3b8"
              multiline
              style={{
                minHeight: 88,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#d9e2ec",
                backgroundColor: "#f8fafc",
                paddingHorizontal: 14,
                paddingVertical: 14,
                color: "#0f172a",
                fontSize: 14,
                textAlignVertical: "top",
              }}
            />
          ) : null}
        </View>
      </CardBlock>

      <CardBlock>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
              ESTIMASI TOTAL
            </Text>
            <Text selectable style={{ color: "#1d4ed8", fontSize: 28, fontWeight: "900" }}>
              {formatCurrency(total)}
            </Text>
          </View>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: "#eff6ff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons
              name={operatingMode === "direct_sale" ? "shopping-bag" : "receipt-long"}
              size={24}
              color="#2563eb"
            />
          </View>
        </View>
        <CtaButton
          label={submitting ? "Memproses..." : flowMeta.cta}
          disabled={
            submitting ||
            (operatingMode === "timed" &&
              (isInterday
                ? !date
                : !time || !selectedSlot || selectedSlot.status !== "selected" || duration > maxAvailableSessions))
          }
          onPress={() => void submit()}
        />
      </CardBlock>
    </ScreenShell>
  );
}
