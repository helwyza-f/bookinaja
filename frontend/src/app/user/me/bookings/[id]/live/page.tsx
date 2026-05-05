/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  MapPin,
  ReceiptText,
  UtensilsCrossed,
  Wallet,
  Zap,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format, differenceInSeconds, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { setCookie } from "cookies-next";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { BookingLiveController } from "@/components/customer/booking-live-controller";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { customerBookingChannel } from "@/lib/realtime/channels";
import {
  BOOKING_EVENT_PREFIXES,
  matchesRealtimePrefix,
} from "@/lib/realtime/event-types";
import { RealtimePill } from "@/components/dashboard/realtime-pill";

export default function CustomerBookingDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(new Date());
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activating, setActivating] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const lastRealtimeToastRef = useRef("");
  const hasLoadedRef = useRef(false);
  const detailRefreshTimerRef = useRef<number | null>(null);
  const liveRefreshTimerRef = useRef<number | null>(null);

  const resolveCustomerId = (payload: any) => {
    return String(payload?.customer?.id || payload?.customer_id || payload?.id || "");
  };

  useEffect(() => {
    const notice = String(searchParams.get("notice") || "").trim();
    if (!notice) return;
    if (notice === "settlement_locked") {
      setPaymentNotice("Pelunasan baru tersedia setelah sesi selesai. Akhiri sesi dulu lalu lanjut ke halaman pelunasan.");
      return;
    }
    if (notice === "no_balance_due") {
      setPaymentNotice("Booking ini sudah tidak memiliki sisa tagihan untuk dilunasi.");
      return;
    }
    if (notice === "deposit_not_required") {
      setPaymentNotice("Booking ini tidak membutuhkan DP. Kamu bisa langsung pantau sesi dari halaman ini.");
      return;
    }
    if (notice === "deposit_unavailable") {
      setPaymentNotice("Halaman DP hanya tersedia sebelum pembayaran DP tercatat.");
      return;
    }
    if (notice === "deposit_methods_unavailable") {
      setPaymentNotice("Tenant belum menyiapkan metode pembayaran untuk DP.");
      return;
    }
    if (notice === "settlement_methods_unavailable") {
      setPaymentNotice("Tenant belum menyiapkan metode pembayaran untuk pelunasan.");
    }
  }, [searchParams]);

  const fetchDetail = useCallback(async (mode: "initial" | "background" = "initial") => {
    const background = mode === "background" && hasLoadedRef.current;
    try {
      if (background) setRefreshing(true);
      const res = await api.get(`/user/me/bookings/${params.id}`);
      setBooking(res.data);
      hasLoadedRef.current = true;
      return res.data;
    } catch (err) {
      if (isTenantAuthError(err)) {
        clearTenantSession({ keepTenantSlug: true });
        router.replace("/user/login");
        return;
      }
      if (!background) {
        toast.error("Gagal memuat tiket booking");
        router.replace("/user/me");
      }
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [params.id, router]);

  const fetchMenuItems = useCallback(async (slug?: string) => {
    if (!slug) return;
    try {
      const menuRes = await api.get("/customer/fnb", {
        params: { slug, booking_id: params.id },
      });
      const items = Array.isArray(menuRes.data) ? menuRes.data : [];
      if (items.length > 0) {
        setMenuItems(items);
        return;
      }

      const fallbackRes = await api.get("/public/fnb", { params: { slug } });
      setMenuItems(Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
    } catch {
      try {
        const fallbackRes = await api.get("/public/fnb", { params: { slug } });
        setMenuItems(Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
      } catch {
        setMenuItems([]);
      }
    }
  }, [params.id]);

  const fetchLiveContext = useCallback(async () => {
    const status = String(booking?.status || "").toLowerCase();
    if (status !== "active" && status !== "ongoing") {
      setLiveNotice(null);
      return;
    }
    try {
      const res = await api.get(`/user/me/bookings/${params.id}/context`);
      if (res.data?.booking) {
        setBooking((prev: any) => ({
          ...(prev || {}),
          ...res.data.booking,
        }));
      }
      setLiveNotice(null);
    } catch (err: any) {
      const message = String(err?.response?.data?.error || "");
      if (message) setLiveNotice(message);
    }
  }, [booking?.status, params.id]);

  const scheduleDetailRefresh = useCallback(
    (delay = 300) => {
      if (detailRefreshTimerRef.current !== null) {
        window.clearTimeout(detailRefreshTimerRef.current);
      }
      detailRefreshTimerRef.current = window.setTimeout(() => {
        detailRefreshTimerRef.current = null;
        void fetchDetail("background");
      }, delay);
    },
    [fetchDetail],
  );

  const scheduleLiveContextRefresh = useCallback(
    (delay = 450) => {
      if (liveRefreshTimerRef.current !== null) {
        window.clearTimeout(liveRefreshTimerRef.current);
      }
      liveRefreshTimerRef.current = window.setTimeout(() => {
        liveRefreshTimerRef.current = null;
        void fetchLiveContext();
      }, delay);
    },
    [fetchLiveContext],
  );

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    const token =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("token") ||
          new URLSearchParams(window.location.search).get("code")
        : null;

    const bootstrap = async () => {
      if (token) {
        try {
          const res = await api.post("/public/bookings/exchange", { code: token });
          if (cancelled) return;

          if (!res.data?.customer_token) {
            throw new Error("Akses booking tidak valid");
          }

          setCookie("customer_auth", res.data.customer_token);
          window.history.replaceState(null, "", window.location.pathname);
        } catch (error: unknown) {
          if (cancelled) return;
          const message =
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            "Gagal memverifikasi akses booking";
          toast.error(message);
          router.replace("/user/login");
          return;
        }
      }

      if (cancelled) return;

      const detail = await fetchDetail("initial");
      try {
        const meRes = await api.get("/me");
        if (!cancelled) setCustomerId(resolveCustomerId(meRes.data));
      } catch {
        if (!cancelled) setCustomerId("");
      }

      const currentSlug = detail?.tenant_slug;
      if (currentSlug) {
        await fetchMenuItems(currentSlug);
      } else {
        setTimeout(() => fetchMenuItems(booking?.tenant_slug), 2000);
      }
      await fetchLiveContext();

      if (cancelled) return;

      const clock = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(clock);
    };

    let cleanup: (() => void) | void;
    void bootstrap().then((result) => {
      cleanup = result;
    });

    return () => {
      cancelled = true;
      if (detailRefreshTimerRef.current !== null) {
        window.clearTimeout(detailRefreshTimerRef.current);
        detailRefreshTimerRef.current = null;
      }
      if (liveRefreshTimerRef.current !== null) {
        window.clearTimeout(liveRefreshTimerRef.current);
        liveRefreshTimerRef.current = null;
      }
      if (cleanup) cleanup();
    };
  }, [fetchDetail, fetchLiveContext, fetchMenuItems, params.id]);

  const { connected: realtimeConnected, status: realtimeStatus } = useRealtime({
    enabled: Boolean(customerId && params.id),
    channels:
      customerId && params.id
        ? [customerBookingChannel(customerId, String(params.id))]
        : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      setBooking((prev: any) =>
        prev
          ? {
              ...prev,
              status: event.summary?.status ?? prev.status,
              payment_status: event.summary?.payment_status ?? prev.payment_status,
              grand_total: event.summary?.grand_total ?? prev.grand_total,
              balance_due: event.summary?.balance_due ?? prev.balance_due,
            }
          : prev,
      );
      const eventKey = `${event.type}:${event.entity_id || ""}:${event.occurred_at || ""}`;
      if (lastRealtimeToastRef.current !== eventKey) {
        lastRealtimeToastRef.current = eventKey;
        if (event.type === "payment.dp.paid") {
          toast.success("DP sudah diterima");
        } else if (event.type === "payment.awaiting_verification") {
          toast.message("Pembayaran menunggu verifikasi admin");
        } else if (event.type === "payment.manual.rejected") {
          toast.error("Pembayaran manual ditolak admin");
        } else if (
          event.type === "payment.settlement.paid" ||
          event.type === "payment.cash.settled"
        ) {
          toast.success("Pembayaran booking sudah lunas");
        } else if (event.type === "session.activated") {
          toast.success("Sesi berhasil dimulai");
        } else if (event.type === "session.completed") {
          toast.message("Sesi sudah selesai");
        } else if (event.type === "order.fnb.added") {
          toast.message("Pesanan F&B berhasil masuk");
        } else if (event.type === "order.addon.added") {
          toast.message("Add-on berhasil ditambahkan");
        }
      }
      scheduleDetailRefresh();
      scheduleLiveContextRefresh();
    },
    onReconnect: () => {
      scheduleDetailRefresh(150);
      scheduleLiveContextRefresh(250);
    },
  });

  const isActiveStatus = useMemo(
    () => booking?.status === "active" || booking?.status === "ongoing",
    [booking],
  );

  const depositAmount = Number(booking?.deposit_amount || 0);
  const balanceDue = Number(booking?.balance_due || 0);
  const paidAmount = Number(booking?.paid_amount || 0);
  const paymentStatus = String(booking?.payment_status || "").toLowerCase();
  const sessionStatus = String(booking?.status || "").toLowerCase();
  const paymentAttempts = useMemo(
    () => booking?.payment_attempts || [],
    [booking?.payment_attempts],
  );
  const pendingManualDpAttempt = useMemo(
    () =>
      paymentAttempts.find(
        (item: any) =>
          item?.payment_scope === "deposit" &&
          (item?.status === "submitted" || item?.status === "awaiting_verification"),
      ),
    [paymentAttempts],
  );
  const pendingManualSettlementAttempt = useMemo(
    () =>
      paymentAttempts.find(
        (item: any) =>
          item?.payment_scope === "settlement" &&
          (item?.status === "submitted" || item?.status === "awaiting_verification"),
      ),
    [paymentAttempts],
  );

  const paymentLabel = useMemo(() => {
    if (paymentStatus === "settled") return "Lunas";
    if (paymentStatus === "awaiting_verification") return "Menunggu Verifikasi";
    if (paymentStatus === "partial_paid") return "DP Masuk";
    if (paymentStatus === "paid") return balanceDue > 0 ? "DP Masuk" : "Lunas";
    if (paymentStatus === "pending") return "Menunggu DP";
    if (paymentStatus === "expired") return "DP Kadaluarsa";
    if (paymentStatus === "failed") return "Gagal Bayar";
    return "Belum Dibayar";
  }, [paymentStatus, balanceDue]);

  const paymentStateTone =
    paymentStatus === "settled" || (paymentStatus === "paid" && balanceDue === 0)
      ? "bg-emerald-500 text-white"
      : paymentStatus === "partial_paid" || paymentStatus === "paid"
        ? "bg-blue-600 text-white"
        : paymentStatus === "awaiting_verification"
          ? "bg-amber-500 text-white"
          : paymentStatus === "expired" || paymentStatus === "failed"
            ? "bg-red-500 text-white"
            : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200";

  const sessionTone =
    sessionStatus === "active" || sessionStatus === "ongoing"
      ? "bg-emerald-500 text-white"
      : sessionStatus === "completed"
        ? "bg-slate-950 text-white dark:bg-white/15"
        : sessionStatus === "confirmed"
          ? "bg-blue-600 text-white"
          : "bg-amber-500 text-white";

  const countdownData = useMemo(() => {
    if (!booking) return null;
    const start = parseISO(booking.start_time);
    const end = parseISO(booking.end_time);

    if (isActiveStatus) {
      const diff = differenceInSeconds(end, now);
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
      !["completed", "cancelled", "active", "ongoing"].includes(String(booking.status))
    ) {
      const diff = differenceInSeconds(start, now);
      return {
        type: "WAITING",
        label: "Mulai dalam",
        h: String(Math.floor(diff / 3600)).padStart(2, "0"),
        m: String(Math.floor((diff % 3600) / 60)).padStart(2, "0"),
        s: String(diff % 60).padStart(2, "0"),
      };
    }
    return null;
  }, [booking, now, isActiveStatus]);

  const groupedOptions = useMemo(() => {
    if (!booking?.options) return [];
    const groups = booking.options.reduce((acc: any, item: any) => {
      const key = `${String(item.item_name || "").trim().toLowerCase()}::${item.item_type || ""}`;
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
  }, [booking?.options]);

  const groupedOrders = useMemo(() => {
    if (!booking?.orders) return [];
    const groups = booking.orders.reduce((acc: any, item: any) => {
      const key = String(item.item_name || "").trim().toLowerCase();
      if (!acc[key]) {
        acc[key] = {
          ...item,
          quantity: Number(item.quantity || 0),
          subtotal: Number(item.subtotal || 0),
        };
      } else {
        acc[key].quantity += Number(item.quantity || 0);
        acc[key].subtotal += Number(item.subtotal || 0);
      }
      return acc;
    }, {});
    return Object.values(groups);
  }, [booking?.orders]);

  const copyMagicLink = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Tautan booking disalin");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getUnitLabel = (duration: number) => {
    if (duration === 60) return "Jam";
    return "Sesi";
  };

  const handleActivateSession = async () => {
    setActivating(true);
    try {
      await api.post(`/user/me/bookings/${params.id}/activate`);
      setPaymentNotice("Sesi berhasil diaktifkan.");
      toast.success("Sesi berhasil diaktifkan");
      await fetchDetail();
      await fetchLiveContext();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal mengaktifkan sesi");
    } finally {
      setActivating(false);
    }
  };

  const handleAddFnb = async (cartItems: any[]) => {
    for (const item of cartItems) {
      await api.post(`/user/me/bookings/${params.id}/orders`, {
        fnb_item_id: item.id,
        quantity: item.quantity,
      });
    }
    toast.success("Pesanan F&B ditambahkan");
    await fetchDetail();
  };

  const handleAddons = async (cartItems: any[]) => {
    for (const item of cartItems) {
      for (let i = 0; i < item.quantity; i++) {
        await api.post(`/user/me/bookings/${params.id}/addons`, {
          item_id: item.id,
        });
      }
    }
    toast.success("Add-on ditambahkan");
    await fetchDetail();
  };

  const handleExtend = async (count: number) => {
    await api.post(`/user/me/bookings/${params.id}/extend`, {
      additional_duration: count,
    });
    toast.success("Sesi diperpanjang");
    await fetchDetail();
  };

  const handleCompleteSession = async () => {
    try {
      await api.post(`/user/me/bookings/${params.id}/complete`);
      setPaymentNotice("Sesi telah diakhiri. Cek pelunasan di bagian pembayaran.");
      toast.success("Sesi berhasil diakhiri");
      await fetchDetail();
      await fetchLiveContext();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal mengakhiri sesi");
    }
  };

  if (loading) return <TicketSkeleton />;
  if (!booking) return null;

  const hasPaidDp =
    paymentStatus === "partial_paid" ||
    paymentStatus === "paid" ||
    paymentStatus === "settled" ||
    depositAmount === 0;
  const isTimeReached = now >= new Date(booking?.start_time || "");
  const bookingReference = String(booking?.id || "").slice(0, 8).toUpperCase();
  const shouldShowActivation =
    !isActiveStatus && sessionStatus !== "completed" && sessionStatus !== "cancelled";

  const paymentGuidance =
    depositAmount > 0
      ? paymentStatus === "awaiting_verification"
        ? `DP menunggu verifikasi. Ref ${pendingManualDpAttempt?.reference_code || "-"}.`
        : paymentStatus === "pending"
          ? `DP Rp ${depositAmount.toLocaleString("id-ID")} belum dibayar.`
          : "DP sudah masuk."
      : "Tanpa DP.";

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          className="h-10 rounded-2xl px-3"
          onClick={() => router.push(`/user/me/bookings/${booking.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Booking
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-2xl"
          onClick={copyMagicLink}
        >
          {copied ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="space-y-4">
        <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
          <div className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                  <MapPin className="h-3.5 w-3.5" />
                  Live
                </div>
                <h1 className="mt-1 line-clamp-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {booking.resource_name}
                </h1>
                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  {booking.tenant_name || "Bookinaja"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Ref {bookingReference}
                </p>
              </div>
              <RealtimePill
                connected={realtimeConnected}
                status={realtimeStatus}
                className="normal-case tracking-normal"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={cn("border-none", sessionTone)}>
                Sesi: {booking.status}
              </Badge>
              <Badge className={cn("border-none", paymentStateTone)}>
                Bayar: {paymentLabel}
              </Badge>
              {refreshing ? (
                <Badge className="border-none bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  Refreshing
                </Badge>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat
                icon={CalendarDays}
                label="Tanggal"
                value={format(parseISO(booking.start_time), "dd MMM yyyy", { locale: idLocale })}
              />
              <MiniStat
                icon={Clock3}
                label="Jam"
                value={`${format(parseISO(booking.start_time), "HH:mm")} - ${format(parseISO(booking.end_time), "HH:mm")}`}
              />
              <MiniStat
                icon={Wallet}
                label="Total"
                value={`Rp ${Number(booking.grand_total || 0).toLocaleString("id-ID")}`}
              />
              <MiniStat
                icon={CreditCard}
                label="Sisa"
                value={`Rp ${balanceDue.toLocaleString("id-ID")}`}
              />
            </div>
          </div>
        </Card>

        {countdownData ? (
          <Card
            className={cn(
              "rounded-[1.75rem] border p-4 shadow-sm",
              countdownData.type === "LIVE"
                ? "border-slate-950 bg-slate-950 text-white dark:border-slate-800 dark:bg-slate-950"
                : "border-blue-200 bg-blue-600 text-white dark:border-blue-500/20 dark:bg-blue-600",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                  {countdownData.label}
                </p>
                <p
                  className={cn(
                    "mt-2 text-3xl font-semibold tabular-nums tracking-tight",
                    countdownData.type === "LIVE" && countdownData.isCritical && "text-amber-300",
                  )}
                >
                  {countdownData.h}:{countdownData.m}:{countdownData.s}
                </p>
              </div>
              <Badge className="border-none bg-white/10 text-white">
                {countdownData.type === "LIVE" ? "Sesi berjalan" : "Menunggu mulai"}
              </Badge>
            </div>
            {countdownData.type === "LIVE" && countdownData.isCritical ? (
              <p className="mt-3 text-sm text-amber-100">Waktu hampir habis.</p>
            ) : null}
          </Card>
        ) : null}

        {paymentNotice ? (
          <NoticeCard tone="emerald">{paymentNotice}</NoticeCard>
        ) : null}

        {liveNotice ? <NoticeCard tone="amber">{liveNotice}</NoticeCard> : null}

        {shouldShowActivation ? (
          <Card className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Aktivasi sesi
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {!hasPaidDp
                    ? "Bayar DP dulu."
                    : !isTimeReached
                      ? "Belum masuk jam mulai."
                      : "Siap diaktifkan."}
                </p>
              </div>
              <Badge className="border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {hasPaidDp ? "Siap" : "Tertahan"}
              </Badge>
            </div>
            <Button
              onClick={handleActivateSession}
              disabled={activating || !hasPaidDp || !isTimeReached}
              className="mt-4 h-12 w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-white/10"
            >
              <Zap className="mr-2 h-4 w-4" />
              {activating ? "Mengaktifkan..." : "Aktifkan"}
            </Button>
          </Card>
        ) : null}

        <Card className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Kontrol live
              </p>
            </div>
            <Badge className={cn("border-none", isActiveStatus ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200")}>
              {isActiveStatus ? "Aktif" : "Belum aktif"}
            </Badge>
          </div>

          <BookingLiveController
            active={isActiveStatus}
            booking={booking}
            menuItems={menuItems}
            addonItems={booking?.resource_addons || []}
            onExtend={handleExtend}
            onOrderFnb={handleAddFnb}
            onOrderAddon={handleAddons}
            onComplete={handleCompleteSession}
          />
        </Card>

        <Card className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Pembayaran
              </p>
            </div>
            <Badge className={cn("border-none", paymentStateTone)}>{paymentLabel}</Badge>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniStat
              icon={ReceiptText}
              label="Total"
              value={`Rp ${Number(booking.grand_total || 0).toLocaleString("id-ID")}`}
            />
            <MiniStat
              icon={Wallet}
              label="Dibayar"
              value={`Rp ${paidAmount.toLocaleString("id-ID")}`}
            />
            <MiniStat
              icon={CreditCard}
              label="Sisa"
              value={`Rp ${balanceDue.toLocaleString("id-ID")}`}
            />
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
            {paymentGuidance}
          </div>

          {paymentStatus === "awaiting_verification" && pendingManualSettlementAttempt ? (
            <div className="mt-3 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
              Pelunasan menunggu verifikasi. Ref {pendingManualSettlementAttempt.reference_code}.
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              onClick={() => router.push(`/user/me/bookings/${booking.id}/payment?scope=deposit`)}
              disabled={depositAmount <= 0 || paymentStatus !== "pending"}
              className="h-auto min-h-[78px] flex-col items-start justify-between rounded-2xl bg-blue-600 px-4 py-3 text-left text-white hover:bg-blue-500"
            >
              <Wallet className="h-4 w-4" />
              <span className="text-sm font-semibold">Bayar DP</span>
            </Button>
            <Button
              onClick={() => router.push(`/user/me/bookings/${booking.id}/payment?scope=settlement`)}
              disabled={sessionStatus !== "completed" || balanceDue <= 0}
              variant="outline"
              className="h-auto min-h-[78px] flex-col items-start justify-between rounded-2xl px-4 py-3 text-left"
            >
              <CreditCard className="h-4 w-4" />
              <span className="text-sm font-semibold">Pelunasan</span>
            </Button>
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Ringkasan booking
              </p>
            </div>
            <Badge className="border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
              {groupedOptions.length + groupedOrders.length} item
            </Badge>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Wallet className="h-4 w-4 text-blue-600" />
                Rental & add-on
              </div>
              {groupedOptions.length ? (
                groupedOptions.map((opt: any) => (
                  <LineRow
                    key={`${opt.item_name}-${opt.item_type}`}
                    title={opt.item_name}
                    subtitle={`${opt.quantity} ${opt.item_type.includes("main") ? getUnitLabel(booking.unit_duration) : "unit"} · Rp ${Number(opt.unitPrice || 0).toLocaleString("id-ID")}`}
                    value={`Rp ${Number(opt.totalPrice || 0).toLocaleString("id-ID")}`}
                  />
                ))
              ) : (
                <EmptyState label="Belum ada item rental atau add-on tambahan." />
              )}
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-white/10">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <UtensilsCrossed className="h-4 w-4 text-orange-500" />
                Pesanan F&B
              </div>
              {groupedOrders.length ? (
                groupedOrders.map((order: any) => (
                  <LineRow
                    key={String(order.item_name || "").toLowerCase()}
                    title={order.item_name}
                    subtitle={`${order.quantity} porsi · Rp ${Number(order.price_at_purchase || 0).toLocaleString("id-ID")}`}
                    value={`Rp ${Number(order.subtotal || 0).toLocaleString("id-ID")}`}
                  />
                ))
              ) : (
                <EmptyState label="Belum ada pesanan F&B." />
              )}
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Timeline
              </p>
            </div>
            <Badge className="border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
              {booking.events?.length || 0} event
            </Badge>
          </div>

          <div className="space-y-2">
            {(booking.events || []).length ? (
              booking.events.map((event: any) => (
                <div
                  key={event.id}
                  className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">
                        {event.title || event.event_type}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {event.description || event.event_type}
                      </p>
                    </div>
                    <Badge className="border-none bg-white text-slate-600 dark:bg-white/10 dark:text-slate-200">
                      {event.actor_type}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    {event.created_at
                      ? format(parseISO(event.created_at), "dd MMM yyyy, HH:mm", { locale: idLocale })
                      : "-"}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState label="Timeline belum tersedia untuk booking ini." />
            )}
          </div>
        </Card>

        <Button
          variant="outline"
          className="h-12 w-full rounded-2xl"
          onClick={() => window.print()}
        >
          Simpan sebagai PDF
        </Button>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function NoticeCard({
  tone,
  children,
}: {
  tone: "emerald" | "amber";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
        tone === "emerald" &&
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
        tone === "amber" &&
          "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100",
      )}
    >
      {children}
    </div>
  );
}

function LineRow({
  title,
  subtitle,
  value,
}: {
  title: string;
  subtitle: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
      {label}
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Skeleton className="h-10 rounded-[1.25rem]" />
      <Skeleton className="h-40 rounded-[1.5rem]" />
      <Skeleton className="h-28 rounded-[1.5rem]" />
      <Skeleton className="h-48 rounded-[1.5rem]" />
      <Skeleton className="h-56 rounded-[1.5rem]" />
    </div>
  );
}
