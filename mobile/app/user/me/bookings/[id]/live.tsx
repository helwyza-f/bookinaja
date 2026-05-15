import { router, useLocalSearchParams } from "expo-router";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { apiFetch, ApiError } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useRealtime } from "@/hooks/use-realtime";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { customerBookingChannel } from "@/lib/realtime/channels";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";
import { isRealtimeEnabledForAPI } from "@/lib/realtime/ws-client";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LiveOrderItem = {
  id?: string;
  item_name?: string;
  quantity?: number;
  subtotal?: number;
};

type BookingEvent = {
  id?: string;
  title?: string;
  description?: string;
  created_at?: string;
};

type AddonItem = {
  id?: string;
  name?: string;
  price?: number;
  image_url?: string | null;
};

type FnbItem = {
  id?: string;
  name?: string;
  category?: string;
  price?: number;
  unit_price?: number;
  image_url?: string | null;
};

type BookingOptionItem = {
  id?: string;
  item_name?: string;
  item_type?: string;
  quantity?: number;
  unit_price?: number;
  price_at_booking?: number;
};

type BookingDetail = {
  id?: string;
  customer_id?: string;
  tenant_name?: string;
  tenant_slug?: string;
  customer_name?: string;
  customer_phone?: string;
  resource_name?: string;
  status?: string;
  payment_status?: string;
  start_time?: string;
  end_time?: string;
  grand_total?: number;
  deposit_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  unit_price?: number;
  unit_duration?: number;
  resource_addons?: AddonItem[];
  orders?: LiveOrderItem[];
  events?: BookingEvent[];
  options?: BookingOptionItem[];
};

type BookingContext = {
  booking?: {
    id?: string;
    status?: string;
    payment_status?: string;
    remaining_seconds?: number;
    balance_due?: number;
    start_time?: string;
    end_time?: string;
  };
};

type MeResponse = {
  id?: string;
  customer_id?: string;
  customer?: {
    id?: string;
  };
};

type ConfirmSheetState = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  action: () => void;
} | null;

type PickerSheetState =
  | {
      kind: "fnb" | "addon";
      title: string;
    }
  | null;

type LiveAction = {
  label: string;
  href?: `/user/me/bookings/${string}` | `/user/me/bookings/${string}/payment?scope=deposit` | `/user/me/bookings/${string}/payment?scope=settlement`;
  tone?: "primary" | "secondary";
  disabled?: boolean;
  hint?: string;
  onPress?: () => void;
};

type PaymentAction = {
  label: string;
  href: `/user/me/bookings/${string}/payment?scope=deposit` | `/user/me/bookings/${string}/payment?scope=settlement`;
} | null;

type CartLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  category?: string;
  imageUrl?: string | null;
};

function getLiveMeta(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active" || normalized === "ongoing") {
    return {
      label: "Sesi sedang berjalan",
      tone: "#059669",
      bg: "#ecfdf5",
      hint: "Pantau waktu sesi, tambah layanan, atau akhiri saat pemakaian selesai.",
    };
  }
  if (normalized === "completed") {
    return {
      label: "Sesi selesai",
      tone: "#0f172a",
      bg: "#f8fafc",
      hint: "Sesi sudah ditutup. Lanjutkan pelunasan bila masih ada sisa tagihan.",
    };
  }
  if (normalized === "confirmed") {
    return {
      label: "Siap dimulai",
      tone: "#2563eb",
      bg: "#eff6ff",
      hint: "Booking siap dipakai. Aktifkan sesi saat customer mulai menggunakan resource.",
    };
  }
  return {
    label: "Menunggu sesi",
    tone: "#d97706",
    bg: "#fff7ed",
    hint: "Pantau status booking dan aktifkan sesi saat waktunya tiba.",
  };
}

function getPaymentMeta(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "settled" || normalized === "paid") {
    return { label: "Lunas", tone: "#059669", bg: "#ecfdf5" };
  }
  if (normalized === "partial_paid") {
    return { label: "DP tercatat", tone: "#2563eb", bg: "#eff6ff" };
  }
  if (normalized === "awaiting_verification") {
    return { label: "Menunggu verifikasi", tone: "#d97706", bg: "#fff7ed" };
  }
  return { label: "Menunggu pembayaran", tone: "#64748b", bg: "#f8fafc" };
}

function getActivationReason(hasPaidDp: boolean, isTimeReached: boolean) {
  if (!hasPaidDp) return "DP untuk booking ini belum tercatat. Selesaikan pembayaran awal dulu sebelum sesi diaktifkan.";
  if (!isTimeReached) return "Jam mulai booking belum tiba. Aktivasi baru tersedia saat sesi memang sudah bisa dipakai.";
  return "Booking ini siap diaktifkan sekarang.";
}

