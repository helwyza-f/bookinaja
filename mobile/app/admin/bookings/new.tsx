import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ConfirmModal } from "@/components/confirm-modal";
import { CtaButton } from "@/components/cta-button";
import { EmptyStateCard, FilterChip, SectionHeader, StatusPill } from "@/components/admin-primitives";
import { Field } from "@/components/field";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useToast } from "@/hooks/use-toast";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { hasAdminPermission } from "@/lib/admin-access";
import { formatCurrency } from "@/lib/format";

type ResourceItem = {
  id: string;
  name: string;
  item_type?: string;
  price?: number;
  price_unit?: string;
  unit_duration?: number;
  is_default?: boolean;
};

type PricingCatalogRow = {
  resource_id: string;
  resource_name: string;
  category?: string;
  operating_mode?: string;
  main_items?: ResourceItem[];
};

type AddonCatalogRow = {
  resource_id: string;
  addons?: ResourceItem[];
};

type ResourceRow = {
  id: string;
  name: string;
  category?: string;
  operating_mode?: string;
  items: ResourceItem[];
};

type AdminProfile = {
  open_time?: string;
  close_time?: string;
};

type BusySlot = {
  id?: string;
  start_time: string;
  end_time: string;
  status?: string;
};

type BusyRange = {
  start: number;
  end: number;
};

type SlotStatus = "available" | "selected" | "booked" | "passed";

type TimeSlot = {
  value: string;
  endValue: string;
  status: SlotStatus;
  disabled: boolean;
};

function formatAmount(value?: number) {
  const formatted = formatCurrency(value || 0);
  return formatted === "Cek harga" ? "Rp 0" : formatted;
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = String(value || "00:00")
    .split(":")
    .map((part) => Number(part || 0));
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function buildBusyRanges(slots: BusySlot[]) {
  return slots.map((slot) => ({
    start: timeToMinutes(slot.start_time),
    end: timeToMinutes(slot.end_time),
  }));
}

function getSlotStatus(
  dateValue: string,
  startMinutes: number,
  endMinutes: number,
  busyRanges: BusyRange[],
): SlotStatus {
  const now = new Date();
  const isToday = formatDateInput(now) === dateValue;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (busyRanges.some((range) => startMinutes < range.end && endMinutes > range.start)) {
    return "booked";
  }
  if (isToday && startMinutes < nowMinutes) {
    return "passed";
  }
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

function nextSevenDays() {
  const base = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(base);
    next.setDate(base.getDate() + index);
    return next;
  });
}

