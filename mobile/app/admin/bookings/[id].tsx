import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ConfirmModal } from "@/components/confirm-modal";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useRealtime } from "@/hooks/use-realtime";
import {
  getAdminBookingStatusMeta,
  getAdminBookingTotal,
} from "@/lib/admin-bookings";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  BOOKING_EVENT_PREFIXES,
  matchesRealtimePrefix,
} from "@/lib/realtime/event-types";
import { tenantBookingChannel } from "@/lib/realtime/channels";
import { hasAdminPermission } from "@/lib/admin-access";
import { useToast } from "@/hooks/use-toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BookingOption = {
  id?: string;
  item_name?: string;
  item_type?: string;
  quantity?: number;
  unit_price?: number;
  price_at_booking?: number;
};

type BookingOrder = {
  fnb_item_id?: string;
  item_name?: string;
  quantity?: number;
  price_at_purchase?: number;
  subtotal?: number;
};

type ResourceAddon = {
  id: string;
  name?: string;
  price?: number;
  image_url?: string;
};

type FnbCatalogItem = {
  id: string;
  name?: string;
  category?: string;
  description?: string;
  price?: number;
  unit_price?: number;
  image_url?: string | null;
  is_available?: boolean;
};

type BookingEvent = {
  id: string;
  actor_type?: string;
  actor_name?: string;
  actor_role?: string;
  event_type?: string;
  title?: string;
  description?: string;
  created_at?: string;
};

type BookingPaymentAttempt = {
  id: string;
  method_code?: string;
  method_label?: string;
  verification_type?: string;
  payment_scope?: string;
  status?: string;
  reference_code?: string;
  amount?: number;
  proof_url?: string;
  payer_note?: string;
  submitted_at?: string;
  verified_at?: string;
};

type BookingPaymentMethod = {
  code?: string;
  display_name?: string;
  verification_type?: string;
  instructions?: string;
  is_active?: boolean;
  metadata?: Record<string, string>;
};

type BookingDetail = {
  id: string;
  status?: string;
  payment_status?: string;
  controller_features?: {
    enable_fnb?: boolean;
    enable_addons?: boolean;
  };
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  resource_name?: string;
  start_time?: string;
  end_time?: string;
  original_grand_total?: number;
  discount_amount?: number;
  grand_total?: number;
  total_resource?: number;
  deposit_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  total_fnb?: number;
  resource_addons?: ResourceAddon[];
  payment_methods?: BookingPaymentMethod[];
  options?: BookingOption[];
  orders?: BookingOrder[];
  events?: BookingEvent[];
  payment_attempts?: BookingPaymentAttempt[];
};

type ChipTone = "blue" | "success" | "amber" | "danger" | "slate";
type ActionTone = "primary" | "secondary" | "danger" | "success" | "dark";
type CartLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  category?: string;
  imageUrl?: string | null;
};

function formatAmount(value?: number) {
  const formatted = formatCurrency(value || 0);
  return formatted === "Cek harga" ? "Rp 0" : formatted;
}

function groupOptions(options: BookingOption[] = []) {
  const groups = options.reduce<
    Record<string, BookingOption & { quantity: number; total_price: number }>
  >((acc, item) => {
    const key = `${item.item_type || "option"}:${String(
      item.item_name || "",
    ).trim().toLowerCase()}`;
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || item.price_at_booking || 0);
    if (!acc[key]) {
      acc[key] = {
        ...item,
        quantity,
        total_price: unitPrice * quantity,
      };
    } else {
      acc[key] = {
        ...acc[key],
        quantity: Number(acc[key].quantity || 0) + quantity,
        total_price: Number(acc[key].total_price || 0) + unitPrice * quantity,
      };
    }
    return acc;
  }, {});
  return Object.values(groups);
}

function groupOrders(orders: BookingOrder[] = []) {
  const groups = orders.reduce<
    Record<string, BookingOrder & { quantity: number; subtotal: number }>
  >((acc, item) => {
    const key = String(item.item_name || "").trim().toLowerCase();
    const quantity = Number(item.quantity || 0);
    const subtotal = Number(item.subtotal || 0);
    if (!acc[key]) {
      acc[key] = { ...item, quantity, subtotal };
    } else {
      acc[key] = {
        ...acc[key],
        quantity: Number(acc[key].quantity || 0) + quantity,
        subtotal: Number(acc[key].subtotal || 0) + subtotal,
      };
    }
    return acc;
  }, {});
  return Object.values(groups);
}

function actorLabel(event: BookingEvent) {
  if (event.actor_name && event.actor_role) {
    return `${event.actor_name} | ${event.actor_role}`;
  }
  if (event.actor_name) return event.actor_name;
  if (event.actor_type === "customer") return "Customer";
  if (event.actor_type === "payment") return "Payment gateway";
  if (event.actor_type === "admin") return "Tim admin";
  return "Sistem";
}