function formatCountdown(totalSeconds: number) {
  const seconds = Math.max(totalSeconds, 0);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatRemainingLabel(seconds: number) {
  const total = Math.max(seconds, 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours <= 0) return `${minutes} menit`;
  return `${hours} jam ${minutes} menit`;
}

function groupedOrders(items: LiveOrderItem[]) {
  const grouped = new Map<string, { name: string; quantity: number; subtotal: number }>();
  items.forEach((item) => {
    const key = String(item.item_name || item.id || "").toLowerCase();
    if (!key) return;
    const current = grouped.get(key) || {
      name: item.item_name || "Item",
      quantity: 0,
      subtotal: 0,
    };
    current.quantity += Number(item.quantity || 0);
    current.subtotal += Number(item.subtotal || 0);
    grouped.set(key, current);
  });
  return Array.from(grouped.values());
}

function groupedOptions(items: BookingOptionItem[]) {
  const grouped = new Map<string, { type: string; name: string; quantity: number; total: number }>();
  items.forEach((item) => {
    const type = String(item.item_type || "").toLowerCase();
    const key = `${type}:${String(item.item_name || item.id || "")}`.toLowerCase();
    if (!key) return;
    const current = grouped.get(key) || {
      type,
      name: item.item_name || "Item",
      quantity: 0,
      total: 0,
    };
    const quantity = Math.max(Number(item.quantity || 0), 1);
    const unitPrice = Number(item.price_at_booking || item.unit_price || 0);
    current.quantity += quantity;
    current.total += unitPrice * quantity;
    grouped.set(key, current);
  });
  return Array.from(grouped.values());
}

function sumCart(cart: Record<string, number>) {
  return Object.values(cart).reduce((total, quantity) => total + Number(quantity || 0), 0);
}

function formatCartSummary(count: number, total: number) {
  if (count <= 0) return "Belum ada item dipilih";
  return `${count} item • ${formatCurrency(total)}`;
}

function SectionRow({
  title,
  subtitle,
  value,
}: {
  title: string;
  subtitle: string;
  value: string;
}) {
  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: "#f8fafc",
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
          {title}
        </Text>
        <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
          {subtitle}
        </Text>
      </View>
      <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
        {value}
      </Text>
    </View>
  );
}

function eventIcon(title?: string): keyof typeof MaterialIcons.glyphMap {
  const value = String(title || "").toLowerCase();
  if (value.includes("bayar") || value.includes("payment") || value.includes("deposit")) return "payments";
  if (value.includes("extend") || value.includes("durasi")) return "bolt";
  if (value.includes("aktif") || value.includes("start")) return "play-circle-outline";
  if (value.includes("selesai") || value.includes("complete")) return "check-circle-outline";
  if (value.includes("order") || value.includes("f&b") || value.includes("addon")) return "receipt-long";
  return "history";
}

function MetaTile({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        backgroundColor: "#f8fafc",
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 4,
      }}
    >
      <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
        {label}
      </Text>
      <Text selectable style={{ color: emphasize ? "#2952d9" : "#0f172a", fontSize: 15, fontWeight: "800" }}>
        {value}
      </Text>
    </View>
  );
}

