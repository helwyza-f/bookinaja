import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";
import { appToast } from "@/lib/toast";
import { useAppTheme } from "@/theme";
import { useCustomerBookingDetailQuery } from "@/features/customer/queries";
import { useCustomerBookingRealtime } from "@/features/customer/realtime";
import {
  useActivateBookingMutation,
  useAddBookingAddonMutation,
  useAddBookingOrderMutation,
  useCompleteBookingMutation,
  useCustomerFnbMenuQuery,
  useCustomerLiveContextQuery,
  useExtendBookingMutation,
} from "@/features/customer/payment";
import {
  getPaymentStatusMeta,
  getSessionStatusMeta,
  resolvePaymentStatusCode,
} from "@/features/customer/status";

type ActionSheetKind = "extend" | "fnb" | "addon" | null;
type ConfirmActionKind = "activate" | "complete" | null;

function formatMoney(value?: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeRange(start?: string, end?: string | null) {
  if (!start) return "-";
  const formatter = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const startLabel = formatter.format(new Date(start));
  if (!end) return startLabel;
  return `${startLabel} - ${formatter.format(new Date(end))}`;
}

function getUnitLabel(unitDuration?: number) {
  return Number(unitDuration || 60) === 60 ? "jam" : "sesi";
}

function resolvePaymentLabel(paymentStatus: string, balanceDue: number, paidAmount?: number, grandTotal?: number) {
  const normalized = resolvePaymentStatusCode({
    status: paymentStatus,
    balanceDue,
    paidAmount,
    grandTotal,
  });
  if (normalized === "settled") return "Lunas";
  if (normalized === "awaiting_verification") return "Menunggu Verifikasi";
  if (normalized === "partial_paid") return "DP Masuk";
  if (normalized === "pending") return "Menunggu Pembayaran";
  if (normalized === "expired") return "Kadaluarsa";
  if (normalized === "failed") return "Gagal";
  return "Menunggu Pembayaran";
}

function resolvePaymentNotice(notice?: string) {
  if (notice === "settlement_locked") {
    return "Pelunasan tersedia setelah sesi selesai.";
  }
  if (notice === "no_balance_due") {
    return "Tidak ada sisa tagihan.";
  }
  if (notice === "deposit_not_required") {
    return "Booking ini tidak butuh DP.";
  }
  if (notice === "deposit_unavailable") {
    return "DP sudah tidak tersedia.";
  }
  if (notice === "deposit_methods_unavailable") {
    return "Metode DP belum tersedia.";
  }
  if (notice === "settlement_methods_unavailable") {
    return "Metode pelunasan belum tersedia.";
  }
  return null;
}

export default function CustomerLiveScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ id: string; notice?: string }>();
  const bookingId = String(params.id || "");
  const detail = useCustomerBookingDetailQuery(bookingId);
  const detailBooking = detail.data;
  const realtime = useCustomerBookingRealtime({
    bookingId,
    enabled: Boolean(bookingId),
    showToasts: true,
    onReconnect: () => {
      void detail.refetch();
      if (shouldFetchLiveContext) {
        void liveContext.refetch();
      }
    },
  });
  const shouldFetchLiveContext =
    Boolean(bookingId) &&
    Boolean(detailBooking?.tenant_slug) &&
    ["active", "ongoing"].includes(String(detailBooking?.status || "").toLowerCase());
  const liveContext = useCustomerLiveContextQuery(bookingId, shouldFetchLiveContext);
  const fnbMenu = useCustomerFnbMenuQuery(bookingId, Boolean(bookingId));
  const activate = useActivateBookingMutation(bookingId);
  const complete = useCompleteBookingMutation(bookingId);
  const extend = useExtendBookingMutation(bookingId);
  const addOrder = useAddBookingOrderMutation(bookingId);
  const addAddon = useAddBookingAddonMutation(bookingId);

  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [sheet, setSheet] = useState<ActionSheetKind>(null);
  const [selectedExtend, setSelectedExtend] = useState(1);
  const [menuSearch, setMenuSearch] = useState("");
  const [addonSearch, setAddonSearch] = useState("");
  const [menuCart, setMenuCart] = useState<Record<string, { id: string; name: string; price: number; quantity: number }>>({});
  const [addonCart, setAddonCart] = useState<Record<string, { id: string; name: string; price: number; quantity: number }>>({});
  const [confirmAction, setConfirmAction] = useState<ConfirmActionKind>(null);

  useEffect(() => {
    setPaymentNotice(resolvePaymentNotice(String(params.notice || "").trim()));
  }, [params.notice]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const booking = useMemo(() => {
    const liveBooking = liveContext.data?.booking as any;
    const detailStatus = String(detailBooking?.status || "").toLowerCase();
    const canUseLiveOverlay =
      Boolean(liveBooking) && ["active", "ongoing"].includes(detailStatus);

    if (!detailBooking) return liveBooking;
    if (!canUseLiveOverlay) return detailBooking;

    return {
      ...detailBooking,
      ...liveBooking,
    };
  }, [detailBooking, liveContext.data?.booking]);
  const paymentAttempts = booking?.payment_attempts || [];
  const paymentStatus = String(booking?.payment_status || "").toLowerCase();
  const sessionStatus = String(booking?.status || "").toLowerCase();
  const isActiveStatus = sessionStatus === "active" || sessionStatus === "ongoing";
  const depositAmount = Number(booking?.deposit_amount || 0);
  const balanceDue = Number(booking?.balance_due || 0);
  const paidAmount = Number(booking?.paid_amount || 0);
  const resolvedPaymentStatus = resolvePaymentStatusCode({
    status: booking?.payment_status,
    balanceDue,
    paidAmount,
    grandTotal: booking?.grand_total,
    depositAmount,
  });
  const paymentLabel = resolvePaymentLabel(
    paymentStatus,
    balanceDue,
    paidAmount,
    booking?.grand_total,
  );
  const paymentMeta = getPaymentStatusMeta({
    status: booking?.payment_status,
    balanceDue,
    paidAmount,
    grandTotal: booking?.grand_total,
    depositAmount,
  });
  const sessionMeta = getSessionStatusMeta(booking?.status);
  const hasPromo =
    Number(booking?.discount_amount || 0) > 0 && String(booking?.promo_code || "").trim() !== "";

  const pendingManualDpAttempt = paymentAttempts.find(
    (item: any) =>
      item?.payment_scope === "deposit" &&
      (item?.status === "submitted" || item?.status === "awaiting_verification"),
  );
  const pendingManualSettlementAttempt = paymentAttempts.find(
    (item: any) =>
      item?.payment_scope === "settlement" &&
      (item?.status === "submitted" || item?.status === "awaiting_verification"),
  );

  const countdownData = useMemo(() => {
    if (!booking) return null;
    const start = new Date(booking.start_time || booking.date);
    const end = new Date(booking.end_time || booking.end_date || booking.start_time || booking.date);

    if (isActiveStatus) {
      const diff = Math.floor((end.getTime() - now.getTime()) / 1000);
      return {
        type: "LIVE",
        label: "Sisa waktu sesi",
        h: String(Math.max(0, Math.floor(diff / 3600))).padStart(2, "0"),
        m: String(Math.max(0, Math.floor((diff % 3600) / 60))).padStart(2, "0"),
        s: String(Math.max(0, diff % 60)).padStart(2, "0"),
        isCritical: diff < 300,
      };
    }

    if (
      now < start &&
      !["completed", "cancelled", "active", "ongoing"].includes(String(booking.status || "").toLowerCase())
    ) {
      const diff = Math.floor((start.getTime() - now.getTime()) / 1000);
      return {
        type: "WAITING",
        label: "Mulai dalam",
        h: String(Math.floor(diff / 3600)).padStart(2, "0"),
        m: String(Math.floor((diff % 3600) / 60)).padStart(2, "0"),
        s: String(diff % 60).padStart(2, "0"),
        isCritical: false,
      };
    }
    return null;
  }, [booking, isActiveStatus, now]);

  const extendUnitLabel = Number(booking?.unit_duration || 60) === 60 ? "jam" : "sesi";

  const shouldShowActivation =
    !isActiveStatus && sessionStatus !== "completed" && sessionStatus !== "cancelled";
  const hasPaidDp =
    resolvedPaymentStatus === "partial_paid" ||
    resolvedPaymentStatus === "settled" ||
    depositAmount === 0;
  const isTimeReached = now >= new Date(booking?.start_time || booking?.date || Date.now());

  const paymentGuidance =
    pendingManualSettlementAttempt
      ? `Pelunasan menunggu verifikasi. Ref ${pendingManualSettlementAttempt?.reference_code || "-"}.`
      : pendingManualDpAttempt
        ? `DP menunggu verifikasi. Ref ${pendingManualDpAttempt?.reference_code || "-"}.`
        : depositAmount > 0
          ? resolvedPaymentStatus === "pending"
            ? `DP ${formatMoney(depositAmount)} belum dibayar.`
            : resolvedPaymentStatus === "settled"
              ? "Booking sudah lunas."
              : "DP sudah masuk."
          : "Tanpa DP.";

  const groupedOptions = useMemo(() => {
    if (!(booking as any)?.options?.length) return [];
    const groups = ((booking as any).options as any[]).reduce((acc: Record<string, any>, item) => {
      const itemType = String(item.item_type || "").toLowerCase();
      const key = `${String(item.item_name || "").trim().toLowerCase()}::${itemType}`;
      if (!acc[key]) {
        acc[key] = {
          ...item,
          quantity: Number(item.quantity || 0),
          totalPrice: Number(item.price_at_booking || 0),
        };
      } else {
        acc[key].quantity += Number(item.quantity || 0);
        acc[key].totalPrice += Number(item.price_at_booking || 0);
      }
      return acc;
    }, {});

    return Object.values(groups).map((item: any) => ({
      ...item,
      unitPrice:
        Number(item.unit_price || 0) ||
        Number(item.totalPrice || 0) / Math.max(Number(item.quantity || 1), 1),
    }));
  }, [booking]);

  const groupedMainOptions = useMemo(
    () =>
      groupedOptions.filter((item: any) =>
        ["main", "main_option", "console_option"].includes(
          String(item.item_type || "").toLowerCase(),
        ),
      ),
    [groupedOptions],
  );

  const groupedAddonOptions = useMemo(
    () =>
      groupedOptions.filter(
        (item: any) => String(item.item_type || "").toLowerCase() === "add_on",
      ),
    [groupedOptions],
  );

  const groupedOrders = useMemo(() => {
    if (!(booking as any)?.orders?.length) return [];
    const groups = ((booking as any).orders as any[]).reduce((acc, item) => {
      const key = String(item.item_name || item.product_name || "Pesanan").toLowerCase();
      if (!acc[key]) {
        acc[key] = {
          item_name: item.item_name || item.product_name || "Pesanan",
          quantity: 0,
          subtotal: 0,
          price_at_purchase: 0,
        };
      }
      const qty = Number(item.quantity || item.qty || 1);
      acc[key].quantity += qty;
      acc[key].subtotal += Number(item.subtotal || item.total_price || 0);
      acc[key].price_at_purchase =
        Number(item.price_at_purchase || 0) ||
        Number(acc[key].subtotal || 0) / Math.max(Number(acc[key].quantity || 1), 1);
      return acc;
    }, {} as Record<string, any>);
    return Object.values(groups);
  }, [booking]);

  const bookingItemCount =
    groupedMainOptions.length + groupedAddonOptions.length + groupedOrders.length;

  const menuItems = useMemo(
    () =>
      (fnbMenu.data || []).filter((item) =>
        `${item.name} ${item.category || ""}`.toLowerCase().includes(menuSearch.toLowerCase()),
      ),
    [fnbMenu.data, menuSearch],
  );
  const addonItems = useMemo(
    () =>
      ((booking?.resource_addons || []) as any[]).filter((item) =>
        `${item.name || item.item_name || ""}`.toLowerCase().includes(addonSearch.toLowerCase()),
      ),
    [addonSearch, booking?.resource_addons],
  );

  const bumpCart = (
    setter: typeof setMenuCart | typeof setAddonCart,
    key: string,
    payload: { id: string; name: string; price: number },
    delta: number,
  ) => {
    setter((current) => {
      const prev = current[key];
      const nextQty = Math.max(0, Number(prev?.quantity || 0) + delta);
      if (nextQty === 0) {
        const clone = { ...current };
        delete clone[key];
        return clone;
      }
      return {
        ...current,
        [key]: { ...payload, quantity: nextQty },
      };
    });
  };

  const menuItemsInCart = Object.values(menuCart);
  const addonItemsInCart = Object.values(addonCart);
  const menuTotal = menuItemsInCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const addonTotal = addonItemsInCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleActivateSession = async () => {
    try {
      await activate.mutateAsync();
      setPaymentNotice("Sesi berhasil diaktifkan.");
      const refreshed = await detail.refetch();
      const nextStatus = String(refreshed.data?.status || "").toLowerCase();
      if (nextStatus === "active" || nextStatus === "ongoing") {
        await liveContext.refetch();
      }
    } catch (error) {
      appToast.error(
        "Aktivasi gagal",
        error instanceof Error ? error.message : "Gagal mengaktifkan sesi.",
      );
    }
  };

  const handleCompleteSession = async () => {
    try {
      await complete.mutateAsync();
      setPaymentNotice("Sesi telah diakhiri. Cek pelunasan di bagian pembayaran.");
      await detail.refetch();
    } catch (error) {
      appToast.error(
        "Akhiri sesi gagal",
        error instanceof Error ? error.message : "Gagal mengakhiri sesi.",
      );
    }
  };

  const handleExtend = async () => {
    try {
      await extend.mutateAsync(selectedExtend);
      setSheet(null);
      await Promise.all([detail.refetch(), liveContext.refetch()]);
    } catch (error) {
      appToast.error(
        "Tambah durasi gagal",
        error instanceof Error ? error.message : "Gagal menambah durasi.",
      );
    }
  };

  const handleSubmitFnb = async () => {
    try {
      for (const item of menuItemsInCart) {
        await addOrder.mutateAsync({ fnb_item_id: item.id, quantity: item.quantity });
      }
      setMenuCart({});
      setSheet(null);
      await detail.refetch();
    } catch (error) {
      appToast.error(
        "Pesanan gagal",
        error instanceof Error ? error.message : "Gagal menambah pesanan F&B.",
      );
    }
  };

  const handleSubmitAddon = async () => {
    try {
      for (const item of addonItemsInCart) {
        for (let i = 0; i < item.quantity; i += 1) {
          await addAddon.mutateAsync(item.id);
        }
      }
      setAddonCart({});
      setSheet(null);
      await detail.refetch();
    } catch (error) {
      appToast.error(
        "Add-on gagal",
        error instanceof Error ? error.message : "Gagal menambah add-on.",
      );
    }
  };

  if (detail.isLoading || !booking) {
    return (
      <ScreenShell eyebrow="Customer" title="Live" subtitle="Memuat live booking...">
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={{ color: theme.colors.foregroundMuted }}>Memuat live booking...</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      eyebrow="Customer"
      title="Live"
      subtitle="Kontrol sesi dan pembayaran."
    >
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Feather name="arrow-left" size={16} color={theme.colors.foreground} />
        <Text style={[styles.backText, { color: theme.colors.foreground }]}>Booking</Text>
      </Pressable>

      <View style={[styles.hero, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroEyebrow, { color: theme.colors.accent }]}>Live</Text>
            <Text style={[styles.heroTitle, { color: theme.colors.foreground }]}>
              {booking.resource_name || booking.resource || "Booking"}
            </Text>
            <Text style={[styles.heroHint, { color: theme.colors.foregroundMuted }]}>
              {booking.tenant_name || "Bookinaja"}
            </Text>
            <Text style={[styles.heroRef, { color: theme.colors.foregroundMuted }]}>
              Ref {String(booking.id || "").slice(0, 8).toUpperCase()}
            </Text>
          </View>
          <View style={[styles.livePill, { backgroundColor: theme.colors.successSoft, borderColor: theme.colors.success }]}>
            <Text style={[styles.livePillText, { color: theme.colors.success }]}>
              {realtime.connected ? "Realtime aktif" : "Sinkronisasi"}
            </Text>
          </View>
        </View>

        <View style={styles.badges}>
          <StatusBadge label={sessionMeta.label} tone={sessionMeta.tone} theme={theme} />
          <StatusBadge label={paymentLabel} tone={paymentMeta.tone} theme={theme} />
        </View>

        <View style={styles.grid}>
          <MiniStat label="Tanggal" value={formatDate(booking.start_time || booking.date)} theme={theme} />
          <MiniStat
            label="Jam"
            value={formatTimeRange(booking.start_time || booking.date, booking.end_time || booking.end_date)}
            theme={theme}
          />
          <MiniStat label="Total" value={formatMoney(booking.grand_total)} theme={theme} />
          <MiniStat label="Sisa" value={formatMoney(balanceDue)} theme={theme} />
        </View>
      </View>

      {countdownData ? (
        <View
          style={[
            styles.countdownCard,
            countdownData.type === "LIVE"
              ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
              : { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
          ]}
        >
          <View style={styles.countdownTop}>
            <View>
              <Text style={styles.countdownLabel}>{countdownData.label}</Text>
              <Text style={[styles.countdownValue, countdownData.type === "LIVE" && countdownData.isCritical ? styles.countdownCritical : null]}>
                {countdownData.h}:{countdownData.m}:{countdownData.s}
              </Text>
            </View>
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownBadgeText}>
                {countdownData.type === "LIVE" ? "Sesi berjalan" : "Menunggu mulai"}
              </Text>
            </View>
          </View>
          {countdownData.type === "LIVE" && countdownData.isCritical ? (
            <Text style={styles.countdownHint}>Waktu hampir habis.</Text>
          ) : null}
        </View>
      ) : null}

      {paymentNotice ? <NoticeCard tone="emerald" text={paymentNotice} theme={theme} /> : null}
      {liveContext.error ? (
        <NoticeCard
          tone="amber"
          text={liveContext.error instanceof Error ? liveContext.error.message : "Live context belum bisa dimuat."}
          theme={theme}
        />
      ) : null}
      {pendingManualDpAttempt ? (
        <NoticeCard
          tone="amber"
          text={`DP menunggu verifikasi. Ref ${pendingManualDpAttempt.reference_code || "-"}.`}
          theme={theme}
        />
      ) : null}
      {pendingManualSettlementAttempt ? (
        <NoticeCard
          tone="amber"
          text={`Pelunasan menunggu verifikasi. Ref ${pendingManualSettlementAttempt.reference_code || "-"}.`}
          theme={theme}
        />
      ) : null}

      {shouldShowActivation ? (
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.sectionTop}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>Aktivasi sesi</Text>
              <Text style={[styles.sectionBody, { color: theme.colors.foreground }]}>
                {!hasPaidDp ? "Bayar DP dulu." : !isTimeReached ? "Belum masuk jam." : "Siap diaktifkan."}
              </Text>
            </View>
            <StatusBadge label={hasPaidDp ? "Siap" : "Tertahan"} tone={hasPaidDp ? "success" : "neutral"} theme={theme} />
          </View>
          <Pressable
            onPress={() => setConfirmAction("activate")}
            disabled={activate.isPending || !hasPaidDp || !isTimeReached}
            style={[
              styles.primaryFullButton,
              {
                backgroundColor: activate.isPending || !hasPaidDp || !isTimeReached ? theme.colors.foregroundMuted : theme.colors.success,
              },
            ]}
          >
            <Text style={styles.primaryFullButtonText}>{activate.isPending ? "Mengaktifkan..." : "Aktifkan"}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.sectionTop}>
          <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>Kontrol live</Text>
          <StatusBadge label={isActiveStatus ? "Aktif" : "Belum aktif"} tone={isActiveStatus ? "success" : "neutral"} theme={theme} />
        </View>

        <View style={styles.actionGrid}>
          <ActionTile title="Tambah Durasi" icon="clock" active={isActiveStatus} theme={theme} onPress={() => setSheet("extend")} />
          <ActionTile title="Pesan F&B" icon="coffee" active={isActiveStatus} theme={theme} onPress={() => setSheet("fnb")} />
          <ActionTile title="Tambah Add-on" icon="plus-circle" active={isActiveStatus} theme={theme} onPress={() => setSheet("addon")} />
          <ActionTile title="Akhiri Sesi" icon="x-circle" active={isActiveStatus} theme={theme} filled onPress={() => setConfirmAction("complete")} />
        </View>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.sectionTop}>
          <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>Pembayaran</Text>
          <StatusBadge label={paymentLabel} tone={paymentMeta.tone} theme={theme} />
        </View>

        <View style={styles.paymentStatsRow}>
          <PaymentStat label="Total" value={formatMoney(booking.grand_total)} theme={theme} />
          <PaymentStat label="Dibayar" value={formatMoney(paidAmount)} theme={theme} />
          <PaymentStat label="Sisa" value={formatMoney(balanceDue)} theme={theme} />
        </View>

        <View
          style={[
            styles.guidanceCard,
            { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.inlineHint, { color: theme.colors.foregroundMuted }]}>
            {paymentGuidance}
          </Text>
        </View>

        {hasPromo ? (
          <View style={[styles.promoCard, { backgroundColor: theme.colors.successSoft, borderColor: theme.colors.success }]}>
            <View style={styles.promoHeader}>
              <View>
                <Text style={[styles.promoEyebrow, { color: theme.colors.success }]}>Promo</Text>
                <Text style={[styles.promoCode, { color: theme.colors.foreground }]}>{booking.promo_code}</Text>
              </View>
              <View style={[styles.promoBadge, { backgroundColor: theme.colors.success }]}>
                <Text style={styles.promoBadgeText}>-{formatMoney(booking.discount_amount)}</Text>
              </View>
            </View>
            <View style={styles.promoMetricRow}>
              <PromoMetric label="Sebelum" value={formatMoney((booking as any).original_grand_total)} theme={theme} />
              <PromoMetric label="Diskon" value={`-${formatMoney((booking as any).discount_amount)}`} theme={theme} />
              <PromoMetric label="Total" value={formatMoney(booking.grand_total)} theme={theme} />
            </View>
          </View>
        ) : null}

        {paymentStatus === "awaiting_verification" && pendingManualSettlementAttempt ? (
          <NoticeCard
            tone="amber"
            text={`Pelunasan menunggu verifikasi. Ref ${pendingManualSettlementAttempt.reference_code}.`}
            theme={theme}
          />
        ) : null}

        <View style={styles.rowButtons}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(customer)/bookings/[id]/payment",
                params: { id: bookingId, scope: "deposit" },
              })
            }
            disabled={depositAmount <= 0 || paymentStatus !== "pending" || Boolean(pendingManualDpAttempt)}
            style={[
              styles.primaryButton,
              {
                backgroundColor:
                  depositAmount <= 0 || paymentStatus !== "pending" || Boolean(pendingManualDpAttempt)
                    ? theme.colors.surfaceAlt
                    : theme.colors.accent,
                borderColor:
                  depositAmount <= 0 || paymentStatus !== "pending" || Boolean(pendingManualDpAttempt)
                    ? theme.colors.border
                    : theme.colors.accent,
              },
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                {
                  color:
                    depositAmount <= 0 || paymentStatus !== "pending" || Boolean(pendingManualDpAttempt)
                      ? theme.colors.foregroundMuted
                      : "#FFFFFF",
                },
              ]}
            >
              Bayar DP
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(customer)/bookings/[id]/payment",
                params: { id: bookingId, scope: "settlement" },
              })
            }
            disabled={sessionStatus !== "completed" || balanceDue <= 0 || Boolean(pendingManualSettlementAttempt)}
            style={[
              styles.secondaryButton,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderColor: theme.colors.border,
                opacity:
                  sessionStatus !== "completed" || balanceDue <= 0 || Boolean(pendingManualSettlementAttempt)
                    ? 0.6
                    : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.colors.foreground }]}>Pelunasan</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.sectionTop}>
          <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>Ringkasan booking</Text>
          <StatusBadge label={`${bookingItemCount} item`} tone="neutral" theme={theme} />
        </View>

        <View style={styles.blockSection}>
          <Text style={[styles.blockTitle, { color: theme.colors.foreground }]}>Layanan utama</Text>
          <View style={styles.stack}>
            {groupedMainOptions.length ? (
              groupedMainOptions.map((opt: any) => (
                <LineRow
                  key={`${opt.item_name}-${opt.item_type}`}
                  title={opt.item_name}
                  subtitle={`${opt.quantity} ${getUnitLabel((booking as any)?.unit_duration)} · ${formatMoney(opt.unitPrice || 0)}`}
                  value={formatMoney(opt.totalPrice || 0)}
                  theme={theme}
                />
              ))
            ) : (
              <EmptyState label="Belum ada layanan utama." theme={theme} />
            )}
          </View>
        </View>

        <View style={styles.blockSection}>
          <Text style={[styles.blockTitle, { color: theme.colors.foreground }]}>Add-on</Text>
          <View style={styles.stack}>
            {groupedAddonOptions.length ? (
              groupedAddonOptions.map((opt: any) => (
                <LineRow
                  key={`${opt.item_name}-${opt.item_type}`}
                  title={opt.item_name}
                  subtitle={`${opt.quantity} unit · ${formatMoney(opt.unitPrice || 0)}`}
                  value={formatMoney(opt.totalPrice || 0)}
                  theme={theme}
                />
              ))
            ) : (
              <EmptyState label="Belum ada add-on." theme={theme} />
            )}
          </View>
        </View>

        <View style={styles.blockSection}>
          <Text style={[styles.blockTitle, { color: theme.colors.foreground }]}>Pesanan F&B</Text>
          <View style={styles.stack}>
            {groupedOrders.length ? (
              groupedOrders.map((order: any) => (
                <LineRow
                  key={String(order.item_name || "").toLowerCase()}
                  title={order.item_name}
                  subtitle={`${order.quantity} porsi · ${formatMoney(order.price_at_purchase || 0)}`}
                  value={formatMoney(order.subtotal || 0)}
                  theme={theme}
                />
              ))
            ) : (
              <EmptyState label="Belum ada pesanan F&B." theme={theme} />
            )}
          </View>
        </View>

        {(booking as any)?.events?.length ? (
          <View style={styles.blockSection}>
            <Text style={[styles.blockTitle, { color: theme.colors.foreground }]}>Timeline</Text>
            <View style={styles.stack}>
              {(booking as any).events.slice(0, 4).map((event: any) => (
                <View
                  key={event.id}
                  style={[styles.eventCard, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
                >
                  <View style={styles.eventTop}>
                    <Text style={[styles.eventTitle, { color: theme.colors.foreground }]}>
                      {event.title || "Aktivitas booking"}
                    </Text>
                    <Text style={[styles.eventActor, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                      {event.actor_type || "system"}
                    </Text>
                  </View>
                  <Text style={[styles.eventDescription, { color: theme.colors.foregroundMuted }]} numberOfLines={2}>
                    {event.description || "Status booking berubah."}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <SheetModal
        open={sheet === "extend"}
        onClose={() => setSheet(null)}
        title="Tambah durasi sesi"
        theme={theme}
      >
        <InfoCard label="Live Action" value="Pilih tambahan durasi. Sistem akan langsung menambah billing booking customer." />
        <View style={styles.optionGrid}>
          {[1, 2, 3, 4].map((count) => (
            <Pressable
              key={count}
              onPress={() => setSelectedExtend(count)}
              style={[
                styles.optionCard,
                {
                  backgroundColor: selectedExtend === count ? theme.colors.accentSoft : theme.colors.card,
                  borderColor: selectedExtend === count ? theme.colors.accent : theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                +{count} {extendUnitLabel}
              </Text>
              <Text style={[styles.optionHint, { color: theme.colors.foregroundMuted }]}>
                {formatMoney(Number(booking.unit_price || 0) * count)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => void handleExtend()} style={[styles.primaryFullButton, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.primaryFullButtonText}>{extend.isPending ? "Memproses..." : "Tambah durasi"}</Text>
        </Pressable>
      </SheetModal>

      <SheetModal open={sheet === "fnb"} onClose={() => setSheet(null)} title="Pesan F&B" theme={theme}>
        <TextInput
          value={menuSearch}
          onChangeText={setMenuSearch}
          placeholder="Cari menu..."
          placeholderTextColor={theme.colors.foregroundMuted}
          style={[styles.searchInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.foreground }]}
        />
        <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={styles.stack}>
          {menuItems.map((item) => {
            const quantity = menuCart[item.id]?.quantity || 0;
            return (
              <CounterRow
                key={item.id}
                title={item.name}
                subtitle={item.category || "Menu"}
                value={formatMoney(Number(item.price || 0))}
                quantity={quantity}
                theme={theme}
                onMinus={() => bumpCart(setMenuCart, item.id, { id: item.id, name: item.name, price: Number(item.price || 0) }, -1)}
                onPlus={() => bumpCart(setMenuCart, item.id, { id: item.id, name: item.name, price: Number(item.price || 0) }, 1)}
              />
            );
          })}
        </ScrollView>
        <InfoCard label="Total F&B" value={formatMoney(menuTotal)} />
        <Pressable
          onPress={() => void handleSubmitFnb()}
          disabled={menuItemsInCart.length === 0}
          style={[styles.primaryFullButton, { backgroundColor: menuItemsInCart.length === 0 ? theme.colors.foregroundMuted : theme.colors.accent }]}
        >
          <Text style={styles.primaryFullButtonText}>{addOrder.isPending ? "Memproses..." : "Tambahkan pesanan"}</Text>
        </Pressable>
      </SheetModal>

      <SheetModal open={sheet === "addon"} onClose={() => setSheet(null)} title="Tambah Add-on" theme={theme}>
        <TextInput
          value={addonSearch}
          onChangeText={setAddonSearch}
          placeholder="Cari add-on..."
          placeholderTextColor={theme.colors.foregroundMuted}
          style={[styles.searchInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.foreground }]}
        />
        <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={styles.stack}>
          {addonItems.map((item: any) => {
            const key = String(item.id);
            const quantity = addonCart[key]?.quantity || 0;
            const title = item.name || item.item_name || "Add-on";
            const price = Number(item.price || item.unit_price || 0);
            return (
              <CounterRow
                key={key}
                title={title}
                subtitle="Add-on"
                value={formatMoney(price)}
                quantity={quantity}
                theme={theme}
                onMinus={() => bumpCart(setAddonCart, key, { id: key, name: title, price }, -1)}
                onPlus={() => bumpCart(setAddonCart, key, { id: key, name: title, price }, 1)}
              />
            );
          })}
        </ScrollView>
        <InfoCard label="Total Add-on" value={formatMoney(addonTotal)} />
        <Pressable
          onPress={() => void handleSubmitAddon()}
          disabled={addonItemsInCart.length === 0}
          style={[styles.primaryFullButton, { backgroundColor: addonItemsInCart.length === 0 ? theme.colors.foregroundMuted : theme.colors.accent }]}
        >
          <Text style={styles.primaryFullButtonText}>{addAddon.isPending ? "Memproses..." : "Tambahkan add-on"}</Text>
        </Pressable>
      </SheetModal>

      <ConfirmModal
        open={confirmAction === "activate"}
        title="Aktifkan sesi?"
        description="Sesi akan dimulai sekarang."
        confirmLabel={activate.isPending ? "Mengaktifkan..." : "Aktifkan"}
        theme={theme}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          setConfirmAction(null);
          await handleActivateSession();
        }}
      />

      <ConfirmModal
        open={confirmAction === "complete"}
        title="Akhiri sesi?"
        description="Sesi akan ditutup dan pelunasan bisa dilanjutkan."
        confirmLabel={complete.isPending ? "Memproses..." : "Akhiri sesi"}
        theme={theme}
        destructive
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          setConfirmAction(null);
          await handleCompleteSession();
        }}
      />
    </ScreenShell>
  );
}

function StatusBadge({
  label,
  tone,
  theme,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  theme: ReturnType<typeof useAppTheme>;
}) {
  const style =
    tone === "success"
      ? { backgroundColor: theme.colors.success, color: "#FFFFFF" }
      : tone === "warning"
        ? { backgroundColor: theme.colors.warning, color: "#FFFFFF" }
        : tone === "danger"
          ? { backgroundColor: theme.colors.danger, color: "#FFFFFF" }
          : tone === "info"
            ? { backgroundColor: theme.colors.accent, color: "#FFFFFF" }
            : { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.foreground };

  return (
    <View style={[styles.statusBadge, { backgroundColor: style.backgroundColor }]}>
      <Text style={[styles.statusBadgeText, { color: style.color }]}>{label}</Text>
    </View>
  );
}

function MiniStat({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={[styles.miniStat, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
      <Text style={[styles.miniStatLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.miniStatValue, { color: theme.colors.foreground }]}>{value}</Text>
    </View>
  );
}

function NoticeCard({
  tone,
  text,
  theme,
}: {
  tone: "emerald" | "amber";
  text: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View
      style={[
        styles.noticeCard,
        tone === "emerald"
          ? { backgroundColor: theme.colors.successSoft, borderColor: theme.colors.success }
          : { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning },
      ]}
    >
      <Text style={[styles.noticeText, { color: tone === "emerald" ? theme.colors.success : theme.colors.warning }]}>
        {text}
      </Text>
    </View>
  );
}

function PromoMetric({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View
      style={[
        styles.promoMetricBox,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.promoMetricLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.promoMetricValue, { color: theme.colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PaymentStat({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View
      style={[
        styles.paymentStat,
        { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.paymentStatLabel, { color: theme.colors.foregroundMuted }]}>
        {label}
      </Text>
      <Text
        style={[styles.paymentStatValue, { color: theme.colors.foreground }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function LineRow({
  title,
  subtitle,
  value,
  theme,
}: {
  title: string;
  subtitle: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View
      style={[
        styles.rowCard,
        { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
      ]}
    >
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: theme.colors.foreground }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.rowHint, { color: theme.colors.foregroundMuted }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Text style={[styles.rowValue, { color: theme.colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function EmptyState({
  label,
  theme,
}: {
  label: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View
      style={[
        styles.emptyState,
        { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.emptyStateText, { color: theme.colors.foregroundMuted }]}>{label}</Text>
    </View>
  );
}

function ActionTile({
  title,
  icon,
  active,
  theme,
  filled = false,
  onPress,
}: {
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  active: boolean;
  theme: ReturnType<typeof useAppTheme>;
  filled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!active}
      style={[
        styles.actionTile,
        filled
          ? { backgroundColor: active ? theme.colors.primary : theme.colors.foregroundMuted, borderColor: active ? theme.colors.primary : theme.colors.foregroundMuted }
          : { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, opacity: active ? 1 : 0.58 },
      ]}
    >
      <Feather name={icon} size={18} color={filled ? "#FFFFFF" : theme.colors.foreground} />
      <Text style={[styles.actionTileText, { color: filled ? "#FFFFFF" : theme.colors.foreground }]}>{title}</Text>
    </Pressable>
  );
}

function SheetModal({
  open,
  onClose,
  title,
  children,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.foreground }]}>{title}</Text>
            <Pressable onPress={onClose} style={[styles.modalClose, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Feather name="x" size={18} color={theme.colors.foreground} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  theme,
  destructive = false,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  theme: ReturnType<typeof useAppTheme>;
  destructive?: boolean;
}) {
  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.confirmBackdrop, { backgroundColor: theme.colors.overlay }]}>
        <View
          style={[
            styles.confirmCard,
            { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.confirmTitle, { color: theme.colors.foreground }]}>{title}</Text>
          <Text style={[styles.confirmDescription, { color: theme.colors.foregroundMuted }]}>
            {description}
          </Text>
          <View style={styles.confirmActions}>
            <Pressable
              onPress={onClose}
              style={[
                styles.confirmSecondaryButton,
                { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.confirmSecondaryText, { color: theme.colors.foreground }]}>
                Batal
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void onConfirm()}
              style={[
                styles.confirmPrimaryButton,
                {
                  backgroundColor: destructive ? theme.colors.primary : theme.colors.success,
                  borderColor: destructive ? theme.colors.primary : theme.colors.success,
                },
              ]}
            >
              <Text style={styles.confirmPrimaryText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CounterRow({
  title,
  subtitle,
  value,
  quantity,
  theme,
  onMinus,
  onPlus,
}: {
  title: string;
  subtitle: string;
  value: string;
  quantity: number;
  theme: ReturnType<typeof useAppTheme>;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={[styles.counterRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.counterCopy}>
        <Text style={[styles.counterTitle, { color: theme.colors.foreground }]}>{title}</Text>
        <Text style={[styles.counterHint, { color: theme.colors.foregroundMuted }]}>{subtitle}</Text>
        <Text style={[styles.counterPrice, { color: theme.colors.foreground }]}>{value}</Text>
      </View>
      <View style={styles.counterActions}>
        <Pressable onPress={onMinus} style={[styles.counterButton, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Feather name="minus" size={16} color={theme.colors.foreground} />
        </Pressable>
        <Text style={[styles.counterValue, { color: theme.colors.foreground }]}>{quantity}</Text>
        <Pressable onPress={onPlus} style={[styles.counterButton, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Feather name="plus" size={16} color={theme.colors.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: "800",
  },
  hero: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: "800",
  },
  heroHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  heroRef: {
    fontSize: 11,
    fontWeight: "600",
  },
  livePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  livePillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  threeGrid: {
    flexDirection: "row",
    gap: 10,
  },
  paymentStatsRow: {
    flexDirection: "row",
    gap: 6,
  },
  paymentStat: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 3,
  },
  paymentStatLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  paymentStatValue: {
    fontSize: 12,
    fontWeight: "800",
  },
  miniStat: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  miniStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  miniStatValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  countdownCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
  },
  countdownTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  countdownLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  countdownValue: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  countdownCritical: {
    color: "#FCD34D",
  },
  countdownBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countdownBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  countdownHint: {
    marginTop: 12,
    color: "#FCD34D",
    fontSize: 13,
    fontWeight: "700",
  },
  noticeCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    gap: 10,
  },
  sectionTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  inlineHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  guidanceCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryFullButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryFullButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionTile: {
    width: "48%",
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 20,
    padding: 11,
    justifyContent: "space-between",
  },
  actionTileText: {
    fontSize: 13,
    fontWeight: "800",
  },
  promoCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 12,
  },
  promoMetricRow: {
    flexDirection: "row",
    gap: 8,
  },
  promoMetricBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    gap: 4,
  },
  promoMetricLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  promoMetricValue: {
    fontSize: 12,
    fontWeight: "800",
  },
  promoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  promoEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  promoCode: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
  },
  promoBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  promoBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  rowButtons: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    minHeight: 68,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 68,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryWideButton: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryWideButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
  blockSection: {
    gap: 10,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  stack: {
    gap: 10,
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  rowHint: {
    fontSize: 11,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: "800",
    maxWidth: 110,
    textAlign: "right",
  },
  eventCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 6,
  },
  eventTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  eventTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  eventActor: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    maxWidth: 92,
    textAlign: "right",
  },
  eventDescription: {
    fontSize: 11,
    lineHeight: 16,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyStateText: {
    fontSize: 12,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  confirmBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  confirmCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  confirmDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  confirmSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmSecondaryText: {
    fontSize: 14,
    fontWeight: "800",
  },
  confirmPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: "82%",
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 4,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  optionHint: {
    fontSize: 12,
  },
  searchInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  counterRow: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  counterCopy: {
    flex: 1,
    gap: 3,
  },
  counterTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  counterHint: {
    fontSize: 12,
  },
  counterPrice: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "800",
  },
  counterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    minWidth: 18,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
  },
});
