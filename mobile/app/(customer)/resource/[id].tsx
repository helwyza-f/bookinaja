import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAppTheme } from "@/theme";
import {
  useGuestAvailabilityQuery,
  usePublicResourceDetailQuery,
  useTenantProfileQuery,
} from "@/features/tenant/queries";
import {
  buildDateOptions,
  formatMoney,
  isoFromDateAndTime,
  toDateKey,
} from "@/features/booking/utils";
import {
  useCreateBookingMutation,
  usePromoPreviewMutation,
} from "@/features/booking/mutations";
import { useCustomerDashboardQuery } from "@/features/customer/queries";
import { useSessionStore } from "@/stores/session-store";
import { appToast } from "@/lib/toast";

function isInterdayUnit(unit?: string) {
  return ["day", "week", "month", "year"].includes(String(unit || ""));
}

function addDurationByUnit(startIso: string, unit: string, amount: number, unitDuration: number) {
  const date = new Date(startIso);

  switch (unit) {
    case "day":
      date.setDate(date.getDate() + amount);
      break;
    case "week":
      date.setDate(date.getDate() + amount * 7);
      break;
    case "month":
      date.setMonth(date.getMonth() + amount);
      break;
    case "year":
      date.setFullYear(date.getFullYear() + amount);
      break;
    default:
      date.setMinutes(date.getMinutes() + amount * unitDuration);
      break;
  }

  return date.toISOString();
}

function formatScheduleSummary(startIso: string, endIso: string, interday: boolean) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(start);

  if (interday) {
    return {
      dateLabel,
      timeLabel: `${new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(start)} - ${new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      }).format(end)}`,
      startLabel: new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      }).format(start),
      endLabel: new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(end),
    };
  }

  return {
    dateLabel,
    timeLabel: `${new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(start)} - ${new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(end)}`,
    startLabel: new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(start),
    endLabel: new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(end),
  };
}