function ActionTile({
  title,
  subtitle,
  icon,
  disabled,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: disabled ? "#edf2f7" : "#e6ebf2",
        backgroundColor: disabled ? "#f8fafc" : "#ffffff",
        paddingHorizontal: 12,
        paddingVertical: 14,
        gap: 10,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name={icon} size={18} color="#2952d9" />
      </View>
      <View style={{ gap: 3 }}>
        <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
          {title}
        </Text>
        <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

function resolveLiveJourneyAction(input: {
  bookingID: string;
  status?: string;
  paymentStatus?: string;
  depositAmount?: number;
  balanceDue?: number;
  hasPaidDp: boolean;
  isTimeReached: boolean;
  shouldShowActivation: boolean;
  isActiveStatus: boolean;
  isCompleted: boolean;
  onActivate: () => void;
}): { primary: LiveAction | null; secondary: LiveAction | null } {
  const status = String(input.status || "").toLowerCase();
  const paymentStatus = String(input.paymentStatus || "").toLowerCase();
  const depositAmount = Number(input.depositAmount || 0);
  const balanceDue = Number(input.balanceDue || 0);

  if (input.shouldShowActivation) {
    if (paymentStatus === "awaiting_verification") {
      return {
        primary: { href: `/user/me/bookings/${input.bookingID}/payment?scope=deposit` as const, label: "Lihat pembayaran" },
        secondary: { href: `/user/me/bookings/${input.bookingID}` as const, label: "Kembali", tone: "secondary" },
      };
    }
    if (!input.hasPaidDp && depositAmount > 0) {
      return {
        primary: { href: `/user/me/bookings/${input.bookingID}/payment?scope=deposit` as const, label: "Bayar DP" },
        secondary: { href: `/user/me/bookings/${input.bookingID}` as const, label: "Kembali", tone: "secondary" },
      };
    }
    if (!input.isTimeReached) {
      return {
        primary: {
          label: "Menunggu jam mulai",
          disabled: true,
          hint: "Aktivasi baru terbuka saat waktu booking sudah masuk.",
        },
        secondary: { href: `/user/me/bookings/${input.bookingID}` as const, label: "Kembali", tone: "secondary" },
      };
    }
    return {
      primary: { label: "Aktifkan sesi", onPress: input.onActivate },
      secondary: { href: `/user/me/bookings/${input.bookingID}` as const, label: "Kembali", tone: "secondary" },
    };
  }

  if (input.isCompleted && balanceDue > 0) {
    return {
      primary: { href: `/user/me/bookings/${input.bookingID}/payment?scope=settlement` as const, label: "Bayar sisa tagihan" },
      secondary: { href: `/user/me/bookings/${input.bookingID}` as const, label: "Kembali", tone: "secondary" },
    };
  }

  if (input.isCompleted) {
    return {
      primary: { href: `/user/me/bookings/${input.bookingID}` as const, label: "Lihat booking selesai" },
      secondary: null,
    };
  }

  if (input.isActiveStatus) {
    return {
      primary: balanceDue > 0 ? { href: `/user/me/bookings/${input.bookingID}/payment?scope=settlement` as const, label: "Buka pembayaran", tone: "secondary" } : null,
      secondary: { href: `/user/me/bookings/${input.bookingID}` as const, label: "Kembali", tone: "secondary" },
    };
  }

  if (status === "cancelled") {
    return {
      primary: { href: `/user/me/bookings/${input.bookingID}` as const, label: "Kembali" },
      secondary: null,
    };
  }

  return {
    primary: { href: `/user/me/bookings/${input.bookingID}` as const, label: "Kembali" },
    secondary: null,
  };
}

function resolvePaymentAction(input: {
  bookingID: string;
  paymentStatus?: string;
  paidAmount?: number;
  grandTotal?: number;
  depositAmount?: number;
  balanceDue?: number;
  isCompleted: boolean;
}): PaymentAction {
  const paymentStatus = String(input.paymentStatus || "").toLowerCase();
  const paidAmount = Number(input.paidAmount || 0);
  const grandTotal = Number(input.grandTotal || 0);
  const depositAmount = Number(input.depositAmount || 0);
  const rawBalanceDue = input.balanceDue;
  const balanceDue = Number(rawBalanceDue || 0);
  const isSettled =
    paymentStatus === "settled" ||
    paymentStatus === "paid" ||
    (grandTotal > 0 && paidAmount >= grandTotal) ||
    (typeof rawBalanceDue === "number" && rawBalanceDue <= 0) ||
    (input.isCompleted && balanceDue <= 0);

  if (isSettled) {
    return null;
  }

  if (depositAmount > 0 && paymentStatus === "pending") {
    return {
      label: "Bayar DP",
      href: `/user/me/bookings/${input.bookingID}/payment?scope=deposit`,
    };
  }

  if (input.isCompleted && balanceDue > 0) {
    return {
      label: "Pelunasan",
      href: `/user/me/bookings/${input.bookingID}/payment?scope=settlement`,
    };
  }

  return null;
}

export default function CustomerBookingLiveScreen() {
  const guard = useAuthGuard("customer");
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const confirmSheetRef = useRef<BottomSheetModal>(null);
  const pickerSheetRef = useRef<BottomSheetModal>(null);
  const [now, setNow] = useState(Date.now());
  const [actionBusy, setActionBusy] = useState("");
  const [confirmSheet, setConfirmSheet] = useState<ConfirmSheetState>(null);
  const [pickerSheet, setPickerSheet] = useState<PickerSheetState>(null);
  const [feedback, setFeedback] = useState("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [menuCart, setMenuCart] = useState<Record<string, number>>({});
  const [addonCart, setAddonCart] = useState<Record<string, number>>({});

  const detailQuery = useQuery({
    queryKey: ["customer-booking-live-detail", id],
    queryFn: () => apiFetch<BookingDetail>(`/user/me/bookings/${id}`, { audience: "customer" }),
    enabled: guard.ready && Boolean(id),
    refetchInterval: isRealtimeEnabledForAPI() ? false : 15_000,
  });

  const booking = detailQuery.data;
  const normalizedStatus = String(booking?.status || "").toLowerCase();
  const isActiveStatus = normalizedStatus === "active" || normalizedStatus === "ongoing";
  const isCompleted = normalizedStatus === "completed";

  const contextQuery = useQuery({
    queryKey: ["customer-booking-live", id],
    queryFn: () => apiFetch<BookingContext>(`/user/me/bookings/${id}/context`, { audience: "customer" }),
    enabled: guard.ready && Boolean(id) && isActiveStatus,
    refetchInterval: isRealtimeEnabledForAPI() ? false : 15_000,
  });

  const meQuery = useQuery({
    queryKey: ["customer-me"],
    queryFn: () => apiFetch<MeResponse>("/me", { audience: "customer" }),
    enabled: guard.ready && Boolean(id) && isRealtimeEnabledForAPI(),
    staleTime: 60_000,
  });

  const fnbQuery = useQuery({
    queryKey: ["customer-booking-fnb", id],
    queryFn: () => apiFetch<FnbItem[]>(`/customer/fnb?booking_id=${id}`, { audience: "customer" }),
    enabled: guard.ready && Boolean(id) && isActiveStatus,
    staleTime: 30_000,
  });

  const liveMeta = getLiveMeta(booking?.status);
  const paymentMeta = getPaymentMeta(booking?.payment_status);
  const customerID = String(meQuery.data?.customer?.id || meQuery.data?.customer_id || meQuery.data?.id || booking?.customer_id || "");
  const balanceDue = Number(booking?.balance_due || contextQuery.data?.booking?.balance_due || 0);
  const paidAmount = Number(booking?.paid_amount || 0);
  const depositAmount = Number(booking?.deposit_amount || 0);
  const hasPaidDp =
    depositAmount <= 0 ||
    ["partial_paid", "paid", "settled"].includes(String(booking?.payment_status || "").toLowerCase());

  const startAt = booking?.start_time ? new Date(booking.start_time).getTime() : 0;
  const endAt = booking?.end_time ? new Date(booking.end_time).getTime() : 0;
  const isTimeReached = Boolean(startAt) && now >= startAt;
  const shouldShowActivation = !isActiveStatus && !isCompleted && normalizedStatus !== "cancelled";
  const activationReason = getActivationReason(hasPaidDp, isTimeReached);
  const paymentAction = useMemo(
    () =>
      resolvePaymentAction({
        bookingID: String(id || ""),
        paymentStatus: booking?.payment_status,
        paidAmount,
        grandTotal: Number(booking?.grand_total || 0),
        depositAmount,
        balanceDue,
        isCompleted,
      }),
    [balanceDue, booking?.grand_total, booking?.payment_status, depositAmount, id, isCompleted, paidAmount],
  );
  const journeyActions = useMemo(
    () =>
      resolveLiveJourneyAction({
        bookingID: String(id || ""),
        status: booking?.status,
        paymentStatus: booking?.payment_status,
        depositAmount,
        balanceDue,
        hasPaidDp,
        isTimeReached,
        shouldShowActivation,
        isActiveStatus,
        isCompleted,
        onActivate: () =>
          openConfirm({
            title: "Aktifkan sesi",
            message: "Timer live akan mulai berjalan dan booking ini masuk ke mode sesi aktif.",
            confirmLabel: "Aktifkan",
            action: () => {
              void handleActivate();
            },
          }),
      }),
    [balanceDue, booking?.payment_status, booking?.status, depositAmount, handleActivate, hasPaidDp, id, isActiveStatus, isCompleted, isTimeReached, shouldShowActivation],
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingSeconds = useMemo(() => {
    if (isActiveStatus && contextQuery.data?.booking?.remaining_seconds != null) {
      const base = Number(contextQuery.data.booking.remaining_seconds || 0);
      const elapsed = Math.floor((now - contextQuery.dataUpdatedAt) / 1000);
      return Math.max(base - elapsed, 0);
    }
    if (endAt > 0 && isActiveStatus) {
      return Math.max(Math.floor((endAt - now) / 1000), 0);
    }
    return 0;
  }, [contextQuery.data?.booking?.remaining_seconds, contextQuery.dataUpdatedAt, endAt, isActiveStatus, now]);

  const beforeStartSeconds = useMemo(() => {
    if (!startAt || isTimeReached) return 0;
    return Math.max(Math.floor((startAt - now) / 1000), 0);
  }, [isTimeReached, now, startAt]);

  const orderSummary = useMemo(() => groupedOrders(booking?.orders || []), [booking?.orders]);
  const optionSummary = useMemo(() => groupedOptions(booking?.options || []), [booking?.options]);
  const groupedMainOptions = useMemo(
    () => optionSummary.filter((item) => item.type !== "addon"),
    [optionSummary],
  );
  const groupedAddonOptions = useMemo(
    () => optionSummary.filter((item) => item.type === "addon"),
    [optionSummary],
  );
  const recentEvents = useMemo(() => (booking?.events || []).slice(0, 5), [booking?.events]);
  const addonItems = booking?.resource_addons || [];
  const menuItems = fnbQuery.data || [];
  const filteredMenuItems = useMemo(
    () =>
      menuItems.filter((item) =>
        `${item.name || ""} ${item.category || ""}`.toLowerCase().includes(pickerSearch.toLowerCase()),
      ),
    [menuItems, pickerSearch],
  );
  const filteredAddonItems = useMemo(
    () => addonItems.filter((item) => `${item.name || ""}`.toLowerCase().includes(pickerSearch.toLowerCase())),
    [addonItems, pickerSearch],
  );
  const menuCartLines = useMemo<CartLine[]>(
    () =>
      Object.entries(menuCart)
        .map(([itemID, quantity]) => {
          const item = menuItems.find((entry) => entry.id === itemID);
          if (!item || quantity <= 0) return null;
          return {
            id: itemID,
            name: item.name || "Menu",
            quantity,
            unitPrice: Number(item.price || item.unit_price || 0),
            category: item.category,
            imageUrl: item.image_url,
          };
        })
        .filter(Boolean) as CartLine[],
    [menuCart, menuItems],
  );
  const addonCartLines = useMemo<CartLine[]>(
    () =>
      Object.entries(addonCart)
        .map(([itemID, quantity]) => {
          const item = addonItems.find((entry) => entry.id === itemID);
          if (!item || quantity <= 0) return null;
          return {
            id: itemID,
            name: item.name || "Add-on",
            quantity,
            unitPrice: Number(item.price || 0),
            imageUrl: item.image_url,
          };
        })
        .filter(Boolean) as CartLine[],
    [addonCart, addonItems],
  );
  const menuCartCount = useMemo(() => sumCart(menuCart), [menuCart]);
  const addonCartCount = useMemo(() => sumCart(addonCart), [addonCart]);
  const menuCartTotal = useMemo(
    () => menuCartLines.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
    [menuCartLines],
  );
  const addonCartTotal = useMemo(
    () => addonCartLines.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
    [addonCartLines],
  );
  const activeCartKind = pickerSheet?.kind;
  const activeCartCount = activeCartKind === "fnb" ? menuCartCount : addonCartCount;
  const activeCartTotal = activeCartKind === "fnb" ? menuCartTotal : addonCartTotal;
  const activeCartLines = activeCartKind === "fnb" ? menuCartLines : addonCartLines;
  const confirmSnapPoints = useMemo(() => ["38%"], []);
  const pickerSnapPoints = useMemo(() => ["72%"], []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(""), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (confirmSheet) {
      confirmSheetRef.current?.present();
      return;
    }
    confirmSheetRef.current?.dismiss();
  }, [confirmSheet]);

  useEffect(() => {
    if (pickerSheet) {
      pickerSheetRef.current?.present();
      return;
    }
    pickerSheetRef.current?.dismiss();
  }, [pickerSheet]);

  useRealtime({
    enabled: guard.ready && isRealtimeEnabledForAPI() && Boolean(customerID && id),
    channels: customerID && id ? [customerBookingChannel(customerID, String(id))] : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      void detailQuery.refetch();
      if (isActiveStatus) {
        void contextQuery.refetch();
        void fnbQuery.refetch();
      }
    },
    onReconnect: () => {
      void detailQuery.refetch();
      if (isActiveStatus) {
        void contextQuery.refetch();
        void fnbQuery.refetch();
      }
    },
  });

  async function requestAction(path: string, body?: Record<string, unknown>) {
    await apiFetch(path, {
      method: "POST",
      audience: "customer",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async function refreshLiveQueries() {
    await Promise.all([detailQuery.refetch(), contextQuery.refetch(), fnbQuery.refetch()]);
  }

  async function postAction(path: string, body?: Record<string, unknown>) {
    try {
      await requestAction(path, body);
      await refreshLiveQueries();
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error ? error.message : "Aksi belum berhasil diproses.";
      Alert.alert("Aksi gagal", message);
    } finally {
      setActionBusy("");
      setConfirmSheet(null);
    }
  }

  function openConfirm(next: ConfirmSheetState) {
    setConfirmSheet(next);
  }

  function openPicker(kind: "fnb" | "addon") {
    setPickerSearch("");
    if (kind === "fnb") {
      setMenuCart({});
    } else {
      setAddonCart({});
    }
    setPickerSheet({
      kind,
      title: kind === "fnb" ? "Pesan F&B" : "Tambah add-on",
    });
  }

  function changeCartQuantity(kind: "fnb" | "addon", itemID: string, nextQuantity: number) {
    const update = (current: Record<string, number>) => {
      const next = { ...current };
      if (nextQuantity <= 0) {
        delete next[itemID];
      } else {
        next[itemID] = nextQuantity;
      }
      return next;
    };
    if (kind === "fnb") {
      setMenuCart(update);
      return;
    }
    setAddonCart(update);
  }

  async function handleActivate() {
    if (!id) return;
    setActionBusy("activate");
    await postAction(`/user/me/bookings/${id}/activate`);
    setFeedback("Sesi booking berhasil diaktifkan dan timer live sudah berjalan.");
  }

  async function handleComplete() {
    if (!id) return;
    setActionBusy("complete");
    await postAction(`/user/me/bookings/${id}/complete`);
    setFeedback("Sesi booking berhasil diselesaikan. Lanjutkan pelunasan bila masih ada sisa tagihan.");
  }

  async function handleExtend(count: number) {
    if (!id) return;
    setActionBusy(`extend-${count}`);
    await postAction(`/user/me/bookings/${id}/extend`, { additional_duration: count });
    setFeedback(`Durasi booking berhasil ditambah ${count} sesi.`);
  }

  async function handleAddFnbCart(items: CartLine[]) {
    if (!id || !items.length) return;
    setActionBusy("fnb-cart");
    try {
      await Promise.all(
        items.map((item) =>
          requestAction(`/user/me/bookings/${id}/orders`, {
            fnb_item_id: item.id,
            quantity: item.quantity,
          }),
        ),
      );
      await refreshLiveQueries();
      setPickerSheet(null);
      setMenuCart({});
      setFeedback(`${items.length} pilihan F&B berhasil ditambahkan ke booking aktif.`);
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error ? error.message : "Pesanan F&B belum berhasil diproses.";
      Alert.alert("Pesanan gagal", message);
    } finally {
      setActionBusy("");
      setConfirmSheet(null);
    }
  }

  async function handleAddAddonCart(items: CartLine[]) {
    if (!id || !items.length) return;
    setActionBusy("addon-cart");
    try {
      const requests = items.flatMap((item) =>
        Array.from({ length: item.quantity }, () =>
          requestAction(`/user/me/bookings/${id}/addons`, {
            item_id: item.id,
          }),
        ),
      );
      await Promise.all(requests);
      await refreshLiveQueries();
      setPickerSheet(null);
      setAddonCart({});
      setFeedback(`${items.length} add-on berhasil ditambahkan ke booking aktif.`);
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error ? error.message : "Add-on belum berhasil diproses.";
      Alert.alert("Aksi gagal", message);
    } finally {
      setActionBusy("");
      setConfirmSheet(null);
    }
  }

  function goBackToBooking() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(`/user/me/bookings/${id}`);
  }

  function handleJourneyAction(action: LiveAction) {
    if (action.label.toLowerCase().includes("kembali")) {
      goBackToBooking();
      return;
    }
    if (action.onPress) {
      action.onPress();
      return;
    }
    if (action.href) {
      router.push(action.href);
    }
  }

  const renderBackdrop = useCallback(
    (props: ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.42} />
    ),
    [],
  );
  const renderConfirmFooter = useCallback(
    (props: ComponentProps<typeof BottomSheetFooter>) => (
      <BottomSheetFooter {...props} bottomInset={12}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12) + 12,
            gap: 10,
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#eef2f7",
          }}
        >
          <Pressable
            onPress={() => confirmSheet?.action()}
            disabled={Boolean(actionBusy)}
            style={{
              minHeight: 50,
              borderRadius: 18,
              backgroundColor: confirmSheet?.tone === "danger" ? "#0f172a" : "#2952d9",
              alignItems: "center",
              justifyContent: "center",
              opacity: actionBusy ? 0.6 : 1,
            }}
          >
            <Text selectable style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
              {actionBusy ? "Memproses..." : confirmSheet?.confirmLabel}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setConfirmSheet(null)}
            disabled={Boolean(actionBusy)}
            style={{
              minHeight: 48,
              borderRadius: 18,
              backgroundColor: "#eef2f7",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
              Batal
            </Text>
          </Pressable>
        </View>
      </BottomSheetFooter>
    ),
    [actionBusy, confirmSheet, insets.bottom],
  );
  const renderPickerFooter = useCallback(
    (props: ComponentProps<typeof BottomSheetFooter>) => (
      <BottomSheetFooter {...props} bottomInset={12}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12) + 12,
            gap: 10,
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#eef2f7",
          }}
        >
          {activeCartLines.length ? (
            <View style={{ gap: 8 }}>
              {activeCartLines.slice(0, 3).map((item) => (
                <View key={`cart-${item.id}`} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <Text selectable style={{ flex: 1, color: "#64748b", fontSize: 12 }}>
                    {item.name} x{item.quantity}
                  </Text>
                  <Text selectable style={{ color: "#0f172a", fontSize: 12, fontWeight: "700" }}>
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </Text>
                </View>
              ))}
              {activeCartLines.length > 3 ? (
                <Text selectable style={{ color: "#94a3b8", fontSize: 11 }}>
                  +{activeCartLines.length - 3} item lain
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={{ gap: 2 }}>
            <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
              RINGKASAN PILIHAN
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
              {formatCartSummary(activeCartCount, activeCartTotal)}
            </Text>
          </View>

          <CtaButton
            label={pickerSheet?.kind === "fnb" ? "Tambah pesanan" : "Tambah add-on"}
            tone="primary"
            disabled={Boolean(actionBusy) || activeCartCount <= 0}
            onPress={() =>
              pickerSheet
                ? openConfirm({
                    title: pickerSheet.kind === "fnb" ? "Tambahkan pesanan F&B" : "Tambahkan add-on",
                    message:
                      pickerSheet.kind === "fnb"
                        ? `${activeCartCount} item F&B akan masuk ke booking ini dengan total ${formatCurrency(activeCartTotal)}.`
                        : `${activeCartCount} add-on akan masuk ke booking ini dengan total ${formatCurrency(activeCartTotal)}.`,
                    confirmLabel: pickerSheet.kind === "fnb" ? "Kirim pesanan" : "Tambahkan",
                    action: () => {
                      if (pickerSheet.kind === "fnb") {
                        void handleAddFnbCart(menuCartLines);
                        return;
                      }
                      void handleAddAddonCart(addonCartLines);
                    },
                  })
                : undefined
            }
          />
        </View>
      </BottomSheetFooter>
    ),
    [actionBusy, activeCartCount, activeCartLines, activeCartTotal, addonCartLines, insets.bottom, menuCartLines, pickerSheet],
  );

  return (
    <ScreenShell
      eyebrow="Live booking"
      title={booking?.resource_name || "Sesi booking"}
      description="Controller mobile untuk mengaktifkan sesi, memantau waktu, dan menjalankan aksi live yang penting."
    >
      <CardBlock>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 22, fontWeight: "900" }}>
                {liveMeta.label}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                {liveMeta.hint}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", gap: 8 }}>
              <View style={{ borderRadius: 999, backgroundColor: liveMeta.bg, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text selectable style={{ color: liveMeta.tone, fontSize: 12, fontWeight: "800" }}>
                  {liveMeta.label}
                </Text>
              </View>
              <View style={{ borderRadius: 999, backgroundColor: paymentMeta.bg, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text selectable style={{ color: paymentMeta.tone, fontSize: 12, fontWeight: "800" }}>
                  {paymentMeta.label}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <MetaTile label="MULAI" value={booking?.start_time ? formatDateTime(booking.start_time) : "Menunggu jadwal"} />
            <MetaTile label="SELESAI" value={booking?.end_time ? formatDateTime(booking.end_time) : "Mengikuti durasi"} />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <MetaTile
              label={isActiveStatus ? "SISA WAKTU" : "TOTAL"}
              value={isActiveStatus ? formatRemainingLabel(remainingSeconds) : formatCurrency(booking?.grand_total)}
              emphasize
            />
            <MetaTile label="SISA TAGIHAN" value={balanceDue > 0 ? formatCurrency(balanceDue) : "Lunas"} emphasize={balanceDue > 0} />
          </View>
        </View>
      </CardBlock>

      {feedback ? (
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#bbf7d0",
            backgroundColor: "#f0fdf4",
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Text selectable style={{ color: "#166534", fontSize: 13, fontWeight: "700", lineHeight: 20 }}>
            {feedback}
          </Text>
        </View>
      ) : null}

      {beforeStartSeconds > 0 && !isActiveStatus && !isCompleted ? (
        <CardBlock>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
              Menunggu jam mulai
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
              Booking belum masuk ke waktu pemakaian. Saat countdown habis, sesi bisa diaktifkan dari layar ini.
            </Text>
          </View>

          <View style={{ borderRadius: 18, backgroundColor: "#eff6ff", paddingHorizontal: 14, paddingVertical: 14, gap: 4 }}>
            <Text selectable style={{ color: "#2563eb", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              MENUJU MULAI
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 26, fontWeight: "900", letterSpacing: -0.8 }}>
              {formatCountdown(beforeStartSeconds)}
            </Text>
          </View>
        </CardBlock>
      ) : null}

      {shouldShowActivation ? (
        <CardBlock>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
              Aktivasi sesi
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
              {activationReason}
            </Text>
          </View>

          {journeyActions.primary ? (
            <CtaButton
              label={actionBusy === "activate" && journeyActions.primary.label === "Aktifkan sesi" ? "Mengaktifkan..." : journeyActions.primary.label}
              tone={journeyActions.primary.tone}
              disabled={journeyActions.primary.disabled || actionBusy === "activate"}
              onPress={() => handleJourneyAction(journeyActions.primary!)}
            />
          ) : null}

          {journeyActions.primary?.hint ? (
            <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
              {journeyActions.primary.hint}
            </Text>
          ) : null}

          {journeyActions.secondary ? (
            <CtaButton
              label={journeyActions.secondary.label}
              tone="secondary"
              onPress={() => handleJourneyAction(journeyActions.secondary!)}
            />
          ) : null}
        </CardBlock>
      ) : null}

      {isActiveStatus ? (
        <CardBlock>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
              Countdown sesi
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
              Timer ini mengikuti state live backend dan akan refresh otomatis saat ada event baru.
            </Text>
          </View>

          <View style={{ borderRadius: 20, backgroundColor: remainingSeconds <= 300 ? "#0f172a" : "#eff6ff", paddingHorizontal: 16, paddingVertical: 16, gap: 6 }}>
            <Text selectable style={{ color: remainingSeconds <= 300 ? "#94a3b8" : "#2563eb", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              {remainingSeconds <= 300 ? "WAKTU HAMPIR HABIS" : "SESI BERJALAN"}
            </Text>
            <Text selectable style={{ color: remainingSeconds <= 300 ? "#ffffff" : "#0f172a", fontSize: 30, fontWeight: "900", letterSpacing: -1 }}>
              {formatCountdown(remainingSeconds)}
            </Text>
          </View>
        </CardBlock>
      ) : null}

      {isActiveStatus ? (
        <CardBlock>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
              Kontrol live
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
              Ikuti alur web: tambah durasi, pesan F&B, tambah add-on, lalu tutup sesi saat selesai.
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <ActionTile
              title="+1 sesi"
              subtitle={formatCurrency((booking?.unit_price || 0) * 1)}
              icon="bolt"
              disabled={Boolean(actionBusy)}
              onPress={() =>
                openConfirm({
                  title: "Tambah 1 sesi",
                  message: `Booking ini akan ditambah 1 sesi dan biaya tambahan ${formatCurrency((booking?.unit_price || 0) * 1)} akan masuk ke tagihan.`,
                  confirmLabel: "Tambah sesi",
                  action: () => {
                    void handleExtend(1);
                  },
                })
              }
            />
            <ActionTile
              title="+2 sesi"
              subtitle={formatCurrency((booking?.unit_price || 0) * 2)}
              icon="add-circle-outline"
              disabled={Boolean(actionBusy)}
              onPress={() =>
                openConfirm({
                  title: "Tambah 2 sesi",
                  message: `Booking ini akan ditambah 2 sesi dan biaya tambahan ${formatCurrency((booking?.unit_price || 0) * 2)} akan masuk ke tagihan.`,
                  confirmLabel: "Tambah sesi",
                  action: () => {
                    void handleExtend(2);
                  },
                })
              }
            />
          </View>

          <CtaButton
            label={actionBusy === "complete" ? "Menyelesaikan..." : "Selesaikan sesi"}
            tone="secondary"
            disabled={Boolean(actionBusy)}
            onPress={() =>
              openConfirm({
                title: "Selesaikan sesi",
                message: "Sesi booking akan ditutup sekarang. Jika masih ada sisa tagihan, langkah berikutnya adalah pelunasan.",
                confirmLabel: "Selesaikan",
                tone: "danger",
                action: () => {
                  void handleComplete();
                },
              })
            }
          />
        </CardBlock>
      ) : null}

      {isActiveStatus && (menuItems.length || addonItems.length) ? (
        <CardBlock>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
              Tambahan sesi
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
              Pilih F&B atau add-on dari picker terpisah supaya layar live tetap ringkas.
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <ActionTile
              title="Pesan F&B"
              subtitle={menuItems.length ? `${menuItems.length} item tersedia` : "Belum tersedia"}
              icon="restaurant-menu"
              disabled={Boolean(actionBusy) || !menuItems.length}
              onPress={() => openPicker("fnb")}
            />
            <ActionTile
              title="Tambah add-on"
              subtitle={addonItems.length ? `${addonItems.length} item tersedia` : "Belum tersedia"}
              icon="extension"
              disabled={Boolean(actionBusy) || !addonItems.length}
              onPress={() => openPicker("addon")}
            />
          </View>
        </CardBlock>
      ) : null}

      {groupedMainOptions.length || groupedAddonOptions.length || orderSummary.length ? (
        <CardBlock>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
              Ringkasan booking
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
              Susunan booking ini mengikuti pola web: layanan utama, add-on, lalu pesanan F&B yang sudah masuk.
            </Text>
          </View>

          <View style={{ gap: 14 }}>
            {groupedMainOptions.length ? (
              <View style={{ gap: 10 }}>
                <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                  LAYANAN UTAMA
                </Text>
                {groupedMainOptions.map((item) => (
                  <SectionRow
                    key={`main-${item.name}-${item.total}`}
                    title={item.name}
                    subtitle={`${item.quantity} item`}
                    value={formatCurrency(item.total)}
                  />
                ))}
              </View>
            ) : null}

            {groupedAddonOptions.length ? (
              <View style={{ gap: 10 }}>
                <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                  ADD-ON
                </Text>
                {groupedAddonOptions.map((item) => (
                  <SectionRow
                    key={`addon-${item.name}-${item.total}`}
                    title={item.name}
                    subtitle={`${item.quantity} item`}
                    value={formatCurrency(item.total)}
                  />
                ))}
              </View>
            ) : null}

            {orderSummary.length ? (
              <View style={{ gap: 10 }}>
                <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                  PESANAN F&B
                </Text>
                {orderSummary.map((item) => (
                  <SectionRow
                    key={`order-${item.name}-${item.subtotal}`}
                    title={item.name}
                    subtitle={`${item.quantity} item`}
                    value={formatCurrency(item.subtotal)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </CardBlock>
      ) : null}

      <CardBlock>
        <View style={{ gap: 6 }}>
          <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
            Pembayaran booking
          </Text>
          <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
            Polanya sama seperti web: DP sebelum sesi aktif, pelunasan setelah sesi selesai.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <MetaTile label="TOTAL" value={formatCurrency(booking?.grand_total)} />
          <MetaTile label="DIBAYAR" value={paidAmount > 0 ? formatCurrency(paidAmount) : "-"} />
          <MetaTile label="SISA" value={balanceDue > 0 ? formatCurrency(balanceDue) : "Lunas"} emphasize={balanceDue > 0} />
        </View>

        {paymentAction ? (
          <CtaButton
            label={paymentAction.label}
            tone="primary"
            onPress={() => router.push(paymentAction.href)}
          />
        ) : null}
      </CardBlock>

      {recentEvents.length ? (
        <CardBlock>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
              Riwayat aktivitas
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
              Jejak tindakan dan perubahan status terbaru pada booking ini.
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            {recentEvents.map((event) => (
              <View
                key={event.id || `${event.title}-${event.created_at}`}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                  borderRadius: 18,
                  backgroundColor: "#f8fafc",
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name={eventIcon(event.title)} size={18} color="#2952d9" />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                    {event.title || "Aktivitas booking"}
                  </Text>
                  {event.description ? (
                    <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
                      {event.description}
                    </Text>
                  ) : null}
                  <Text selectable style={{ color: "#94a3b8", fontSize: 11 }}>
                    {event.created_at ? formatDateTime(event.created_at) : "-"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </CardBlock>
      ) : null}

      {confirmSheet ? (
        <BottomSheetModal
          ref={confirmSheetRef}
          index={0}
          snapPoints={confirmSnapPoints}
          enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onDismiss={() => setConfirmSheet(null)}
        footerComponent={renderConfirmFooter}
        handleIndicatorStyle={{ backgroundColor: "#d9e2ec", width: 42, height: 5 }}
        backgroundStyle={{ backgroundColor: "#ffffff" }}
      >
          <BottomSheetView style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 120, gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 21, fontWeight: "900" }}>
                {confirmSheet.title}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 14, lineHeight: 21 }}>
                {confirmSheet.message}
              </Text>
            </View>
          </BottomSheetView>
        </BottomSheetModal>
      ) : null}

      {pickerSheet ? (
        <BottomSheetModal
          ref={pickerSheetRef}
          index={0}
          snapPoints={pickerSnapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          onDismiss={() => setPickerSheet(null)}
          footerComponent={renderPickerFooter}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          handleIndicatorStyle={{ backgroundColor: "#d9e2ec", width: 42, height: 5 }}
          backgroundStyle={{ backgroundColor: "#ffffff" }}
        >
          <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8, gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 21, fontWeight: "900" }}>
                {pickerSheet.title}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 14, lineHeight: 21 }}>
                {pickerSheet.kind === "fnb"
                  ? "Pilih item F&B lalu tambahkan ke booking aktif."
                  : "Pilih add-on yang ingin dimasukkan ke booking ini."}
              </Text>
            </View>

            <BottomSheetTextInput
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder={pickerSheet.kind === "fnb" ? "Cari menu..." : "Cari add-on..."}
              placeholderTextColor="#94a3b8"
              style={{
                minHeight: 48,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#d9e2ec",
                backgroundColor: "#f8fafc",
                paddingHorizontal: 14,
                color: "#0f172a",
                fontSize: 14,
              }}
            />

            <BottomSheetScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 10, paddingBottom: 220 }}
            >
            {(pickerSheet?.kind === "fnb" ? filteredMenuItems : filteredAddonItems).map((item) => (
              <View
                key={item.id || item.name}
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "#e6ebf2",
                  backgroundColor: "#ffffff",
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  opacity: Boolean(actionBusy) ? 0.65 : 1,
                }}
              >
                {"image_url" in item && item.image_url ? (
                  <Image
                    source={item.image_url}
                    contentFit="cover"
                    style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: "#eef2f7" }}
                  />
                ) : (
                  <View
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 14,
                      backgroundColor: pickerSheet?.kind === "fnb" ? "#fff7ed" : "#ecfdf5",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons
                      name={pickerSheet?.kind === "fnb" ? "restaurant-menu" : "extension"}
                      size={20}
                      color={pickerSheet?.kind === "fnb" ? "#d97706" : "#059669"}
                    />
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                    {item.name || "Item"}
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                    {pickerSheet?.kind === "fnb"
                      ? [
                          ("category" in item ? item.category : ""),
                          formatCurrency(Number(("price" in item ? item.price : 0) || ("unit_price" in item ? item.unit_price : 0))),
                        ]
                          .filter(Boolean)
                          .join(" / ")
                      : formatCurrency(Number(("price" in item ? item.price : 0) || ("unit_price" in item ? item.unit_price : 0)))}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Pressable
                    hitSlop={8}
                    disabled={Boolean(actionBusy) || !item.id}
                    onPress={() =>
                      changeCartQuantity(
                        pickerSheet?.kind || "fnb",
                        String(item.id || ""),
                        Math.max(((pickerSheet?.kind === "fnb" ? menuCart : addonCart)[String(item.id || "")] || 0) - 1, 0),
                      )
                    }
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: "#f3f6fb",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="remove" size={18} color="#0f172a" />
                  </Pressable>
                  <Text selectable style={{ minWidth: 18, textAlign: "center", color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                    {(pickerSheet?.kind === "fnb" ? menuCart : addonCart)[String(item.id || "")] || 0}
                  </Text>
                  <Pressable
                    hitSlop={8}
                    disabled={Boolean(actionBusy) || !item.id}
                    onPress={() =>
                      changeCartQuantity(
                        pickerSheet?.kind || "fnb",
                        String(item.id || ""),
                        ((pickerSheet?.kind === "fnb" ? menuCart : addonCart)[String(item.id || "")] || 0) + 1,
                      )
                    }
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: "#eff6ff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="add" size={18} color="#2952d9" />
                  </Pressable>
                </View>
              </View>
            ))}

              {(pickerSheet?.kind === "fnb" ? filteredMenuItems : filteredAddonItems).length === 0 ? (
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: "#e6ebf2",
                    backgroundColor: "#f8fafc",
                    paddingHorizontal: 14,
                    paddingVertical: 16,
                    gap: 6,
                  }}
                >
                  <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                    Tidak ada item yang cocok
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
                    Ubah kata kunci pencarian atau tutup picker ini.
                  </Text>
                </View>
              ) : null}
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheetModal>
      ) : null}
    </ScreenShell>
  );
}