export default function AdminNewBookingScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const guard = useAuthGuard("admin");
  const identity = useAdminIdentity();
  const { showToast } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [selectedMainId, setSelectedMainId] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [bookingMode, setBookingMode] = useState<"scheduled" | "walkin">("scheduled");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canCreate = hasAdminPermission(identity.data, "bookings.create");

  const setupQuery = useQuery({
    queryKey: ["admin-mobile-booking-manual-setup"],
    enabled: guard.ready && canCreate,
    queryFn: async () => {
      const [pricingRes, addonRes, profileRes] = await Promise.all([
        apiFetch<{ items?: PricingCatalogRow[] }>("/admin/resources/pricing-catalog", {
          audience: "admin",
        }),
        apiFetch<{ items?: AddonCatalogRow[] }>("/admin/resources/addons-catalog", {
          audience: "admin",
        }),
        apiFetch<AdminProfile>("/admin/profile", { audience: "admin" }),
      ]);

      const addonsByResource = new Map(
        (addonRes.items || []).map((item) => [
          item.resource_id,
          (item.addons || []).map((addon) => ({
            ...addon,
            item_type: addon.item_type || "add_on",
          })),
        ]),
      );

      const resources: ResourceRow[] = (pricingRes.items || [])
        .map((item) => ({
          id: item.resource_id,
          name: item.resource_name,
          category: item.category,
          operating_mode: item.operating_mode,
          items: [
            ...((item.main_items || []).map((mainItem) => ({
              ...mainItem,
              item_type: "main_option",
            })) || []),
            ...(addonsByResource.get(item.resource_id) || []),
          ],
        }))
        .filter((item) => String(item.operating_mode || "timed").toLowerCase() !== "direct_sale");

      return {
        resources,
        profile: profileRes,
      };
    },
  });

  const resources = setupQuery.data?.resources || [];
  const profile = setupQuery.data?.profile;
  const currentResource = resources.find((item) => item.id === selectedResourceId) || null;
  const mainItems = (currentResource?.items || []).filter((item) => item.item_type === "main_option");
  const addonItems = (currentResource?.items || []).filter((item) => item.item_type === "add_on");
  const selectedMainItem =
    mainItems.find((item) => item.id === selectedMainId) ||
    mainItems.find((item) => item.is_default) ||
    mainItems[0] ||
    null;
  const unitDuration = Math.max(30, Number(selectedMainItem?.unit_duration || 60));
  const openTime = profile?.open_time || "09:00";
  const closeTime = profile?.close_time || "22:00";

  const availabilityQuery = useQuery({
    queryKey: ["admin-manual-booking-availability", selectedResourceId, selectedDate],
    enabled: guard.ready && Boolean(selectedResourceId && selectedDate),
    queryFn: () =>
      apiFetch<{ busy_slots: BusySlot[] }>(
        `/guest/availability/${selectedResourceId}?date=${encodeURIComponent(selectedDate)}`,
      ),
  });

  const busyRanges = useMemo(
    () => buildBusyRanges(availabilityQuery.data?.busy_slots || []),
    [availabilityQuery.data?.busy_slots],
  );

  const timeSlots = useMemo(
    () =>
      buildTimedSlots({
        dateValue: selectedDate,
        openTime,
        closeTime,
        unitDuration,
        busyRanges,
        selectedTime,
      }),
    [busyRanges, closeTime, openTime, selectedDate, selectedTime, unitDuration],
  );

  const maxAvailableSessions = useMemo(
    () =>
      getMaxAvailableSessions({
        dateValue: selectedDate,
        selectedTime,
        closeTime,
        unitDuration,
        busyRanges,
      }),
    [busyRanges, closeTime, selectedDate, selectedTime, unitDuration],
  );

  const durationChoices = useMemo(
    () => Array.from({ length: Math.min(6, Math.max(maxAvailableSessions, 1)) }, (_, index) => index + 1),
    [maxAvailableSessions],
  );

  const total = useMemo(() => {
    const main = Number(selectedMainItem?.price || 0) * duration;
    const addons = addonItems
      .filter((item) => selectedAddons.includes(item.id))
      .reduce((sum, item) => sum + Number(item.price || 0), 0);
    return main + addons;
  }, [addonItems, duration, selectedAddons, selectedMainItem?.price]);

  useEffect(() => {
    if (!selectedResourceId && resources[0]?.id) {
      setSelectedResourceId(resources[0].id);
    }
  }, [resources, selectedResourceId]);

  useEffect(() => {
    if (selectedResourceId && mainItems.length && !selectedMainId) {
      setSelectedMainId((selectedMainItem?.id as string) || mainItems[0].id);
    }
  }, [mainItems, selectedMainId, selectedMainItem?.id, selectedResourceId]);

  useEffect(() => {
    if (params.mode === "walkin") {
      setBookingMode("walkin");
      return;
    }
    if (params.mode === "scheduled") {
      setBookingMode("scheduled");
    }
  }, [params.mode]);

  function toggleAddon(itemId: string) {
    setSelectedAddons((current) =>
      current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId],
    );
  }

  function buildStartTime() {
    const time = bookingMode === "walkin" ? selectedTime || openTime : selectedTime;
    return `${selectedDate}T${time}:00`;
  }

  async function submit() {
    if (!canCreate) return;
    if (!selectedResourceId || !selectedMainItem) {
      showToast({ title: "Pilih paket", message: "Pilih resource dan paket utama dulu.", tone: "warning" });
      return;
    }
    if (!customerName.trim() || customerPhone.replace(/\D/g, "").length < 9) {
      showToast({ title: "Data belum lengkap", message: "Isi nama dan nomor customer dulu.", tone: "warning" });
      return;
    }
    if (!selectedTime) {
      showToast({ title: "Pilih slot", message: "Pilih jam booking yang masih tersedia.", tone: "warning" });
      return;
    }
    if (duration > maxAvailableSessions) {
      showToast({
        title: "Durasi terlalu panjang",
        message: `Maksimal ${maxAvailableSessions} sesi untuk jam mulai ini.`,
        tone: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      const created = await apiFetch<{ booking_id?: string; booking?: { id?: string } }>(
        "/bookings/manual",
        {
          audience: "admin",
          method: "POST",
          body: JSON.stringify({
            resource_id: selectedResourceId,
            customer_name: customerName.trim(),
            customer_phone: customerPhone.replace(/\D/g, ""),
            item_ids: [selectedMainItem.id, ...selectedAddons],
            start_time: buildStartTime(),
            duration,
            promo_code: promoCode.trim(),
            booking_mode: bookingMode,
          }),
        },
      );
      const nextId = String(created.booking?.id || created.booking_id || "").trim();
      showToast({
        title: "Berhasil",
        message: "Booking manual berhasil dibuat.",
        tone: "success",
      });
      if (nextId) {
        router.replace({ pathname: "/admin/bookings/[id]", params: { id: nextId } });
        return;
      }
      router.replace("/admin/bookings");
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal",
        message: err.message || "Booking manual belum berhasil dibuat.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  if (!canCreate) {
    return (
      <ScreenShell
        eyebrow="Admin booking"
        title="Akses dibatasi"
        description="Role kamu belum punya izin membuat booking manual."
      >
        <CtaButton label="Kembali ke bookings" tone="secondary" onPress={() => router.replace("/admin/bookings")} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      eyebrow="Admin booking"
      title="Booking baru"
      description="Susun customer, pilih slot, lalu kirim booking manual dari mobile."
      includeBottomSafeArea={false}
    >
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/admin/bookings"))}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <MaterialCommunityIcons name="chevron-left" size={16} color="#64748b" />
          <Text selectable style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>
            Kembali
          </Text>
        </View>
      </Pressable>

      <CardBlock>
        <SectionHeader
          title="Mode booking"
          description="Scheduled untuk booking ke depan, walk-in untuk customer yang langsung datang."
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { key: "scheduled" as const, label: "Scheduled" },
            { key: "walkin" as const, label: "Walk-in" },
          ].map((item) => {
            const active = bookingMode === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setBookingMode(item.key)}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: active ? "#2563eb" : "#dbe2ea",
                  backgroundColor: active ? "#eff6ff" : "#ffffff",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <Text selectable style={{ color: active ? "#1d4ed8" : "#0f172a", fontSize: 14, fontWeight: "800", textAlign: "center" }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </CardBlock>

      <CardBlock>
        <SectionHeader
          title="Customer"
          description="Isi data kontak utama agar booking mudah ditindaklanjuti."
        />
        <Field
          label="Nama customer"
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Nama customer"
        />
        <Field
          label="Nomor WhatsApp"
          value={customerPhone}
          onChangeText={setCustomerPhone}
          placeholder="08xxxxxxxxxx"
          keyboardType="phone-pad"
        />
        <Field
          label="Kode promo"
          hint="Opsional"
          value={promoCode}
          onChangeText={setPromoCode}
          placeholder="PROMO10"
          autoCapitalize="characters"
        />
      </CardBlock>

      <CardBlock>
        <SectionHeader
          title="Pilih resource"
          description="Tentukan unit dulu, lalu paket dan add-on akan menyesuaikan."
        />
        {resources.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {resources.map((item) => {
              const active = selectedResourceId === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSelectedResourceId(item.id);
                    setSelectedMainId("");
                    setSelectedAddons([]);
                    setSelectedTime("");
                    setDuration(1);
                  }}
                  style={{
                    width: 190,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: active ? "#2563eb" : "#dbe2ea",
                    backgroundColor: active ? "#eff6ff" : "#ffffff",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800", flex: 1 }}>
                      {item.name}
                    </Text>
                    {active ? <StatusPill label="Dipilih" tone="blue" /> : null}
                  </View>
                  <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                    {item.category || "Resource"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <EmptyStateCard
            title="Resource belum siap"
            description="Belum ada resource timed yang bisa dipakai untuk booking manual."
          />
        )}
      </CardBlock>

      {mainItems.length ? (
        <CardBlock>
          <SectionHeader
            title="Paket utama"
            description="Pilih paket dasar untuk menentukan harga dan durasi per sesi."
          />
          <View style={{ gap: 10 }}>
            {mainItems.map((item) => {
              const active = selectedMainItem?.id === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSelectedMainId(item.id);
                    setSelectedTime("");
                    setDuration(1);
                  }}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: active ? "#2563eb" : "#e2e8f0",
                    backgroundColor: active ? "#eff6ff" : "#ffffff",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    gap: 4,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800", flex: 1 }}>
                      {item.name}
                    </Text>
                    {active ? <StatusPill label="Aktif" tone="blue" /> : null}
                  </View>
                  <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                    {formatAmount(item.price)} / {item.price_unit || `${Number(item.unit_duration || 60)} menit`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </CardBlock>
      ) : null}

      {!!addonItems.length ? (
        <CardBlock>
          <SectionHeader
            title="Add-on"
            description="Tambahkan item pendamping bila customer membutuhkannya."
          />
          <View style={{ gap: 10 }}>
            {addonItems.map((item) => {
              const active = selectedAddons.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleAddon(item.id)}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: active ? "#2563eb" : "#e2e8f0",
                    backgroundColor: active ? "#eff6ff" : "#ffffff",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                      {item.name}
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                      {formatAmount(item.price)}
                    </Text>
                  </View>
                  {active ? (
                    <MaterialCommunityIcons name="check-circle" size={20} color="#2563eb" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </CardBlock>
      ) : null}

      <CardBlock>
        <SectionHeader
          title="Jadwal"
          description="Pilih tanggal, slot tersedia, lalu tentukan jumlah sesi yang masih aman."
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {nextSevenDays().map((date) => {
            const value = formatDateInput(date);
            const active = selectedDate === value;
            return (
              <Pressable
                key={value}
                onPress={() => {
                  setSelectedDate(value);
                  setSelectedTime("");
                  setDuration(1);
                }}
                style={{
                  width: 86,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: active ? "#2563eb" : "#dbe2ea",
                  backgroundColor: active ? "#eff6ff" : "#ffffff",
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  gap: 4,
                }}
              >
                <Text selectable style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>
                  {date.toLocaleDateString("id-ID", { weekday: "short" })}
                </Text>
                <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "900" }}>
                  {date.toLocaleDateString("id-ID", { day: "2-digit" })}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {timeSlots.map((slot) => {
            const active = slot.status === "selected";
            const tone =
              slot.status === "booked" ? "amber" :
              slot.status === "passed" ? "slate" :
              active ? "blue" : undefined;

            return (
              <Pressable
                key={slot.value}
                disabled={slot.disabled}
                onPress={() => {
                  setSelectedTime(slot.value);
                  setDuration(1);
                }}
                style={{
                  width: "31%",
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: active ? "#2563eb" : slot.disabled ? "#e2e8f0" : "#dbe2ea",
                  backgroundColor: active ? "#eff6ff" : slot.disabled ? "#f8fafc" : "#ffffff",
                  paddingHorizontal: 10,
                  paddingVertical: 12,
                  gap: 6,
                  opacity: slot.disabled ? 0.65 : 1,
                }}
              >
                <Text selectable style={{ color: active ? "#1d4ed8" : "#0f172a", fontSize: 13, fontWeight: "800" }}>
                  {slot.value}
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 11 }}>
                  s/d {slot.endValue}
                </Text>
                {tone ? (
                  <StatusPill
                    label={slot.status === "booked" ? "Booked" : slot.status === "passed" ? "Lewat" : "Dipilih"}
                    tone={tone}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 10 }}>
          <SectionHeader
            title="Durasi"
            description={`Maks ${maxAvailableSessions || 0} sesi untuk jam mulai ini.`}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {durationChoices.map((value) => (
              <FilterChip
                key={value}
                label={`${value} sesi`}
                active={duration === value}
                onPress={() => setDuration(value)}
              />
            ))}
          </View>
        </View>
      </CardBlock>

      <CardBlock>
        <SectionHeader
          title="Ringkasan booking"
          description="Periksa ulang detail utama sebelum booking dibuat."
        />
        <View style={{ gap: 10 }}>
          <SummaryRow label="Mode" value={bookingMode === "walkin" ? "Walk-in" : "Scheduled"} />
          <SummaryRow label="Resource" value={currentResource?.name || "-"} />
          <SummaryRow label="Paket" value={selectedMainItem?.name || "-"} />
          <SummaryRow label="Mulai" value={selectedTime ? `${selectedDate} ${selectedTime}` : "-"} />
          <SummaryRow label="Durasi" value={`${duration} sesi`} />
          <SummaryRow label="Total" value={formatAmount(total)} strong />
        </View>
        <CtaButton
          label={submitting ? "Memproses..." : "Buat booking"}
          onPress={() => setConfirmOpen(true)}
          disabled={submitting || !selectedResourceId || !selectedMainItem || !selectedTime}
        />
      </CardBlock>

      <ConfirmModal
        open={confirmOpen}
        title="Buat booking manual?"
        message="Pastikan jadwal, customer, dan paket sudah benar."
        confirmLabel="Buat booking"
        busy={submitting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void submit()}
      >
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#dbe7ff",
            backgroundColor: "#f8fbff",
            paddingHorizontal: 14,
            paddingVertical: 14,
            gap: 8,
          }}
        >
          <SummaryRow label="Customer" value={customerName || "-"} />
          <SummaryRow label="WA" value={customerPhone || "-"} />
          <SummaryRow label="Resource" value={currentResource?.name || "-"} />
          <SummaryRow label="Jadwal" value={selectedTime ? `${selectedDate} ${selectedTime}` : "-"} />
          <SummaryRow label="Total" value={formatAmount(total)} strong />
        </View>
      </ConfirmModal>
    </ScreenShell>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
        {label}
      </Text>
      <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: strong ? "900" : "800", flex: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}