function formatDayCard(date: Date) {
  const weekday = new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(
    date,
  );
  const day = new Intl.DateTimeFormat("id-ID", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date);
  return { weekday, day, month };
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildCalendarCells(anchor: Date) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const startPadding = firstOfMonth.getDay();
  const daysInMonth = lastOfMonth.getDate();
  const cells: Array<Date | null> = [];

  for (let index = 0; index < startPadding; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function formatUnitLabel(unit?: string) {
  switch (unit) {
    case "hour":
      return "jam";
    case "session":
      return "sesi";
    case "day":
      return "hari";
    case "week":
      return "minggu";
    case "month":
      return "bulan";
    case "year":
      return "tahun";
    default:
      return unit || "sesi";
  }
}

function StepTitle({
  step,
  title,
  accent,
  right,
}: {
  step: string;
  title: string;
  accent: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepHeaderLeft}>
        <View style={[styles.stepPill, { backgroundColor: accent }]}>
          <Text style={styles.stepPillText}>{step}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export default function ResourceBookingScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ id: string; slug: string }>();
  const id = String(params.id || "");
  const slug = String(params.slug || "");
  const role = useSessionStore((state) => state.role);

  const profile = useTenantProfileQuery(slug);
  const resource = usePublicResourceDetailQuery(slug, id);
  const dashboard = useCustomerDashboardQuery(role === "customer");
  const createBooking = useCreateBookingMutation();
  const promoPreview = usePromoPreviewMutation();
  const promoResetRef = useRef(promoPreview.reset);
  promoResetRef.current = promoPreview.reset;

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedMainId, setSelectedMainId] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const initial = new Date();
    initial.setHours(0, 0, 0, 0);
    return initial;
  });
  const [durationValue, setDurationValue] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const accountCustomer = dashboard.data?.customer;
  const hasAccountIdentity = Boolean(
    accountCustomer?.name?.trim() && accountCustomer?.phone?.trim(),
  );

  const mainItems = useMemo(
    () =>
      (resource.data?.items || [])
        .filter((item) => item.item_type === "main_option")
        .sort((left, right) => Number(right.is_default) - Number(left.is_default)),
    [resource.data?.items],
  );
  const selectedMainItem = useMemo(
    () => mainItems.find((item) => item.id === selectedMainId) || mainItems[0],
    [mainItems, selectedMainId],
  );
  const addonItems = useMemo(
    () => (resource.data?.items || []).filter((item) => item.item_type === "add_on"),
    [resource.data?.items],
  );
  const interday = isInterdayUnit(selectedMainItem?.price_unit);

  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const dateOptions = useMemo(() => buildDateOptions(new Date(), 10), []);
  const availability = useGuestAvailabilityQuery(
    id,
    selectedDateKey,
    Boolean(id && selectedMainItem && !interday),
  );

  useEffect(() => {
    if (!selectedMainId && mainItems[0]?.id) {
      setSelectedMainId(mainItems[0].id);
    }
  }, [mainItems, selectedMainId]);

  useEffect(() => {
    if (accountCustomer?.name && !name.trim()) {
      setName(accountCustomer.name);
    }
    if (accountCustomer?.phone && !phone.trim()) {
      setPhone(accountCustomer.phone);
    }
  }, [accountCustomer?.name, accountCustomer?.phone, name, phone]);

  useEffect(() => {
    if (toDateKey(selectedDate).slice(0, 7) !== toDateKey(calendarMonth).slice(0, 7)) {
      setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedDate, calendarMonth]);

  useEffect(() => {
    if (interday && profile.data?.open_time) {
      setSelectedTime(profile.data.open_time);
      return;
    }

    if (!interday && selectedTime) {
      setSelectedTime("");
    }
  }, [interday, profile.data?.open_time]);

  useEffect(() => {
    if (selectedTime) setSelectedTime("");
    if (durationValue !== 1) setDurationValue(1);
    if (selectedAddons.length > 0) setSelectedAddons([]);
    if (promoCode) setPromoCode("");
    promoResetRef.current();
  }, [selectedDateKey, selectedMainId]);

  const slotStep = selectedMainItem?.unit_duration || 60;
  const rawSlots = useMemo(() => {
    if (!profile.data?.open_time || !profile.data?.close_time || interday) return [];

    const [openH, openM] = profile.data.open_time.split(":").map(Number);
    const [closeH, closeM] = profile.data.close_time.split(":").map(Number);
    const openTotal = openH * 60 + openM;
    const closeTotal = closeH * 60 + closeM;
    const slots: string[] = [];

    for (let current = openTotal; current + slotStep <= closeTotal; current += slotStep) {
      const hours = String(Math.floor(current / 60)).padStart(2, "0");
      const minutes = String(current % 60).padStart(2, "0");
      slots.push(`${hours}:${minutes}`);
    }

    return slots;
  }, [interday, profile.data?.close_time, profile.data?.open_time, slotStep]);

  const normalizedBusySlots = useMemo(
    () =>
      (availability.data || []).map((slot) => {
        const [sh, sm] = slot.start_time.split(":").map(Number);
        const [eh, em] = slot.end_time.split(":").map(Number);
        return { start: sh * 60 + sm, end: eh * 60 + em };
      }),
    [availability.data],
  );

  const availableSlots = useMemo(() => {
    if (interday) return [];

    const now = new Date();
    const selectedIsToday = toDateKey(now) === selectedDateKey;

    return rawSlots.filter((time) => {
      const [hours, minutes] = time.split(":").map(Number);
      const totalMin = hours * 60 + minutes;
      const inBusyRange = normalizedBusySlots.some(
        (slot) => totalMin >= slot.start && totalMin < slot.end,
      );

      if (inBusyRange) return false;
      if (!selectedIsToday) return true;

      return totalMin > now.getHours() * 60 + now.getMinutes();
    });
  }, [interday, normalizedBusySlots, rawSlots, selectedDateKey]);

  const maxAvailableSessions = useMemo(() => {
    if (!selectedTime || !selectedMainItem || !profile.data?.close_time) return 1;
    if (interday) return 12;

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const [closeHours, closeMinutes] = profile.data.close_time.split(":").map(Number);
    const startMin = hours * 60 + minutes;
    const closeTotal = closeHours * 60 + closeMinutes;
    const nextBusy = normalizedBusySlots
      .filter((slot) => slot.start > startMin)
      .sort((a, b) => a.start - b.start)[0];

    let availableMinutes = closeTotal - startMin;
    if (nextBusy) {
      availableMinutes = Math.min(availableMinutes, nextBusy.start - startMin);
    }

    return Math.max(1, Math.floor(availableMinutes / slotStep));
  }, [
    interday,
    normalizedBusySlots,
    profile.data?.close_time,
    selectedMainItem,
    selectedTime,
    slotStep,
  ]);

  useEffect(() => {
    if (durationValue > maxAvailableSessions) {
      setDurationValue(1);
    }
  }, [durationValue, maxAvailableSessions]);

  const subtotal = useMemo(() => {
    const mainPrice = Number(selectedMainItem?.price || 0) * durationValue;
    const addonsPrice = addonItems
      .filter((item) => selectedAddons.includes(item.id))
      .reduce((sum, item) => sum + Number(item.price || 0), 0);
    return mainPrice + addonsPrice;
  }, [addonItems, durationValue, selectedAddons, selectedMainItem?.price]);

  const startIso = useMemo(() => {
    if (!selectedTime) return "";
    return isoFromDateAndTime(selectedDate, selectedTime);
  }, [selectedDate, selectedTime]);

  const endIso = useMemo(() => {
    if (!startIso || !selectedMainItem) return "";
    return addDurationByUnit(
      startIso,
      selectedMainItem.price_unit,
      durationValue,
      slotStep,
    );
  }, [durationValue, selectedMainItem, slotStep, startIso]);

  const timeline = useMemo(() => {
    if (!startIso || !endIso) return null;
    return formatScheduleSummary(startIso, endIso, interday);
  }, [endIso, interday, startIso]);

  const canPreviewPromo = Boolean(
    promoCode.trim() && selectedTime && selectedMainItem && resource.data && startIso && endIso,
  );
  const canSubmitBooking = Boolean(
    name.trim() && phone.trim() && selectedTime && selectedMainItem,
  );

  const totalAfterPromo = promoPreview.data?.valid
    ? Number(promoPreview.data.final_amount || subtotal)
    : subtotal;

  const toggleAddon = (itemId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(itemId)
        ? prev.filter((value) => value !== itemId)
        : [...prev, itemId],
    );
  };

  const previewPromo = async () => {
    if (!canPreviewPromo || !resource.data || !startIso || !endIso) {
      appToast.warning("Lengkapi jadwal dulu", "Pilih layanan, tanggal, jam, dan durasi.");
      return;
    }

    try {
      const response = await promoPreview.mutateAsync({
        tenant_id: resource.data.tenant_id,
        code: promoCode.trim().toUpperCase(),
        resource_id: resource.data.id,
        start_time: startIso,
        end_time: endIso,
        subtotal,
        customer_id: accountCustomer?.id,
      });

      if (response.valid) {
        appToast.success("Promo aktif", response.label || promoCode.trim().toUpperCase());
        return;
      }

      appToast.warning(
        "Promo tidak berlaku",
        response.message || "Coba kode lain atau ubah jadwal booking.",
      );
    } catch (error) {
      appToast.error(
        "Promo gagal dicek",
        error instanceof Error ? error.message : "Coba lagi sebentar.",
      );
    }
  };

  const submitBooking = async () => {
    if (!canSubmitBooking || !selectedMainItem || !startIso) {
      appToast.warning("Lengkapi booking", "Pilih jadwal dan isi identitas yang dibutuhkan.");
      return;
    }

    try {
      const response = await createBooking.mutateAsync({
        slug,
        resource_id: id,
        customer_name: name.trim().toUpperCase(),
        customer_phone: phone.trim(),
        item_ids: [selectedMainItem.id, ...selectedAddons],
        start_time: startIso,
        duration: durationValue,
        promo_code: promoPreview.data?.valid ? promoCode.trim().toUpperCase() : undefined,
      });

      const depositAmount = Number(response.booking?.deposit_amount || 0);
      appToast.success("Booking dibuat", "Lanjutkan ke tahap berikutnya.");

      if (depositAmount > 0) {
        router.replace({
          pathname: "/(customer)/bookings/[id]/payment",
          params: { id: response.booking_id, scope: "deposit" },
        });
        return;
      }

      router.replace({
        pathname: "/(customer)/bookings/[id]",
        params: { id: response.booking_id },
      });
    } catch (error) {
      appToast.error(
        "Booking gagal dibuat",
        error instanceof Error ? error.message : "Coba lagi sebentar.",
      );
    }
  };

  const calendarCells = useMemo(() => buildCalendarCells(calendarMonth), [calendarMonth]);
  const weekdayHeaders = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  if (resource.isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.foregroundMuted }]}>
            Memuat detail resource...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: theme.spacing.md,
            paddingBottom: theme.spacing["2xl"],
          },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <Feather name="arrow-left" size={18} color={theme.colors.foreground} />
          </Pressable>
          <View style={styles.topBarCopy}>
            <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>Customer</Text>
            <Text style={[styles.topBarTitle, { color: theme.colors.foreground }]}>Booking</Text>
          </View>
        </View>

        <View
          style={[
            styles.hero,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {resource.data?.image_url ? (
            <Image source={{ uri: resource.data.image_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View
              style={[
                styles.heroFallback,
                { backgroundColor: theme.colors.surfaceAlt },
              ]}
            >
              <Feather name="image" size={28} color={theme.colors.foregroundMuted} />
            </View>
          )}
          <View style={styles.heroOverlay} />
          <View style={styles.heroBody}>
            <View style={styles.heroMetaRow}>
              <Text style={[styles.heroEyebrow, { color: theme.colors.accent }]}>
                {(resource.data?.category || "resource").toUpperCase()}
              </Text>
              <View
                style={[
                  styles.heroPriceChip,
                  { backgroundColor: theme.colors.accentSoft },
                ]}
              >
                <Text style={[styles.heroPriceChipText, { color: theme.colors.accent }]}>
                  {formatMoney(totalAfterPromo)}
                </Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>{resource.data?.name}</Text>
            <Text style={styles.heroSubtitle}>
              {timeline
                ? `${timeline.dateLabel} • ${timeline.timeLabel}`
                : `${profile.data?.open_time || "--:--"} - ${profile.data?.close_time || "--:--"}`}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <StepTitle step="01" title="Pilih layanan" accent={theme.colors.accent} />
          <View style={styles.stack}>
            {mainItems.map((item) => {
              const active = selectedMainItem?.id === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedMainId(item.id)}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: active ? theme.colors.accentSoft : theme.colors.card,
                      borderColor: active ? theme.colors.accent : theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.optionMeta,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      {formatMoney(item.price)} • {formatUnitLabel(item.price_unit)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.optionBadge,
                      {
                        backgroundColor: active
                          ? theme.colors.accent
                          : theme.colors.surfaceAlt,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionBadgeText,
                        {
                          color: active ? "#FFFFFF" : theme.colors.foregroundMuted,
                        },
                      ]}
                    >
                      {active ? "Dipilih" : "Pilih"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <StepTitle
            step="02"
            title="Pilih jadwal"
            accent={theme.colors.accent}
            right={
              <Pressable
                onPress={() => setCalendarOpen(true)}
                style={[
                  styles.calendarTrigger,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Feather name="calendar" size={14} color={theme.colors.foregroundMuted} />
                <Text
                  style={[
                    styles.calendarTriggerText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Kalender
                </Text>
              </Pressable>
            }
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sliderTrack}
          >
            {dateOptions.map((date) => {
              const active = toDateKey(date) === selectedDateKey;
              const part = formatDayCard(date);
              return (
                <Pressable
                  key={toDateKey(date)}
                  onPress={() => setSelectedDate(date)}
                  style={[
                    styles.dayCard,
                    {
                      backgroundColor: active ? theme.colors.accent : theme.colors.card,
                      borderColor: active ? theme.colors.accent : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayCardWeekday,
                      { color: active ? "rgba(255,255,255,0.8)" : theme.colors.foregroundMuted },
                    ]}
                  >
                    {part.weekday}
                  </Text>
                  <Text
                    style={[
                      styles.dayCardDay,
                      { color: active ? "#FFFFFF" : theme.colors.foreground },
                    ]}
                  >
                    {part.day}
                  </Text>
                  <Text
                    style={[
                      styles.dayCardMonth,
                      { color: active ? "rgba(255,255,255,0.8)" : theme.colors.foregroundMuted },
                    ]}
                  >
                    {part.month}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View
            style={[
              styles.scheduleCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.scheduleHeader}>
              <Text style={[styles.scheduleTitle, { color: theme.colors.foreground }]}>
                {new Intl.DateTimeFormat("id-ID", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                }).format(selectedDate)}
              </Text>
              <View
                style={[
                  styles.hoursBadge,
                  { backgroundColor: theme.colors.surfaceAlt },
                ]}
              >
                <Text
                  style={[
                    styles.hoursBadgeText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {profile.data?.open_time || "--:--"} - {profile.data?.close_time || "--:--"}
                </Text>
              </View>
            </View>

            {interday ? (
              <View
                style={[
                  styles.inlineNotice,
                  {
                    backgroundColor: theme.colors.accentSoft,
                    borderColor: theme.colors.accent,
                  },
                ]}
              >
                <Feather name="shield" size={16} color={theme.colors.accent} />
                <Text style={[styles.inlineNoticeText, { color: theme.colors.foreground }]}>
                  Booking ini mulai otomatis dari jam buka tenant.
                </Text>
              </View>
            ) : availability.isLoading ? (
              <View style={styles.loadingSlots}>
                <ActivityIndicator color={theme.colors.accent} size="small" />
                <Text
                  style={[
                    styles.loadingSlotsText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Memuat slot...
                </Text>
              </View>
            ) : availableSlots.length ? (
              <View style={styles.timeGrid}>
                {availableSlots.map((slot) => {
                  const active = slot === selectedTime;
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => setSelectedTime(slot)}
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                          borderColor: active ? theme.colors.accent : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          { color: active ? "#FFFFFF" : theme.colors.foreground },
                        ]}
                      >
                        {slot}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View
                style={[
                  styles.emptyBlock,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
                  Slot penuh
                </Text>
                <Text
                  style={[
                    styles.emptyHint,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Coba tanggal lain.
                </Text>
              </View>
            )}
          </View>
        </View>

        {selectedTime ? (
          <View style={styles.section}>
            <StepTitle
              step="03"
              title="Pilih durasi"
              accent={theme.colors.accent}
              right={
                <View
                  style={[
                    styles.availabilityBadge,
                    { backgroundColor: theme.colors.accentSoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.availabilityBadgeText,
                      { color: theme.colors.accent },
                    ]}
                  >
                    {maxAvailableSessions} slot
                  </Text>
                </View>
              }
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sliderTrack}
            >
              {Array.from({ length: maxAvailableSessions }, (_, index) => index + 1).map(
                (value) => {
                  const active = durationValue === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => setDurationValue(value)}
                      style={[
                        styles.durationCard,
                        {
                          backgroundColor: active ? theme.colors.accent : theme.colors.card,
                          borderColor: active ? theme.colors.accent : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.durationValue,
                          { color: active ? "#FFFFFF" : theme.colors.foreground },
                        ]}
                      >
                        {value}
                      </Text>
                      <Text
                        style={[
                          styles.durationUnit,
                          {
                            color: active
                              ? "rgba(255,255,255,0.8)"
                              : theme.colors.foregroundMuted,
                          },
                        ]}
                      >
                        {interday ? formatUnitLabel(selectedMainItem?.price_unit) : "sesi"}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </ScrollView>

            {timeline ? (
              <View
                style={[
                  styles.timelineCard,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.timelineCol}>
                  <Text style={[styles.timelineLabel, { color: theme.colors.foregroundMuted }]}>
                    Mulai
                  </Text>
                  <Text style={[styles.timelineValue, { color: theme.colors.foreground }]}>
                    {timeline.startLabel}
                  </Text>
                  <Text style={[styles.timelineHint, { color: theme.colors.foregroundMuted }]}>
                    {timeline.dateLabel}
                  </Text>
                </View>
                <View
                  style={[
                    styles.timelineDivider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View style={[styles.timelineCol, styles.timelineColRight]}>
                  <Text style={[styles.timelineLabel, { color: theme.colors.foregroundMuted }]}>
                    Selesai
                  </Text>
                  <Text style={[styles.timelineValue, { color: theme.colors.accent }]}>
                    {timeline.endLabel}
                  </Text>
                  <Text style={[styles.timelineHint, { color: theme.colors.foregroundMuted }]}>
                    {interday ? "Akses berakhir" : timeline.dateLabel}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {addonItems.length > 0 ? (
          <View style={styles.section}>
            <StepTitle step="04" title="Add-on" accent={theme.colors.accent} />
            <View style={styles.stack}>
              {addonItems.map((item) => {
                const active = selectedAddons.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleAddon(item.id)}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: active ? theme.colors.accentSoft : theme.colors.card,
                        borderColor: active ? theme.colors.accent : theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.optionMeta,
                          { color: theme.colors.foregroundMuted },
                        ]}
                      >
                        +{formatMoney(item.price)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.optionBadge,
                        {
                          backgroundColor: active
                            ? theme.colors.accent
                            : theme.colors.surfaceAlt,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionBadgeText,
                          {
                            color: active ? "#FFFFFF" : theme.colors.foregroundMuted,
                          },
                        ]}
                      >
                        {active ? "Aktif" : "Tambah"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <StepTitle step="05" title="Konfirmasi" accent={theme.colors.accent} />
          <View
            style={[
              styles.confirmCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.compactSection}>
              <Text style={[styles.blockLabel, { color: theme.colors.foregroundMuted }]}>
                Promo
              </Text>
              <View style={styles.promoRow}>
                <TextInput
                  value={promoCode}
                  onChangeText={(value) => setPromoCode(value.toUpperCase())}
                  placeholder="VOUCHER"
                  placeholderTextColor={theme.colors.foregroundMuted}
                  autoCapitalize="characters"
                  style={[
                    styles.input,
                    styles.promoInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.foreground,
                    },
                  ]}
                />
                <Pressable
                  onPress={() => void previewPromo()}
                  disabled={!canPreviewPromo || promoPreview.isPending}
                  style={[
                    styles.promoButton,
                    {
                      backgroundColor: theme.colors.accent,
                      opacity: !canPreviewPromo || promoPreview.isPending ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={styles.promoButtonText}>
                    {promoPreview.isPending ? "Cek..." : "Pakai"}
                  </Text>
                </Pressable>
              </View>

              {promoPreview.data?.valid ? (
                <View
                  style={[
                    styles.promoResult,
                    {
                      backgroundColor: theme.colors.accentSoft,
                      borderColor: theme.colors.accent,
                    },
                  ]}
                >
                  <Text style={[styles.promoResultTitle, { color: theme.colors.foreground }]}>
                    {promoPreview.data.label || promoCode.trim().toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.promoResultHint,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    Potongan {formatMoney(promoPreview.data.discount_amount)}
                  </Text>
                </View>
              ) : null}
            </View>

            {hasAccountIdentity ? (
              <View
                style={[
                  styles.identityCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.blockLabel, { color: theme.colors.foregroundMuted }]}>
                  Booking sebagai
                </Text>
                <Text style={[styles.identityName, { color: theme.colors.foreground }]}>
                  {accountCustomer?.name || "-"}
                </Text>
                <Text
                  style={[
                    styles.identityPhone,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {accountCustomer?.phone || "-"}
                </Text>
              </View>
            ) : (
              <View style={styles.identityStack}>
                <Text style={[styles.blockLabel, { color: theme.colors.foregroundMuted }]}>
                  Identitas
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nama customer"
                  placeholderTextColor={theme.colors.foregroundMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.foreground,
                    },
                  ]}
                />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Nomor WhatsApp"
                  placeholderTextColor={theme.colors.foregroundMuted}
                  keyboardType="phone-pad"
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.foreground,
                    },
                  ]}
                />
              </View>
            )}

            <View
              style={[
                styles.totalBar,
                { backgroundColor: theme.colors.surfaceAlt },
              ]}
            >
              <View style={styles.totalCopy}>
                <Text style={[styles.totalLabel, { color: theme.colors.foregroundMuted }]}>
                  Total booking
                </Text>
                {promoPreview.data?.valid ? (
                  <Text
                    style={[
                      styles.totalHint,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    Sebelum promo {formatMoney(subtotal)}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.totalHint,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    DP mengikuti policy tenant.
                  </Text>
                )}
              </View>
              <Text style={[styles.totalValue, { color: theme.colors.foreground }]}>
                {formatMoney(totalAfterPromo)}
              </Text>
            </View>

            <Pressable
              onPress={() => void submitBooking()}
              disabled={!canSubmitBooking || createBooking.isPending}
              style={[
                styles.submit,
                {
                  backgroundColor:
                    !canSubmitBooking || createBooking.isPending
                      ? theme.colors.foregroundMuted
                      : theme.colors.accent,
                },
              ]}
            >
              <Text style={styles.submitText}>
                {createBooking.isPending ? "Menyimpan..." : "Buat Booking"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCalendarOpen(false)} />
          <View
            style={[
              styles.calendarSheet,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.calendarHeader}>
              <Text style={[styles.calendarTitle, { color: theme.colors.foreground }]}>
                Pilih tanggal
              </Text>
              <Pressable
                onPress={() => setCalendarOpen(false)}
                style={[
                  styles.calendarClose,
                  { backgroundColor: theme.colors.surfaceAlt },
                ]}
              >
                <Feather name="x" size={16} color={theme.colors.foregroundMuted} />
              </Pressable>
            </View>

            <View style={styles.calendarMonthRow}>
              <Pressable
                onPress={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
                  )
                }
                style={[
                  styles.monthArrow,
                  { backgroundColor: theme.colors.surfaceAlt },
                ]}
              >
                <Feather name="chevron-left" size={16} color={theme.colors.foreground} />
              </Pressable>
              <Text style={[styles.monthTitle, { color: theme.colors.foreground }]}>
                {formatMonthTitle(calendarMonth)}
              </Text>
              <Pressable
                onPress={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
                  )
                }
                style={[
                  styles.monthArrow,
                  { backgroundColor: theme.colors.surfaceAlt },
                ]}
              >
                <Feather name="chevron-right" size={16} color={theme.colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.weekdaysRow}>
              {weekdayHeaders.map((day) => (
                <Text
                  key={day}
                  style={[styles.weekdayLabel, { color: theme.colors.foregroundMuted }]}
                >
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarCells.map((cell, index) => {
                if (!cell) {
                  return <View key={`empty-${index}`} style={styles.calendarCell} />;
                }

                const active = toDateKey(cell) === selectedDateKey;
                const disabled = toDateKey(cell) < toDateKey(new Date());
                return (
                  <Pressable
                    key={toDateKey(cell)}
                    disabled={disabled}
                    onPress={() => {
                      setSelectedDate(cell);
                      setCalendarOpen(false);
                    }}
                    style={[
                      styles.calendarCell,
                      styles.calendarDay,
                      {
                        backgroundColor: active
                          ? theme.colors.accent
                          : theme.colors.surface,
                        borderColor: active ? theme.colors.accent : theme.colors.border,
                        opacity: disabled ? 0.35 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        { color: active ? "#FFFFFF" : theme.colors.foreground },
                      ]}
                    >
                      {cell.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
  },
  content: {
    gap: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 6,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarCopy: {
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  hero: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: 220,
  },
  heroFallback: {
    width: "100%",
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 15, 28, 0.24)",
  },
  heroBody: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    gap: 6,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  heroPriceChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroPriceChipText: {
    fontSize: 12,
    fontWeight: "900",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    gap: 12,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stepHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepPill: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  calendarTrigger: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calendarTriggerText: {
    fontSize: 12,
    fontWeight: "800",
  },
  stack: {
    gap: 12,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  optionMeta: {
    fontSize: 13,
    fontWeight: "500",
  },
  optionBadge: {
    minWidth: 78,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: "center",
  },
  optionBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  sliderTrack: {
    gap: 10,
    paddingRight: 10,
  },
  dayCard: {
    width: 84,
    minHeight: 84,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dayCardWeekday: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  dayCardDay: {
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 28,
  },
  dayCardMonth: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  scheduleCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    gap: 12,
  },
  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  scheduleTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  hoursBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hoursBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  inlineNotice: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inlineNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  loadingSlots: {
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingSlotsText: {
    fontSize: 13,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeChip: {
    width: "22%",
    minWidth: 72,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: "900",
  },
  emptyBlock: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  emptyHint: {
    fontSize: 12,
  },
  availabilityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  availabilityBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  durationCard: {
    width: 84,
    minHeight: 84,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  durationValue: {
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
  },
  durationUnit: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  timelineCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 16,
  },
  timelineCol: {
    flex: 1,
    gap: 6,
  },
  timelineColRight: {
    alignItems: "flex-end",
  },
  timelineDivider: {
    width: 1,
  },
  timelineLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  timelineValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  timelineHint: {
    fontSize: 12,
  },
  confirmCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 16,
    gap: 16,
  },
  compactSection: {
    gap: 10,
  },
  blockLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  promoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  promoInput: {
    flex: 1,
  },
  promoButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  promoButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  promoResult: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  promoResultTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  promoResultHint: {
    fontSize: 12,
  },
  identityCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 4,
  },
  identityName: {
    fontSize: 16,
    fontWeight: "800",
  },
  identityPhone: {
    fontSize: 13,
    fontWeight: "600",
  },
  identityStack: {
    gap: 10,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  totalBar: {
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  totalCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  totalHint: {
    fontSize: 11,
    lineHeight: 17,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  submit: {
    minHeight: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.36)",
  },
  calendarSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  calendarClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMonthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  weekdaysRow: {
    flexDirection: "row",
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 4,
  },
  calendarDay: {
    borderWidth: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