export default function AdminBookingDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id || "");
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const guard = useAuthGuard("admin");
  const identityQuery = useAdminIdentity();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [attemptLoading, setAttemptLoading] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [activeStep, setActiveStep] = useState<"action" | "payment">("action");
  const [catalogOpen, setCatalogOpen] = useState<null | "fnb" | "addon">(null);
  const [catalogStage, setCatalogStage] = useState<"pick" | "confirm">("pick");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [menuCart, setMenuCart] = useState<Record<string, number>>({});
  const [addonCart, setAddonCart] = useState<Record<string, number>>({});
  const catalogSheetRef = useRef<BottomSheetModal>(null);
  const confirmHandlerRef = useRef<null | (() => void)>(null);
  const [confirmSheet, setConfirmSheet] = useState<null | {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: ActionTone;
    cartLines?: CartLine[];
    cartCount?: number;
    cartTotal?: number;
  }>(null);

  const bookingQuery = useQuery({
    queryKey: ["admin-booking-detail", id],
    enabled: guard.ready && Boolean(id),
    queryFn: () => apiFetch<BookingDetail>(`/bookings/${id}`, { audience: "admin" }),
  });
  const realtime = useRealtime({
    enabled: Boolean(identityQuery.data?.tenant_id && id),
    channels: identityQuery.data?.tenant_id
      ? [tenantBookingChannel(identityQuery.data.tenant_id, id)]
      : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      void bookingQuery.refetch();
    },
    onReconnect: () => {
      void bookingQuery.refetch();
    },
  });

  const booking = bookingQuery.data;
  const statusMeta = booking ? getAdminBookingStatusMeta(booking) : null;
  const groupedOptions = useMemo(
    () => groupOptions(booking?.options || []),
    [booking?.options],
  );
  const groupedOrders = useMemo(
    () => groupOrders(booking?.orders || []),
    [booking?.orders],
  );
  const mainOptions = groupedOptions.filter(
    (item) => item.item_type === "main_option",
  );
  const addonOptions = groupedOptions.filter(
    (item) => item.item_type !== "main_option",
  );
  const adminUser = identityQuery.data;
  const status = String(booking?.status || "").toLowerCase();
  const paymentStatus = String(booking?.payment_status || "").toLowerCase();
  const paymentMethods = (booking?.payment_methods || []).filter(
    (item) => item.is_active !== false,
  );
  const selectedMethodDetail =
    paymentMethods.find((item) => item.code === selectedMethod) ||
    paymentMethods[0] ||
    null;
  const pendingManualAttempts = (booking?.payment_attempts || []).filter((item) =>
    ["submitted", "awaiting_verification"].includes(
      String(item.status || "").toLowerCase(),
    ),
  );
  const hasPendingManualVerification = pendingManualAttempts.length > 0;
  const hasPaidDp =
    paymentStatus === "partial_paid" ||
    paymentStatus === "paid" ||
    paymentStatus === "settled" ||
    Number(booking?.deposit_amount || 0) === 0;
  const hasDepositOverride = paymentStatus === "deposit_overridden";
  const isPaymentSettled =
    paymentStatus === "settled" ||
    (paymentStatus === "paid" && Number(booking?.balance_due || 0) === 0);
  const canConfirm =
    status === "pending" &&
    paymentStatus !== "awaiting_verification" &&
    hasAdminPermission(adminUser, "bookings.confirm");
  const canStart =
    (status === "pending" || status === "confirmed") &&
    (hasPaidDp || hasDepositOverride) &&
    hasAdminPermission(adminUser, "sessions.start");
  const canComplete =
    status === "active" &&
    hasAdminPermission(adminUser, "sessions.complete");
  const canCancel =
    ["pending", "confirmed"].includes(status) &&
    hasAdminPermission(adminUser, "bookings.cancel");
  const canSettleCash =
    status === "completed" &&
    !isPaymentSettled &&
    !hasPendingManualVerification &&
    paymentStatus !== "awaiting_verification" &&
    Number(booking?.balance_due || 0) > 0 &&
    hasAdminPermission(adminUser, "pos.cash.settle");
  const canSendReceipt =
    isPaymentSettled && hasAdminPermission(adminUser, "receipts.send");
  const canExtend =
    status === "active" && hasAdminPermission(adminUser, "sessions.extend");
  const canAddLineItems =
    status === "active" && hasAdminPermission(adminUser, "pos.order.add");
  const enableFnb = booking?.controller_features?.enable_fnb !== false;
  const enableAddons = booking?.controller_features?.enable_addons !== false;
  const canAddFnb = canAddLineItems && enableFnb;
  const canAddAddon = canAddLineItems && enableAddons;
  const canRecordDeposit =
    hasAdminPermission(adminUser, "pos.cash.settle") &&
    (status === "pending" || status === "confirmed") &&
    Number(booking?.deposit_amount || 0) > 0 &&
    !hasPaidDp &&
    !hasPendingManualVerification &&
    !hasDepositOverride;
  const canOverrideDeposit =
    hasAdminPermission(adminUser, "sessions.start") &&
    (status === "pending" || status === "confirmed") &&
    Number(booking?.deposit_amount || 0) > 0 &&
    !hasPaidDp &&
    !hasPendingManualVerification &&
    !hasDepositOverride;
  const canCreateManualPayment = hasAdminPermission(
    adminUser,
    "pos.cash.settle",
  );
  const fnbCatalogQuery = useQuery({
    queryKey: ["admin-booking-fnb-catalog", id],
    enabled: guard.ready && Boolean(id) && canAddFnb,
    queryFn: () => apiFetch<FnbCatalogItem[]>("/fnb", { audience: "admin" }),
    staleTime: 30_000,
  });
  const resourceAddons = enableAddons ? booking?.resource_addons || [] : [];
  const fnbItems = (fnbCatalogQuery.data || []).filter(
    (item) => item.is_available !== false,
  );
  const requiredPaymentScope =
    status === "completed" && Number(booking?.balance_due || 0) > 0
      ? "settlement"
      : Number(booking?.deposit_amount || 0) > 0 &&
          !hasPaidDp &&
          !hasDepositOverride
        ? "deposit"
        : null;

  useEffect(() => {
    if (!paymentMethods.length) return;
    if (paymentMethods.some((item) => item.code === selectedMethod)) return;
    const nextCode = String(paymentMethods[0]?.code || "");
    if (nextCode) setSelectedMethod(nextCode);
  }, [paymentMethods, selectedMethod]);

  useEffect(() => {
    if (hasPendingManualVerification || requiredPaymentScope) {
      setActiveStep("payment");
      return;
    }
    setActiveStep("action");
  }, [hasPendingManualVerification, requiredPaymentScope]);

  useEffect(() => {
    if (catalogOpen && status !== "active") {
      setCatalogOpen(null);
      setCatalogSearch("");
      setMenuCart({});
      setAddonCart({});
    }
  }, [catalogOpen, status]);

  useEffect(() => {
    if (catalogOpen) {
      catalogSheetRef.current?.present();
      return;
    }
    catalogSheetRef.current?.dismiss();
  }, [catalogOpen]);

  async function runAction(
    key: string,
    request: () => Promise<unknown>,
    successMessage: string,
  ) {
    try {
      setActionLoading(key);
      await request();
      showToast({ title: "Berhasil", message: successMessage, tone: "success" });
      await bookingQuery.refetch();
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal",
        message: err.message || "Aksi tidak bisa diproses.",
        tone: "error",
      });
    } finally {
      setActionLoading(null);
    }
  }

  function confirmAction(
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmLabel?: string;
      tone?: ActionTone;
      cartLines?: CartLine[];
      cartCount?: number;
      cartTotal?: number;
    },
  ) {
    confirmHandlerRef.current = onConfirm;
    setConfirmSheet({
      title,
      message,
      confirmLabel: options?.confirmLabel || "Lanjut",
      tone: options?.tone || "primary",
      cartLines: options?.cartLines,
      cartCount: options?.cartCount,
      cartTotal: options?.cartTotal,
    });
  }

  async function updateStatus(
    nextStatus: "confirmed" | "active" | "completed" | "cancelled",
  ) {
    if (nextStatus === "cancelled" && !canCancel) {
      showToast({
        title: "Tidak bisa dibatalkan",
        message:
          status === "active"
            ? "Sesi yang sudah dimulai harus diakhiri, bukan dibatalkan."
            : "Booking ini sudah tidak bisa dibatalkan.",
        tone: "warning",
      });
      return;
    }
    await runAction(
      `status:${nextStatus}`,
      () =>
        apiFetch(`/bookings/${id}/status`, {
          audience: "admin",
          method: "PUT",
          body: JSON.stringify({ status: nextStatus }),
        }),
      nextStatus === "confirmed"
        ? "Booking berhasil dikonfirmasi."
        : nextStatus === "active"
          ? "Sesi berhasil dimulai."
          : nextStatus === "completed"
            ? "Sesi berhasil diakhiri."
            : "Booking berhasil dibatalkan.",
    );
  }

  async function settleCash() {
    await runAction(
      "settle-cash",
      () =>
        apiFetch(`/bookings/${id}/settle-cash`, {
          audience: "admin",
          method: "POST",
        }),
      "Pelunasan cash berhasil dicatat.",
    );
  }

  async function recordDeposit() {
    await runAction(
      "record-deposit",
      () =>
        apiFetch(`/bookings/${id}/record-deposit`, {
          audience: "admin",
          method: "POST",
          body: JSON.stringify({ notes: "DP diterima oleh admin via mobile." }),
        }),
      "DP berhasil dicatat.",
    );
  }

  async function overrideDeposit() {
    await runAction(
      "override-deposit",
      () =>
        apiFetch(`/bookings/${id}/override-deposit`, {
          audience: "admin",
          method: "POST",
          body: JSON.stringify({
            reason: "Booking dijalankan tanpa DP oleh admin mobile.",
          }),
        }),
      "Booking sekarang boleh jalan tanpa DP.",
    );
  }

  async function sendReceipt() {
    await runAction(
      "receipt-send",
      () =>
        apiFetch(`/bookings/${id}/receipt/send`, {
          audience: "admin",
          method: "POST",
        }),
      "Nota WhatsApp berhasil dikirim.",
    );
  }

  async function extendOneSession() {
    await runAction(
      "extend-session",
      () =>
        apiFetch(`/bookings/${id}/extend`, {
          audience: "admin",
          method: "POST",
          body: JSON.stringify({ additional_duration: 1 }),
        }),
      "Sesi berhasil diperpanjang 1 slot.",
    );
  }

  async function processPaymentMethod() {
    if (!requiredPaymentScope || !selectedMethodDetail?.code) {
      showToast({
        title: "Belum siap",
        message: "Belum ada aksi pembayaran yang bisa dijalankan.",
        tone: "info",
      });
      return;
    }

    const methodCode = String(selectedMethodDetail.code || "");
    const verificationType = String(
      selectedMethodDetail.verification_type || "",
    );
    const actionKey = `payment:${requiredPaymentScope}:${methodCode}`;

    if (methodCode === "cash" && requiredPaymentScope === "settlement") {
      await settleCash();
      return;
    }

    if (methodCode === "cash" && requiredPaymentScope === "deposit") {
      await recordDeposit();
      return;
    }

    if (verificationType === "auto") {
      await runAction(
        actionKey,
        async () => {
          const checkout = await apiFetch<{ redirect_url?: string }>(
            `/billing/bookings/checkout?mode=${requiredPaymentScope}&method=${methodCode}`,
            {
              audience: "admin",
              method: "POST",
              body: JSON.stringify({ booking_id: id }),
            },
          );
          const redirectUrl = String(checkout?.redirect_url || "").trim();
          if (!redirectUrl) {
            throw new Error(
              "Gateway checkout tidak mengembalikan redirect URL.",
            );
          }
          await WebBrowser.openBrowserAsync(redirectUrl);
        },
        requiredPaymentScope === "deposit"
          ? "Checkout DP dibuka lewat gateway pembayaran."
          : "Checkout pelunasan dibuka lewat gateway pembayaran.",
      );
      return;
    }

    await runAction(
      actionKey,
      () =>
        apiFetch(`/bookings/${id}/manual-payment`, {
          audience: "admin",
          method: "POST",
          body: JSON.stringify({
            booking_id: id,
            scope: requiredPaymentScope,
            method: methodCode,
          }),
        }),
      requiredPaymentScope === "deposit"
        ? "Transaksi manual DP berhasil dibuat."
        : "Transaksi manual pelunasan berhasil dibuat.",
    );
  }

  async function verifyAttempt(attemptID: string, approve: boolean) {
    try {
      setAttemptLoading(attemptID);
      await apiFetch(
        `/bookings/payment-attempts/${attemptID}/${approve ? "verify" : "reject"}`,
        {
          audience: "admin",
          method: "POST",
          body: JSON.stringify({ notes: "" }),
        },
      );
      showToast({
        title: "Berhasil",
        message: approve
          ? "Pembayaran manual diverifikasi."
          : "Pembayaran manual ditolak.",
        tone: "success",
      });
      await bookingQuery.refetch();
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal",
        message: err.message || "Verifikasi pembayaran gagal.",
        tone: "error",
      });
    } finally {
      setAttemptLoading(null);
    }
  }

  function openCatalog(kind: "fnb" | "addon") {
    setCatalogOpen(kind);
    setCatalogStage("pick");
    setCatalogSearch("");
    if (kind === "fnb") {
      setMenuCart({});
      return;
    }
    setAddonCart({});
  }

  function closeCatalog() {
    setCatalogOpen(null);
    setCatalogStage("pick");
    setCatalogSearch("");
    setMenuCart({});
    setAddonCart({});
  }

  function changeCartQuantity(
    kind: "fnb" | "addon",
    itemID: string,
    nextQuantity: number,
  ) {
    const updater = (current: Record<string, number>) => {
      const next = { ...current };
      if (nextQuantity <= 0) {
        delete next[itemID];
      } else {
        next[itemID] = nextQuantity;
      }
      return next;
    };
    if (kind === "fnb") {
      setMenuCart(updater);
      return;
    }
    setAddonCart(updater);
  }

  function closeConfirmSheet() {
    confirmHandlerRef.current = null;
    setConfirmSheet(null);
  }

  function submitConfirmedAction() {
    const handler = confirmHandlerRef.current;
    closeConfirmSheet();
    if (handler) handler();
  }

  async function submitFnbCart(lines: CartLine[]) {
    if (!lines.length) return;
    await runAction(
      "add-fnb",
      async () => {
        for (const item of lines) {
          await apiFetch(`/bookings/pos/order/${id}`, {
            audience: "admin",
            method: "POST",
            body: JSON.stringify({
              fnb_item_id: item.id,
              quantity: item.quantity,
            }),
          });
        }
        closeCatalog();
      },
      "Pesanan F&B berhasil ditambahkan.",
    );
  }

  async function submitAddonCart(lines: CartLine[]) {
    if (!lines.length) return;
    await runAction(
      "add-addon",
      async () => {
        for (const item of lines) {
          for (let index = 0; index < item.quantity; index += 1) {
            await apiFetch(`/bookings/${id}/addons`, {
              audience: "admin",
              method: "POST",
              body: JSON.stringify({ item_id: item.id }),
            });
          }
        }
        closeCatalog();
      },
      "Add-on berhasil ditambahkan.",
    );
  }

  const nextActionMeta = resolveNextAction({
    status,
    paymentStatus,
    balanceDue: Number(booking?.balance_due || 0),
    depositAmount: Number(booking?.deposit_amount || 0),
    hasPendingManualVerification,
    hasPaidDp,
    hasDepositOverride,
  });
  const sessionChipTone = bookingStatusTone(status);
  const paymentChipTone = paymentStatusTone(
    paymentStatus,
    Number(booking?.balance_due || 0),
    hasDepositOverride,
  );
  const primaryAction = canConfirm
    ? {
        title: "Konfirmasi booking",
        description: "Siapkan booking ini untuk dijalankan.",
        label: actionLoading === "status:confirmed" ? "Memproses..." : "Konfirmasi",
        onPress: () =>
          confirmAction(
            "Konfirmasi booking",
            "Booking ini akan dipindah ke status confirmed.",
            () => void updateStatus("confirmed"),
          ),
        icon: "shield-check-outline" as const,
        tone: "primary" as const,
        badge: "Step 1",
      }
    : canStart
      ? {
          title: "Mulai sesi",
          description: "Mulai sesi customer sekarang.",
          label: actionLoading === "status:active" ? "Memproses..." : "Mulai sesi",
          onPress: () =>
            confirmAction(
              "Mulai sesi",
              "Sesi customer akan dimulai sekarang.",
              () => void updateStatus("active"),
            ),
          icon: "play-circle-outline" as const,
          tone: "success" as const,
          badge: "Ready",
        }
      : canComplete
        ? {
            title: "Akhiri sesi",
            description: "Tutup sesi aktif lalu lanjutkan tagihan bila perlu.",
            label:
              actionLoading === "status:completed"
                ? "Memproses..."
                : "Akhiri sesi",
            onPress: () =>
              confirmAction(
                "Akhiri sesi",
                "Sesi akan ditandai selesai dan siap pelunasan.",
                () => void updateStatus("completed"),
              ),
            icon: "flag-checkered" as const,
            tone: "dark" as const,
            badge: "Live",
          }
        : null;
  const filteredFnbItems = useMemo(
    () =>
      fnbItems.filter((item) =>
        `${item.name || ""} ${item.category || ""}`
          .toLowerCase()
          .includes(catalogSearch.toLowerCase()),
      ),
    [catalogSearch, fnbItems],
  );
  const filteredAddonItems = useMemo(
    () =>
      resourceAddons.filter((item) =>
        `${item.name || ""}`.toLowerCase().includes(catalogSearch.toLowerCase()),
      ),
    [catalogSearch, resourceAddons],
  );
  const menuCartCount = useMemo(
    () => Object.values(menuCart).reduce((total, qty) => total + qty, 0),
    [menuCart],
  );
  const addonCartCount = useMemo(
    () => Object.values(addonCart).reduce((total, qty) => total + qty, 0),
    [addonCart],
  );
  const menuCartTotal = useMemo(
    () =>
      Object.entries(menuCart).reduce((total, [itemID, quantity]) => {
        const item = fnbItems.find((entry) => entry.id === itemID);
        return total + Number(item?.price || item?.unit_price || 0) * quantity;
      }, 0),
    [fnbItems, menuCart],
  );
  const addonCartTotal = useMemo(
    () =>
      Object.entries(addonCart).reduce((total, [itemID, quantity]) => {
        const item = resourceAddons.find((entry) => entry.id === itemID);
        return total + Number(item?.price || 0) * quantity;
      }, 0),
    [addonCart, resourceAddons],
  );
  const menuCartLines = useMemo<CartLine[]>(
    () =>
      Object.entries(menuCart)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemID, quantity]) => {
          const item = fnbItems.find((entry) => entry.id === itemID);
          return {
            id: itemID,
            name: item?.name || "Menu",
            quantity,
            unitPrice: Number(item?.price || item?.unit_price || 0),
            category: item?.category || "F&B",
            imageUrl: item?.image_url,
          };
        }),
    [fnbItems, menuCart],
  );
  const addonCartLines = useMemo<CartLine[]>(
    () =>
      Object.entries(addonCart)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemID, quantity]) => {
          const item = resourceAddons.find((entry) => entry.id === itemID);
          return {
            id: itemID,
            name: item?.name || "Add-on",
            quantity,
            unitPrice: Number(item?.price || 0),
            category: "Add-on",
            imageUrl: item?.image_url,
          };
        }),
    [addonCart, resourceAddons],
  );
  const activeCartLines = catalogOpen === "fnb" ? menuCartLines : addonCartLines;
  const activeCartCount = catalogOpen === "fnb" ? menuCartCount : addonCartCount;
  const activeCartTotal = catalogOpen === "fnb" ? menuCartTotal : addonCartTotal;
  const activeCatalogTitle = catalogOpen === "fnb" ? "Tambah F&B" : "Tambah add-on";
  const activeCatalogSubmitLabel = catalogOpen === "fnb" ? "Tambah F&B" : "Tambah add-on";
  const activeCatalogLoadingKey = catalogOpen === "fnb" ? "add-fnb" : "add-addon";
  const activeCatalogConfirmTitle =
    catalogOpen === "fnb" ? "Konfirmasi pesanan" : "Konfirmasi add-on";
  const activeCatalogConfirmDescription =
    catalogOpen === "fnb"
      ? "Cek lagi item sebelum masuk ke booking."
      : "Cek lagi add-on sebelum ditambahkan ke booking.";
  const catalogSnapPoints = useMemo(() => ["78%"], []);
  const renderCatalogBackdrop = useCallback(
    (props: ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.42}
      />
    ),
    [],
  );
  const renderCatalogFooter = useCallback(
    (props: ComponentProps<typeof BottomSheetFooter>) => (
      <BottomSheetFooter
        {...props}
        bottomInset={Math.max(insets.bottom - 6, 2)}
      >
        <View
          style={{
            marginHorizontal: 14,
            marginBottom: 6,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "#e6ebf2",
            backgroundColor: "#ffffff",
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12,
            gap: 12,
          }}
        >
          <View style={{ gap: 8 }}>
            {activeCartLines.length ? (
              <View style={{ gap: 6 }}>
                {activeCartLines.slice(0, 3).map((item) => (
                  <View
                    key={`footer-cart-${item.id}`}
                    style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}
                  >
                    <Text selectable style={{ flex: 1, color: "#64748b", fontSize: 12 }}>
                      {item.name} x{item.quantity}
                    </Text>
                    <Text selectable style={{ color: "#0f172a", fontSize: 12, fontWeight: "700" }}>
                      {formatAmount(item.unitPrice * item.quantity)}
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
              <Text selectable style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                RINGKASAN PILIHAN
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                {activeCartCount > 0
                  ? `${activeCartCount} item / ${formatAmount(activeCartTotal)}`
                  : "Belum ada item dipilih"}
              </Text>
            </View>
          </View>
          {catalogStage === "pick" ? (
            <CtaButton
              label="Review pesanan"
              onPress={() => setCatalogStage("confirm")}
              disabled={Boolean(actionLoading) || activeCartCount === 0}
            />
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <CtaButton
                  tone="secondary"
                  label="Kembali edit"
                  onPress={() => setCatalogStage("pick")}
                  disabled={Boolean(actionLoading)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CtaButton
                  label={
                    actionLoading === activeCatalogLoadingKey
                      ? "Memproses..."
                      : activeCatalogSubmitLabel
                  }
                  onPress={() => {
                    if (catalogOpen === "fnb") {
                      void submitFnbCart(menuCartLines);
                      return;
                    }
                    void submitAddonCart(addonCartLines);
                  }}
                  disabled={Boolean(actionLoading) || activeCartCount === 0}
                />
              </View>
            </View>
          )}
        </View>
      </BottomSheetFooter>
    ),
    [
      actionLoading,
      activeCatalogLoadingKey,
      activeCatalogSubmitLabel,
      activeCartLines,
      activeCartCount,
      activeCartTotal,
      addonCartLines,
      catalogStage,
      insets.bottom,
      catalogOpen,
      menuCartLines,
    ],
  );
  if (!guard.ready || bookingQuery.isLoading) {
    return (
      <ScreenShell
        eyebrow="Admin booking"
        title="Memuat booking"
        description="Menyiapkan detail booking admin."
      >
        <CardBlock>
          <Text selectable style={{ color: "#64748b", fontSize: 14 }}>
            Memuat data booking...
          </Text>
        </CardBlock>
      </ScreenShell>
    );
  }

  if (!booking) {
    return (
      <ScreenShell
        eyebrow="Admin booking"
        title="Booking tidak ditemukan"
        description="Data booking tidak bisa dimuat dari mobile admin."
      >
        <CtaButton
          label="Kembali ke bookings"
          onPress={() => router.replace("/admin/bookings")}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      eyebrow="Admin booking"
      title={booking.resource_name || "Detail booking"}
      description={`${booking.customer_name || "Customer"} / ${booking.customer_phone || "-"}`}
    >
      <Pressable
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/admin/bookings");
        }}
        style={{ alignSelf: "flex-start", paddingVertical: 4 }}
      >
        <Text selectable style={{ color: "#64748b", fontSize: 13, fontWeight: "800" }}>
          Kembali
        </Text>
      </Pressable>

      <CardBlock>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
              Kontrol
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
              State dulu, aksi utama, detail belakangan.
            </Text>
          </View>
          {Number(booking.balance_due || 0) > 0 ? (
            <StatusChip label={formatAmount(booking.balance_due)} tone="blue" compact />
          ) : null}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {statusMeta ? (
            <StatusChip label={statusMeta.label} tone={sessionChipTone} />
          ) : null}
          <StatusChip
            label={paymentStatusLabel(
              paymentStatus,
              Number(booking.balance_due || 0),
              hasDepositOverride,
            )}
            tone={paymentChipTone}
          />
          {hasPendingManualVerification ? (
            <StatusChip label="Review payment" tone="amber" />
          ) : null}
          <StatusChip
            label={realtime.connected ? "Live" : realtime.status === "connecting" || realtime.status === "reconnecting" ? "Connecting" : "Offline"}
            tone={realtime.connected ? "success" : realtime.status === "connecting" || realtime.status === "reconnecting" ? "blue" : "slate"}
          />
        </View>

        {hasDepositOverride ? (
          <View
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#fde68a",
              backgroundColor: "#fff8db",
              paddingHorizontal: 14,
              paddingVertical: 12,
              gap: 4,
            }}
          >
            <Text selectable style={{ color: "#92400e", fontSize: 12, fontWeight: "800" }}>
              Tanpa DP aktif
            </Text>
            <Text selectable style={{ color: "#78350f", fontSize: 13, lineHeight: 19 }}>
              Booking ini boleh jalan tanpa DP. Pelunasan nanti memakai total
              penuh.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <View
            style={{
              borderRadius: 20,
              backgroundColor: nextActionMeta.bg,
              paddingHorizontal: 15,
              paddingVertical: 15,
              gap: 5,
            }}
          >
            <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900", lineHeight: 22 }}>
              {nextActionMeta.title}
            </Text>
            <Text selectable style={{ color: "#475569", fontSize: 13, lineHeight: 19 }}>
              {nextActionMeta.description}
            </Text>
          </View>
        </View>

        <StepSwitch
          activeStep={activeStep}
          showPayment={Boolean(requiredPaymentScope || hasPendingManualVerification)}
          onChange={setActiveStep}
        />

        {activeStep === "action" ? (
          <View style={{ gap: 12 }}>
            {primaryAction ? (
              <FeaturedActionPanel
                title={primaryAction.title}
                description={primaryAction.description}
                label={primaryAction.label}
                onPress={primaryAction.onPress}
                disabled={Boolean(actionLoading)}
                icon={primaryAction.icon}
                tone={primaryAction.tone}
                badge={primaryAction.badge}
              />
            ) : (
              <MutedActionState
                title="Tidak ada transisi utama"
                description="Pakai aksi pendukung bila perlu."
              />
            )}

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {canAddFnb ? (
                  <CompactActionCard
                    title="Tambah F&B"
                    label="Pilih"
                    onPress={() => openCatalog("fnb")}
                    disabled={Boolean(actionLoading)}
                    tone="secondary"
                    icon="silverware-fork-knife"
                    badge={String(fnbItems.length || 0)}
                  />
                ) : null}
                {canAddAddon ? (
                  <CompactActionCard
                    title="Tambah add-on"
                    label="Pilih"
                    onPress={() => openCatalog("addon")}
                    disabled={Boolean(actionLoading)}
                    tone="secondary"
                    icon="shape-plus-outline"
                    badge={String(resourceAddons.length || 0)}
                  />
                ) : null}
                {canExtend ? (
                  <CompactActionCard
                    title="Extend 1 sesi"
                    label={actionLoading === "extend-session" ? "Memproses..." : "Extend"}
                    onPress={() =>
                      confirmAction(
                        "Extend sesi",
                        "Tambah durasi 1 sesi untuk booking ini?",
                        () => void extendOneSession(),
                      )
                    }
                    disabled={Boolean(actionLoading)}
                    tone="secondary"
                    icon="timer"
                    badge="+1"
                  />
                ) : null}
                {canSendReceipt ? (
                  <CompactActionCard
                    title="Kirim nota"
                    label={actionLoading === "receipt-send" ? "Memproses..." : "Kirim"}
                    onPress={() =>
                      confirmAction(
                        "Kirim nota",
                        "Kirim receipt booking ke WhatsApp customer?",
                        () => void sendReceipt(),
                      )
                    }
                    disabled={Boolean(actionLoading)}
                    tone="secondary"
                    icon="receipt-text-outline"
                    badge="Done"
                  />
                ) : null}
                {booking.customer_id ? (
                  <CompactActionCard
                    title="Profil customer"
                    label="Buka profil"
                    onPress={() =>
                      router.push({
                        pathname: "/admin/customers/[id]",
                        params: { id: String(booking.customer_id || "") },
                      })
                    }
                    tone="secondary"
                    icon="account-outline"
                    badge="CRM"
                  />
                ) : null}
                {canCancel ? (
                  <CompactActionCard
                    title="Batalkan booking"
                    label={actionLoading === "status:cancelled" ? "Memproses..." : "Batalkan"}
                    onPress={() =>
                      confirmAction(
                        "Batalkan booking",
                        "Booking akan dibatalkan. Lanjutkan?",
                        () => void updateStatus("cancelled"),
                        { confirmLabel: "Batalkan", tone: "danger" },
                      )
                    }
                    disabled={Boolean(actionLoading)}
                    tone="danger"
                    icon="close-octagon-outline"
                    badge="Stop"
                  />
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {activeStep === "payment" &&
        (requiredPaymentScope ||
          canRecordDeposit ||
          canOverrideDeposit ||
          canSettleCash ||
          hasPendingManualVerification) ? (
          <View style={{ gap: 12 }}>
            {pendingManualAttempts.length ? (
              <View style={{ gap: 8 }}>
                {pendingManualAttempts.map((attempt) => (
                  <View
                    key={`pending-${attempt.id}`}
                    style={{
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: "#fcd34d",
                      backgroundColor: "#fffbeb",
                      paddingHorizontal: 15,
                      paddingVertical: 15,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                          {attempt.method_label || "Manual payment"}
                        </Text>
                        <Text selectable style={{ color: "#92400e", fontSize: 12 }}>
                          {attempt.payment_scope === "settlement" ? "Pelunasan" : "DP"} | {formatAmount(attempt.amount)}
                        </Text>
                      </View>
                      <StatusChip label="Review" tone="amber" compact />
                    </View>
                    {attempt.payer_note ? (
                      <Text selectable style={{ color: "#92400e", fontSize: 12, lineHeight: 18 }}>
                        {attempt.payer_note}
                      </Text>
                    ) : null}
                    {attempt.proof_url ? (
                      <Pressable
                        onPress={() => {
                          void WebBrowser.openBrowserAsync(attempt.proof_url || "");
                        }}
                        style={{ alignSelf: "flex-start", paddingVertical: 2 }}
                      >
                        <Text selectable style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "800" }}>
                          Buka bukti bayar
                        </Text>
                      </Pressable>
                    ) : null}
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <CtaButton
                        label={attemptLoading === attempt.id ? "Memproses..." : "Verifikasi"}
                        onPress={() =>
                          confirmAction(
                            "Verifikasi pembayaran",
                            "Setujui pembayaran manual ini?",
                            () => void verifyAttempt(attempt.id, true),
                          )
                        }
                        disabled={Boolean(attemptLoading)}
                      />
                      <CtaButton
                        tone="secondary"
                        label={attemptLoading === attempt.id ? "Memproses..." : "Tolak"}
                        onPress={() =>
                          confirmAction(
                            "Tolak pembayaran",
                            "Tolak pembayaran manual ini?",
                            () => void verifyAttempt(attempt.id, false),
                            { confirmLabel: "Tolak", tone: "danger" },
                          )
                        }
                        disabled={Boolean(attemptLoading)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {requiredPaymentScope ? (
              <FeaturedPaymentPanel
                title={
                  requiredPaymentScope === "deposit"
                    ? "Step 2 · Putuskan DP"
                    : "Step 2 · Selesaikan pelunasan"
                }
                description={
                  requiredPaymentScope === "deposit"
                    ? "Pilih metode yang paling cepat agar booking bisa lanjut."
                    : "Sisa tagihan bisa diselesaikan langsung dari mobile."
                }
              >
                {paymentMethods.length ? (
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                      {paymentMethods.map((method) => {
                        const active = selectedMethodDetail?.code === method.code;
                        return (
                          <Pressable
                            key={method.code}
                            onPress={() => setSelectedMethod(String(method.code || ""))}
                            style={{
                              width: "48.5%",
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: active ? "#2563eb" : "#e2e8f0",
                              backgroundColor: active ? "#eff6ff" : "#ffffff",
                              paddingHorizontal: 12,
                              paddingVertical: 12,
                              gap: 8,
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                              <View
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 12,
                                  backgroundColor: active ? "#dbeafe" : "#f8fafc",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <MaterialCommunityIcons
                                  name={paymentMethodIcon(method.code)}
                                  size={18}
                                  color={active ? "#2563eb" : "#64748b"}
                                />
                              </View>
                              <StatusChip
                                label={labelVerificationType(method.verification_type)}
                                tone={active ? "blue" : "slate"}
                                compact
                              />
                            </View>
                            <View style={{ gap: 2 }}>
                              <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                                {method.display_name || method.code || "Metode pembayaran"}
                              </Text>
                              <Text selectable style={{ color: "#64748b", fontSize: 11, lineHeight: 16 }}>
                                {compactMethodDescription(method)}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                    Tenant ini belum punya metode pembayaran aktif.
                  </Text>
                )}

                {selectedMethodDetail ? (
                  <CtaButton
                    label={
                      actionLoading ===
                      `payment:${requiredPaymentScope}:${selectedMethodDetail.code || ""}`
                        ? "Memproses..."
                        : buildPaymentButtonLabel(
                            requiredPaymentScope,
                            selectedMethodDetail,
                          )
                    }
                    onPress={() =>
                      confirmAction(
                        "Jalankan pembayaran",
                        buildPaymentConfirmMessage(
                          requiredPaymentScope,
                          selectedMethodDetail,
                        ),
                        () => void processPaymentMethod(),
                      )
                    }
                    disabled={Boolean(actionLoading) || !canCreateManualPayment}
                  />
                ) : null}
              </FeaturedPaymentPanel>
            ) : null}

            {!requiredPaymentScope && !pendingManualAttempts.length ? (
              <MutedActionState
                title="Tidak ada pembayaran yang mendesak"
                description="Gunakan aksi pendukung bila masih perlu."
              />
            ) : null}

            {(canOverrideDeposit ||
              (canRecordDeposit && requiredPaymentScope !== "deposit") ||
              (canSettleCash && requiredPaymentScope !== "settlement")) ? (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {canRecordDeposit && requiredPaymentScope !== "deposit" ? (
                    <CompactActionCard
                      title="Catat DP"
                      label={actionLoading === "record-deposit" ? "Memproses..." : "Catat DP"}
                      onPress={() =>
                        confirmAction(
                          "Catat DP",
                          "DP booking ini sudah benar-benar diterima?",
                          () => void recordDeposit(),
                        )
                      }
                      disabled={Boolean(actionLoading)}
                      icon="cash-plus"
                      badge="Cash"
                    />
                  ) : null}
                  {canOverrideDeposit ? (
                    <CompactActionCard
                      title="Tanpa DP"
                      label={actionLoading === "override-deposit" ? "Memproses..." : "Tanpa DP"}
                      onPress={() =>
                      confirmAction(
                        "Override DP",
                        "Booking ini akan jalan tanpa DP. Lanjutkan?",
                        () => void overrideDeposit(),
                        { confirmLabel: "Aktifkan", tone: "danger" },
                      )
                    }
                      disabled={Boolean(actionLoading)}
                      tone="secondary"
                      icon="flash-outline"
                      badge="Bypass"
                    />
                  ) : null}
                  {canSettleCash && requiredPaymentScope !== "settlement" ? (
                    <CompactActionCard
                      title="Lunasi cash"
                      label={actionLoading === "settle-cash" ? "Memproses..." : "Lunasi"}
                      onPress={() =>
                        confirmAction(
                          "Lunasi cash",
                          "Tagihan sisa akan langsung dicatat lunas cash.",
                          () => void settleCash(),
                        )
                      }
                      disabled={Boolean(actionLoading)}
                      icon="wallet-outline"
                      badge="Cash"
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </CardBlock>

      <SubduedSection title="Ringkasan">
        <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
          Snapshot booking
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", padding: 12, gap: 4 }}>
            <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              MULAI
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
              {formatDateTime(booking.start_time)}
            </Text>
          </View>
          <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", padding: 12, gap: 4 }}>
            <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              SELESAI
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
              {formatDateTime(booking.end_time)}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { label: "Total", value: formatAmount(getAdminBookingTotal(booking)) },
            { label: "Dibayar", value: formatAmount(booking.paid_amount) },
            { label: "Sisa", value: formatAmount(booking.balance_due) },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", padding: 12, gap: 4 }}>
              <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                {item.label.toUpperCase()}
              </Text>
              <Text selectable style={{ color: item.label === "Sisa" ? "#1d4ed8" : "#0f172a", fontSize: 16, fontWeight: "900" }}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </SubduedSection>

      {mainOptions.length ? (
        <SubduedSection title="Layanan utama">
          <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
            Layanan utama
          </Text>
          {mainOptions.map((item, index) => (
            <View key={`${item.item_name || "main"}-${index}`} style={{ borderRadius: 18, backgroundColor: "#f8fafc", padding: 14, gap: 4 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                {item.item_name || "Paket booking"}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                {Number(item.quantity || 0)} item
              </Text>
              <Text selectable style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "800" }}>
                {formatAmount(
                  Number(item.price_at_booking || item.unit_price || 0) *
                    Number(item.quantity || 0),
                )}
              </Text>
            </View>
          ))}
        </SubduedSection>
      ) : null}

      {enableAddons && addonOptions.length ? (
        <SubduedSection title="Add-on">
          <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
            Add-on booking
          </Text>
          {addonOptions.map((item, index) => (
            <View key={`${item.item_name || "addon"}-${index}`} style={{ borderRadius: 18, backgroundColor: "#f8fafc", padding: 14, gap: 4 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                {item.item_name || "Add-on"}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                {Number(item.quantity || 0)} item
              </Text>
              <Text selectable style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "800" }}>
                {formatAmount(
                  Number(item.price_at_booking || item.unit_price || 0) *
                    Number(item.quantity || 0),
                )}
              </Text>
            </View>
          ))}
        </SubduedSection>
      ) : null}

      {enableFnb && groupedOrders.length ? (
        <SubduedSection title="F&B">
          <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
            Pesanan F&B
          </Text>
          {groupedOrders.map((item, index) => (
            <View key={`${item.item_name || "order"}-${index}`} style={{ borderRadius: 18, backgroundColor: "#f8fafc", padding: 14, gap: 4 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                {item.item_name || "Pesanan"}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                {Number(item.quantity || 0)} item
              </Text>
              <Text selectable style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "800" }}>
                {formatAmount(item.subtotal)}
              </Text>
            </View>
          ))}
        </SubduedSection>
      ) : null}

      {booking.payment_attempts?.length ? (
        <SubduedSection title="Review queue">
          <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
            Attempt pembayaran
          </Text>
          {booking.payment_attempts.map((attempt) => (
            <View key={attempt.id} style={{ borderRadius: 18, borderWidth: 1, borderColor: "#edf2f7", backgroundColor: "#fbfdff", padding: 14, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800", flex: 1 }}>
                  {attempt.method_label || "Metode pembayaran"}
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 12, fontWeight: "800" }}>
                  {attempt.status || "-"}
                </Text>
              </View>
              <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                {attempt.payment_scope || "booking"} / {attempt.reference_code || "-"}
              </Text>
              <Text selectable style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "800" }}>
                {formatAmount(attempt.amount)}
              </Text>
              {attempt.payer_note ? (
                <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
                  {attempt.payer_note}
                </Text>
              ) : null}
              {attempt.proof_url ? (
                <CtaButton
                  tone="secondary"
                  label="Lihat bukti bayar"
                  onPress={() => {
                    void WebBrowser.openBrowserAsync(attempt.proof_url || "");
                  }}
                />
              ) : null}
              {["submitted", "awaiting_verification"].includes(
                String(attempt.status || "").toLowerCase(),
              ) ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <CtaButton
                    label={attemptLoading === attempt.id ? "Memproses..." : "Verifikasi"}
                    onPress={() =>
                      confirmAction(
                        "Verifikasi pembayaran",
                        "Setujui pembayaran manual ini?",
                        () => void verifyAttempt(attempt.id, true),
                      )
                    }
                    disabled={Boolean(attemptLoading)}
                  />
                  <CtaButton
                    tone="secondary"
                    label={attemptLoading === attempt.id ? "Memproses..." : "Tolak"}
                    onPress={() =>
                      confirmAction(
                        "Tolak pembayaran",
                        "Tolak pembayaran manual ini?",
                        () => void verifyAttempt(attempt.id, false),
                      )
                    }
                    disabled={Boolean(attemptLoading)}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </SubduedSection>
      ) : null}

      <SubduedSection title="Timeline">
        <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
          Riwayat booking
        </Text>
        {(booking.events || []).length ? (
          booking.events?.map((event) => (
            <View key={event.id} style={{ borderRadius: 18, borderWidth: 1, borderColor: "#edf2f7", backgroundColor: "#fbfdff", padding: 14, gap: 6 }}>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                  <MaterialCommunityIcons name="history" size={16} color="#2563eb" />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                    {event.title || event.event_type || "Aktivitas booking"}
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                    {event.description || event.event_type || "Perubahan status tercatat."}
                  </Text>
                  <Text selectable style={{ color: "#94a3b8", fontSize: 12 }}>
                    {actorLabel(event)} / {formatDateTime(event.created_at)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
            Timeline belum tersedia untuk booking ini.
          </Text>
        )}
      </SubduedSection>

      {catalogOpen ? (
        <BottomSheetModal
          ref={catalogSheetRef}
          snapPoints={catalogSnapPoints}
          enableDynamicSizing={false}
          backdropComponent={renderCatalogBackdrop}
          enablePanDownToClose
          onDismiss={closeCatalog}
          footerComponent={renderCatalogFooter}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 44 }}
          backgroundStyle={{ backgroundColor: "#ffffff", borderRadius: 28 }}
        >
          <BottomSheetView
            style={{
              flex: 1,
              paddingHorizontal: 18,
              paddingTop: 8,
              paddingBottom: 8,
              gap: 14,
            }}
          >
            <View style={{ gap: 4 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 22, fontWeight: "900" }}>
                {catalogStage === "pick" ? activeCatalogTitle : activeCatalogConfirmTitle}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
                {catalogStage === "pick"
                  ? catalogOpen === "fnb"
                    ? "Pilih item untuk sesi aktif."
                    : "Pilih add-on untuk booking ini."
                  : activeCatalogConfirmDescription}
              </Text>
            </View>

            {catalogStage === "pick" ? (
              <BottomSheetTextInput
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                placeholder={catalogOpen === "fnb" ? "Cari menu..." : "Cari add-on..."}
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
            ) : null}

            <BottomSheetScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                gap: 10,
                paddingBottom: 124 + Math.max(insets.bottom, 6),
              }}
            >
              {catalogStage === "confirm" ? (
                activeCartLines.length ? (
                  activeCartLines.map((item) => (
                    <View
                      key={`confirm-inline-${item.id}`}
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: "#dbe7ff",
                        backgroundColor: "#f8fbff",
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      {item.imageUrl ? (
                        <Image
                          source={item.imageUrl}
                          contentFit="cover"
                          style={{
                            width: 54,
                            height: 54,
                            borderRadius: 14,
                            backgroundColor: "#eef2f7",
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 54,
                            height: 54,
                            borderRadius: 14,
                            backgroundColor:
                              catalogOpen === "fnb" ? "#fff7ed" : "#ecfdf5",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MaterialCommunityIcons
                            name={
                              catalogOpen === "fnb"
                                ? "silverware-fork-knife"
                                : "shape-plus-outline"
                            }
                            size={20}
                            color={catalogOpen === "fnb" ? "#d97706" : "#059669"}
                          />
                        </View>
                      )}

                      <View style={{ flex: 1, gap: 3 }}>
                        <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                          {item.name} x{item.quantity}
                        </Text>
                        <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                          {item.category || (catalogOpen === "fnb" ? "F&B" : "Add-on")}
                        </Text>
                      </View>

                      <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "900" }}>
                        {formatAmount(item.unitPrice * item.quantity)}
                      </Text>
                    </View>
                  ))
                ) : (
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
                      Belum ada item
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
                      Balik ke edit untuk pilih item dulu.
                    </Text>
                  </View>
                )
              ) : (catalogOpen === "fnb" ? filteredFnbItems : filteredAddonItems).map((item) => {
                const quantity =
                  (catalogOpen === "fnb" ? menuCart : addonCart)[String(item.id || "")] || 0;
                const imageUrl = "image_url" in item ? item.image_url : null;
                const price = Number(
                  ("price" in item ? item.price : 0) ||
                    ("unit_price" in item ? item.unit_price : 0),
                );

                return (
                  <View
                    key={item.id}
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
                      opacity: Boolean(actionLoading) ? 0.65 : 1,
                    }}
                  >
                    {imageUrl ? (
                      <Image
                        source={imageUrl}
                        contentFit="cover"
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 14,
                          backgroundColor: "#eef2f7",
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 14,
                          backgroundColor:
                            catalogOpen === "fnb" ? "#fff7ed" : "#ecfdf5",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialCommunityIcons
                          name={
                            catalogOpen === "fnb"
                              ? "silverware-fork-knife"
                              : "shape-plus-outline"
                          }
                          size={20}
                          color={catalogOpen === "fnb" ? "#d97706" : "#059669"}
                        />
                      </View>
                    )}

                    <View style={{ flex: 1, gap: 3 }}>
                      <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                        {item.name || "Item"}
                      </Text>
                      <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                        {catalogOpen === "fnb"
                          ? [("category" in item ? item.category : ""), formatAmount(price)]
                              .filter(Boolean)
                              .join(" / ")
                          : formatAmount(price)}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <MiniQtyButton
                        label="-"
                        onPress={() =>
                          changeCartQuantity(
                            catalogOpen,
                            String(item.id || ""),
                            Math.max(quantity - 1, 0),
                          )
                        }
                      />
                      <Text selectable style={{ minWidth: 18, textAlign: "center", color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                        {quantity}
                      </Text>
                      <MiniQtyButton
                        label="+"
                        onPress={() =>
                          changeCartQuantity(
                            catalogOpen,
                            String(item.id || ""),
                            quantity + 1,
                          )
                        }
                      />
                    </View>
                  </View>
                );
              })}

              {catalogStage === "pick" &&
              (catalogOpen === "fnb" ? filteredFnbItems : filteredAddonItems).length === 0 ? (
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
                    Tidak ada item
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
                    Ubah pencarian atau tutup sheet ini.
                  </Text>
                </View>
              ) : null}
            </BottomSheetScrollView>
          </BottomSheetView>
        </BottomSheetModal>
      ) : null}

      <ConfirmModal
        open={Boolean(confirmSheet)}
        title={confirmSheet?.title || ""}
        message={confirmSheet?.message}
        confirmLabel={confirmSheet?.confirmLabel || "Lanjut"}
        tone={confirmSheet?.tone === "danger" ? "danger" : "primary"}
        busy={Boolean(actionLoading || attemptLoading)}
        onCancel={closeConfirmSheet}
        onConfirm={submitConfirmedAction}
      >
        {confirmSheet?.cartLines?.length ? (
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#dbe7ff",
              backgroundColor: "#f8fbff",
              paddingHorizontal: 14,
              paddingVertical: 14,
              gap: 10,
            }}
          >
            {(confirmSheet.cartLines || []).map((item) => (
              <View
                key={`confirm-${item.id}`}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                    {item.name} x{item.quantity}
                  </Text>
                  <Text selectable style={{ color: "#94a3b8", fontSize: 11, fontWeight: "700" }}>
                    {item.category || "Item"}
                  </Text>
                </View>
                <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "900" }}>
                  {formatAmount(item.unitPrice * item.quantity)}
                </Text>
              </View>
            ))}

            <View
              style={{
                marginTop: 2,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: "#dbe7ff",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text selectable style={{ color: "#64748b", fontSize: 12, fontWeight: "800" }}>
                {confirmSheet.cartCount || 0} item
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "900" }}>
                {formatAmount(confirmSheet.cartTotal)}
              </Text>
            </View>
          </View>
        ) : null}
      </ConfirmModal>
    </ScreenShell>
  );
}

function FeaturedActionPanel({
  title,
  description,
  label,
  onPress,
  disabled,
  icon,
  tone = "primary",
  badge,
}: {
  title: string;
  description: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  tone?: ActionTone;
  badge?: string;
}) {
  const palette =
    tone === "success"
      ? {
          border: "#ccefd9",
          bg: "#eefbf3",
          iconBg: "#ddf7e6",
          iconColor: "#059669",
        }
      : tone === "dark"
        ? {
            border: "#d8e1ee",
            bg: "#f7f9fd",
            iconBg: "#e8edf5",
            iconColor: "#0f172a",
          }
        : tone === "danger"
          ? {
              border: "#f9cfd2",
              bg: "#fff5f5",
              iconBg: "#ffe5e5",
              iconColor: "#dc2626",
            }
          : {
              border: "#dbe7ff",
              bg: "#f6f9ff",
              iconBg: "#e7efff",
              iconColor: "#2563eb",
            };

  return (
    <View
      style={{
        borderRadius: 24,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 14,
        shadowColor: "#0f172a",
        shadowOpacity: 0.04,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 16,
              backgroundColor: palette.iconBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name={icon} size={20} color={palette.iconColor} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
              {title}
            </Text>
            <Text selectable style={{ color: "#526173", fontSize: 13, lineHeight: 19 }}>
              {description}
            </Text>
          </View>
        </View>
        {badge ? (
          <StatusChip
            label={badge}
            tone={tone === "success" ? "success" : tone === "dark" ? "slate" : "blue"}
            compact
          />
        ) : null}
      </View>

      <CtaButton
        label={label}
        onPress={onPress}
        disabled={disabled}
        tone={tone === "danger" ? "secondary" : "primary"}
      />
    </View>
  );
}

function FeaturedPaymentPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#dbe7ff",
        backgroundColor: "#f8fbff",
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 14,
      }}
    >
      <View style={{ gap: 5 }}>
        <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
          {title}
        </Text>
        <Text selectable style={{ color: "#526173", fontSize: 13, lineHeight: 19 }}>
          {description}
        </Text>
      </View>
      {children}
    </View>
  );
}

function MutedActionState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#e7edf4",
        backgroundColor: "#fbfdff",
        paddingHorizontal: 16,
        paddingVertical: 15,
        gap: 5,
      }}
    >
      <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
        {title}
      </Text>
      <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
        {description}
      </Text>
    </View>
  );
}

function StepSwitch({
  activeStep,
  showPayment,
  onChange,
}: {
  activeStep: "action" | "payment";
  showPayment: boolean;
  onChange: (step: "action" | "payment") => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        borderRadius: 18,
        backgroundColor: "#f8fafc",
        padding: 4,
      }}
    >
      <Pressable
        onPress={() => onChange("action")}
        style={{
          flex: 1,
          borderRadius: 14,
          backgroundColor: activeStep === "action" ? "#ffffff" : "transparent",
          paddingVertical: 10,
          paddingHorizontal: 12,
          shadowColor: activeStep === "action" ? "#0f172a" : "transparent",
          shadowOpacity: activeStep === "action" ? 0.05 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: activeStep === "action" ? 1 : 0,
        }}
      >
        <Text
          selectable
          style={{
            color: activeStep === "action" ? "#0f172a" : "#94a3b8",
            fontSize: 13,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          Aksi
        </Text>
      </Pressable>
      {showPayment ? (
        <Pressable
          onPress={() => onChange("payment")}
          style={{
            flex: 1,
            borderRadius: 14,
            backgroundColor: activeStep === "payment" ? "#ffffff" : "transparent",
            paddingVertical: 10,
            paddingHorizontal: 12,
            shadowColor: activeStep === "payment" ? "#0f172a" : "transparent",
            shadowOpacity: activeStep === "payment" ? 0.05 : 0,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: activeStep === "payment" ? 1 : 0,
          }}
        >
          <Text
            selectable
            style={{
              color: activeStep === "payment" ? "#0f172a" : "#94a3b8",
              fontSize: 13,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Bayar
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MiniQtyButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 28,
        height: 28,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#dbe2ea",
        backgroundColor: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function CompactActionCard({
  title,
  label,
  onPress,
  disabled,
  tone = "primary",
  icon,
  badge,
}: {
  title: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: ActionTone;
  icon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
  badge?: string;
}) {
  const isSecondary = tone === "secondary";
  const isDanger = tone === "danger";
  const isSuccess = tone === "success";
  const isDark = tone === "dark";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        width: "48.5%",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: isDanger
          ? "#fbc9cf"
          : isSuccess
            ? "#cdebd6"
            : isDark
              ? "#d7dfeb"
              : "#e3e8f1",
        backgroundColor: isDanger
          ? "#fff5f5"
          : isSuccess
            ? "#f4fbf6"
            : isDark
              ? "#f7f9fc"
              : "#ffffff",
        paddingHorizontal: 15,
        paddingVertical: 15,
        gap: 12,
        shadowColor: "#0f172a",
        shadowOpacity: 0.03,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1,
        opacity: disabled ? 0.55 : 1,
        minHeight: 156,
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            backgroundColor: isDanger
              ? "#ffe3e3"
              : isSuccess
                ? "#def7e5"
                : isDark
                  ? "#e8edf5"
                  : "#e9f1ff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name={icon || "lightning-bolt-outline"}
            size={18}
            color={
              isDanger
                ? "#dc2626"
                : isSuccess
                  ? "#16a34a"
                  : isDark
                    ? "#0f172a"
                    : "#2563eb"
            }
          />
        </View>
        {badge ? (
          <StatusChip
            label={badge}
            tone={
              isDanger ? "danger" : isSuccess ? "success" : isDark ? "slate" : "blue"
            }
            compact
          />
        ) : null}
      </View>
      <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800", lineHeight: 19, minHeight: 38 }}>
        {title}
      </Text>
      <Text selectable style={{ color: isDanger ? "#dc2626" : "#64748b", fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatusChip({
  label,
  tone,
  compact = false,
}: {
  label: string;
  tone: ChipTone;
  compact?: boolean;
}) {
  const colors = {
    blue: { bg: "#dbeafe", text: "#1d4ed8" },
    success: { bg: "#dcfce7", text: "#15803d" },
    amber: { bg: "#fef3c7", text: "#b45309" },
    danger: { bg: "#fee2e2", text: "#dc2626" },
    slate: { bg: "#e2e8f0", text: "#475569" },
  }[tone];

  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.bg,
        backgroundColor: "#ffffff",
        paddingHorizontal: compact ? 8 : 10,
        paddingVertical: compact ? 4 : 6,
      }}
    >
      <Text selectable style={{ color: colors.text, fontSize: compact ? 10 : 11, fontWeight: "800" }}>
        {label}
      </Text>
    </View>
  );
}

function paymentMethodIcon(
  code?: string,
): keyof typeof MaterialCommunityIcons.glyphMap {
  const normalized = String(code || "").toLowerCase();
  if (normalized === "cash") return "cash-fast";
  if (normalized === "bank_transfer") return "bank-transfer";
  if (normalized === "qris_static") return "qrcode-scan";
  return "credit-card-outline";
}

function compactMethodDescription(method: BookingPaymentMethod) {
  const code = String(method.code || "").toLowerCase();
  if (code === "cash") return "Catat tunai";
  if (code === "bank_transfer") return "Transfer manual";
  if (code === "qris_static") return "QRIS manual";
  return "Checkout gateway";
}

function SubduedSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#e8edf3",
        backgroundColor: "#fcfdff",
        padding: 16,
        gap: 12,
        opacity: 0.94,
      }}
    >
      <Text selectable style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function labelVerificationType(value?: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "auto") return "Gateway";
  if (normalized === "manual") return "Manual";
  return "Metode";
}

function buildPaymentButtonLabel(
  scope: "deposit" | "settlement",
  method: BookingPaymentMethod,
) {
  const code = String(method.code || "").toLowerCase();
  if (code === "cash" && scope === "deposit") return "Catat DP cash";
  if (code === "cash" && scope === "settlement") return "Lunasi cash";
  if (String(method.verification_type || "").toLowerCase() === "auto") {
    return scope === "deposit" ? "Checkout DP" : "Checkout pelunasan";
  }
  return scope === "deposit"
    ? "Buat transaksi DP"
    : "Buat transaksi pelunasan";
}

function buildPaymentConfirmMessage(
  scope: "deposit" | "settlement",
  method: BookingPaymentMethod,
) {
  const methodName = method.display_name || method.code || "metode ini";
  if (String(method.verification_type || "").toLowerCase() === "auto") {
    return scope === "deposit"
      ? `Checkout DP akan dibuka dengan ${methodName}.`
      : `Checkout pelunasan akan dibuka dengan ${methodName}.`;
  }
  return scope === "deposit"
    ? `Buat transaksi manual DP dengan ${methodName}?`
    : `Buat transaksi manual pelunasan dengan ${methodName}?`;
}

function bookingStatusTone(status: string): ChipTone {
  if (status === "active") return "success";
  if (status === "completed") return "slate";
  if (status === "confirmed") return "blue";
  if (status === "cancelled") return "danger";
  return "amber";
}

function paymentStatusTone(
  paymentStatus: string,
  balanceDue: number,
  hasDepositOverride: boolean,
): ChipTone {
  if (paymentStatus === "settled" || (paymentStatus === "paid" && balanceDue === 0)) {
    return "success";
  }
  if (paymentStatus === "partial_paid" || paymentStatus === "paid") {
    return "blue";
  }
  if (paymentStatus === "awaiting_verification" || hasDepositOverride) {
    return "amber";
  }
  if (paymentStatus === "expired" || paymentStatus === "failed") {
    return "danger";
  }
  return "slate";
}

function paymentStatusLabel(
  paymentStatus: string,
  balanceDue: number,
  hasDepositOverride: boolean,
) {
  if (paymentStatus === "settled" || (paymentStatus === "paid" && balanceDue === 0)) {
    return "Lunas";
  }
  if (paymentStatus === "partial_paid" || paymentStatus === "paid") {
    return "DP masuk";
  }
  if (paymentStatus === "awaiting_verification") return "Menunggu verifikasi";
  if (paymentStatus === "expired") return "Kadaluarsa";
  if (paymentStatus === "failed") return "Gagal";
  if (hasDepositOverride) return "Tanpa DP";
  return "Menunggu bayar";
}

function resolveNextAction({
  status,
  paymentStatus,
  balanceDue,
  depositAmount,
  hasPendingManualVerification,
  hasPaidDp,
  hasDepositOverride,
}: {
  status: string;
  paymentStatus: string;
  balanceDue: number;
  depositAmount: number;
  hasPendingManualVerification: boolean;
  hasPaidDp: boolean;
  hasDepositOverride: boolean;
}) {
  if (hasPendingManualVerification) {
    return {
      title: "Review pembayaran manual",
      description: "Ada payment yang menunggu keputusan.",
      bg: "#fff7ed",
      tone: "#b45309",
    };
  }
  if (
    (status === "pending" || status === "confirmed") &&
    depositAmount > 0 &&
    !hasPaidDp &&
    !hasDepositOverride
  ) {
    return {
      title: "Putuskan DP booking",
      description: "Catat DP, buat transaksi, atau jalan tanpa DP.",
      bg: "#eff6ff",
      tone: "#2563eb",
    };
  }
  if (status === "pending") {
    return {
      title: "Konfirmasi booking",
      description: "Booking masih pending.",
      bg: "#f8fafc",
      tone: "#475569",
    };
  }
  if (status === "confirmed") {
    return {
      title: "Mulai sesi saat customer datang",
      description: "Booking sudah siap mulai.",
      bg: "#ecfdf5",
      tone: "#059669",
    };
  }
  if (status === "active") {
    return {
      title: "Monitor sesi aktif",
      description: "Extend bila perlu, lalu akhiri saat selesai.",
      bg: "#ecfdf5",
      tone: "#059669",
    };
  }
  if (status === "completed" && balanceDue > 0 && paymentStatus !== "settled") {
    return {
      title: "Selesaikan pelunasan",
      description: "Masih ada sisa tagihan.",
      bg: "#fff7ed",
      tone: "#b45309",
    };
  }
  return {
    title: "Booking beres",
    description: "Tinggal monitor atau kirim nota.",
    bg: "#f8fafc",
    tone: "#475569",
  };
}
