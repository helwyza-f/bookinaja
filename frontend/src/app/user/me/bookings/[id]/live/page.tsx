/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  MapPin,
  Zap,
  ReceiptText,
  CalendarDays,
  UtensilsCrossed,
  PlusCircle,
  Copy,
  CheckCircle2,
  Share2,
  Clock,
  CreditCard,
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
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(new Date());
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [midtransReady, setMidtransReady] = useState(false);
  const [activating, setActivating] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const lastRealtimeToastRef = useRef("");
  const hasLoadedRef = useRef(false);
  const detailRefreshTimerRef = useRef<number | null>(null);
  const liveRefreshTimerRef = useRef<number | null>(null);

  const resolveCustomerId = (payload: any) => {
    return String(
      payload?.customer?.id ||
        payload?.customer_id ||
        payload?.id ||
        "",
    );
  };

  const fetchDetail = useCallback(async (mode: "initial" | "background" = "initial") => {
    const background = mode === "background" && hasLoadedRef.current;
    try {
      if (background) {
        setRefreshing(true);
      }
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
      const menuRes = await api.get("/customer/fnb", { params: { slug } });
      setMenuItems(menuRes.data || []);
    } catch {
      setMenuItems([]);
    }
  }, []);

  const fetchLiveContext = useCallback(async () => {
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
      if (message) {
        setLiveNotice(message);
      }
    }
  }, [params.id]);

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
            (error as { response?: { data?: { error?: string } } })?.response?.data
              ?.error || "Gagal memverifikasi akses booking";
          toast.error(message);
          router.replace("/user/login");
          return;
        }
      }

      if (cancelled) return;

      const detail = await fetchDetail("initial");
      try {
        const meRes = await api.get("/me");
        if (!cancelled) {
          setCustomerId(resolveCustomerId(meRes.data));
        }
      } catch {
        if (!cancelled) {
          setCustomerId("");
        }
      }
      const currentSlug = detail?.tenant_slug;
      if (currentSlug) {
        await fetchMenuItems(currentSlug);
      } else {
        // Fallback or retry
        setTimeout(() => fetchMenuItems(booking?.tenant_slug), 2000);
      }
      await fetchLiveContext();

      if (cancelled) return;

      const clock = setInterval(() => setNow(new Date()), 1000);
      return () => {
        clearInterval(clock);
      };
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
        } else if (event.type === "payment.settlement.paid" || event.type === "payment.cash.settled") {
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

  useEffect(() => {
    if (window.snap) {
      setMidtransReady(true);
    }
  }, []);

  const isActiveStatus = useMemo(
    () => booking?.status === "active" || booking?.status === "ongoing",
    [booking],
  );

  const depositAmount = Number(booking?.deposit_amount || 0);
  const balanceDue = Number(booking?.balance_due || 0);
  const paidAmount = Number(booking?.paid_amount || 0);
  const paymentStatus = (booking?.payment_status || "").toLowerCase();
  const sessionStatus = (booking?.status || "").toLowerCase();
  const paymentLabel = useMemo(() => {
    if (paymentStatus === "settled") return "Lunas";
    if (paymentStatus === "partial_paid") return "DP Masuk";
    if (paymentStatus === "paid") return balanceDue > 0 ? "DP Masuk" : "Lunas";
    if (paymentStatus === "pending") return "Menunggu DP";
    if (paymentStatus === "expired") return "DP Kadaluarsa";
    if (paymentStatus === "failed") return "Gagal Bayar";
    return "Belum Dibayar";
  }, [paymentStatus, balanceDue]);
  const paymentStateTone =
    paymentStatus === "settled" ||
    (paymentStatus === "paid" && balanceDue === 0)
      ? "bg-emerald-500 text-white"
      : paymentStatus === "partial_paid" || paymentStatus === "paid"
        ? "bg-blue-600 text-white"
        : paymentStatus === "expired" || paymentStatus === "failed"
          ? "bg-red-500 text-white"
          : "bg-orange-500 text-white";

  const countdownData = useMemo(() => {
    if (!booking) return null;
    const start = parseISO(booking.start_time);
    const end = parseISO(booking.end_time);

    if (isActiveStatus) {
      const diff = differenceInSeconds(end, now);
      return {
        type: "LIVE",
        label: "Sisa Waktu Sesi",
        h: String(Math.max(0, Math.floor(diff / 3600))).padStart(2, "0"),
        m: String(Math.max(0, Math.floor((diff % 3600) / 60))).padStart(2, "0"),
        s: String(Math.max(0, diff % 60)).padStart(2, "0"),
        isCritical: diff < 300,
      };
    }

    if (
      now < start &&
      !["completed", "cancelled", "active", "ongoing"].includes(booking.status)
    ) {
      const diff = differenceInSeconds(start, now);
      return {
        type: "WAITING",
        label: "Sesi Dimulai Dalam",
        h: String(Math.floor(diff / 3600)).padStart(2, "0"),
        m: String(Math.floor((diff % 3600) / 60)).padStart(2, "0"),
        s: String(diff % 60).padStart(2, "0"),
      };
    }
    return null;
  }, [booking, now, isActiveStatus]);
  const isLiveSession = countdownData?.type === "LIVE";
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
      toast.success("Tautan Berhasil Disalin", {
        description: "Simpan tautan ini untuk akses instan ke e-tiket Anda.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getUnitLabel = (duration: number) => {
    if (duration === 60) return "Jam";
    return "Sesi";
  };

  const handlePayBooking = async (mode: "dp" | "settlement") => {
    try {
      const res = await api.post(
        `/public/bookings/${params.id}/checkout?mode=${mode}&slug=${booking.tenant_slug}`,
      );
      const snap = await waitForSnap();
      if (!snap) return;
      snap.pay(res.data.snap_token, {
        onSuccess: () => {
          setPaymentNotice(
            mode === "dp"
              ? "DP sudah dibayar. Sistem sedang memperbarui status booking."
              : "Pelunasan sudah dibayar. Sistem sedang memperbarui status booking.",
          );
          toast.success(mode === "dp" ? "DP berhasil dibayar" : "Pelunasan berhasil dibayar");
          fetchDetail();
          setTimeout(fetchDetail, 4000);
        },
        onPending: () => {
          setPaymentNotice("Pembayaran masih menunggu konfirmasi Midtrans.");
          toast.message("Pembayaran tertunda");
          fetchDetail();
        },
        onError: () => {
          setPaymentNotice("Pembayaran gagal atau dibatalkan.");
          toast.error("Pembayaran gagal");
        },
        onClose: () => fetchDetail(),
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal membuka pembayaran");
    }
  };

  const handleActivateSession = async () => {
    setActivating(true);
    try {
      await api.post(`/user/me/bookings/${params.id}/activate`);
      setPaymentNotice("Sesi berhasil diaktifkan manual.");
      toast.success("Sesi berhasil diaktifkan");
      await fetchDetail();
      await fetchLiveContext();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal mengaktifkan sesi");
    } finally {
      setActivating(false);
    }
  };

  const waitForSnap = async () => {
    if (window.snap) return window.snap;
    const started = Date.now();
    while (Date.now() - started < 5000) {
      if (window.snap) return window.snap;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const injected = await loadMidtransSnap();
    if (injected) return injected;
    toast.error("Midtrans belum siap. Coba tunggu sebentar lalu ulangi.");
    return null;
  };

  const loadMidtransSnap = async () => {
    if (window.snap) return window.snap;
    if (typeof window === "undefined") return null;

    const existing = (window as any).__midtransSnapPromise as Promise<any> | undefined;
    if (existing) return existing;

    const promise = new Promise<any>((resolve) => {
      const script = document.createElement("script");
      script.src =
        (
          process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || ""
        ).toLowerCase() === "true"
          ? "https://app.midtrans.com/snap/snap.js"
          : "https://app.sandbox.midtrans.com/snap/snap.js";
      script.setAttribute(
        "data-client-key",
        process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "",
      );
      script.async = true;
      script.onload = () => resolve(window.snap || null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });

    (window as any).__midtransSnapPromise = promise;
    return promise;
  };

  const handleAddFnb = async (cartItems: any[]) => {
    for (const item of cartItems) {
      await api.post(`/user/me/bookings/${params.id}/orders`, {
        fnb_item_id: item.id,
        quantity: item.quantity,
      });
    }
    toast.success("Pesanan FnB ditambahkan");
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
    toast.success("Addon ditambahkan");
    await fetchDetail();
  };

  const handleExtend = async (count: number) => {
    await api.post(`/user/me/bookings/${params.id}/extend`, {
      additional_duration: count,
    });
    toast.success("Session diperpanjang");
    await fetchDetail();
  };

  const handleCompleteSession = async () => {
    try {
      await api.post(`/user/me/bookings/${params.id}/complete`);
      setPaymentNotice("Sesi telah diakhiri. Silakan cek detail pelunasan di bawah.");
      toast.success("Sesi berhasil diakhiri");
      await fetchDetail();
      await fetchLiveContext();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal mengakhiri sesi");
    }
  };

  if (loading) return <TicketSkeleton />;

  const isPending = sessionStatus === "pending";
  const hasPaidDp = paymentStatus === "partial_paid" || paymentStatus === "paid" || paymentStatus === "settled" || depositAmount === 0;
  const isTimeReached = now >= new Date(booking?.start_time || "");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] font-plus-jakarta pb-24 transition-colors overflow-x-hidden">
      <Script
        src={
          (
            process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || ""
          ).toLowerCase() === "true"
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js"
        }
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
        onLoad={() => setMidtransReady(true)}
        onError={() => setMidtransReady(false)}
      />
      <nav className="h-16 flex items-center justify-between px-4 sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b dark:border-white/5">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => router.push("/user/me")}
        >
          <ChevronLeft size={20} />
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 italic leading-none">
            E-Tiket Digital
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 leading-none">
            REF: {booking.id.slice(0, 8)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={copyMagicLink}
        >
          {copied ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : (
            <Copy size={18} className="text-slate-400" />
          )}
        </Button>
      </nav>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <RealtimePill connected={realtimeConnected} status={realtimeStatus} className="normal-case tracking-normal" />
          {refreshing ? (
            <Badge className="border-none bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 text-[9px] font-bold">
              Refreshing...
            </Badge>
          ) : null}
        </div>
        {/* TIMER CONTROLLER */}
        {countdownData && (
          <Card
            className={cn(
              "border-none rounded-[2rem] overflow-hidden shadow-2xl p-6 text-white transition-all duration-500",
              countdownData.type === "LIVE" ? "bg-slate-950" : "bg-blue-600",
            )}
          >
            <div className="flex justify-between items-start ">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  {countdownData.label}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      "text-4xl font-[1000] italic tabular-nums tracking-tighter leading-none",
                      countdownData.type === "LIVE" &&
                        countdownData.isCritical &&
                        "text-red-500 animate-pulse",
                    )}
                  >
                    {countdownData.h}:{countdownData.m}:{countdownData.s}
                  </span>
                </div>
              </div>
              <Badge
                className={cn(
                  "text-[8px] font-black uppercase italic border-none px-3 py-1",
                  countdownData.type === "LIVE"
                    ? "bg-blue-600 animate-pulse"
                    : "bg-white text-blue-600 shadow-xl",
                )}
              >
                {countdownData.type === "LIVE"
                  ? "Sesi Berjalan"
                  : "Masa Tunggu"}
              </Badge>
            </div>
          </Card>
        )}

        {isLiveSession && countdownData && countdownData.isCritical && (
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/10 p-4 text-[11px] font-bold text-amber-700 dark:text-amber-200 animate-pulse">
            ⚠️ Waktu sesi hampir habis (kurang dari 5 menit). Segera perpanjang sesi jika diperlukan.
          </div>
        )}

        <Card className="rounded-[2rem] border-none shadow-sm ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-[#0c0c0c] p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                Live Controller
              </p>
              <p className="mt-1 text-sm font-[1000] italic text-slate-900 dark:text-white">
                Kontrol sesi aktif, F&B, dan add-on
              </p>
            </div>
            <Badge
              className={cn(
                "border-none px-3 py-1 text-[8px] font-black uppercase italic",
                isLiveSession ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200",
              )}
            >
              {isLiveSession ? "aktif" : "belum aktif"}
            </Badge>
          </div>

          {!isLiveSession && sessionStatus !== "completed" && sessionStatus !== "cancelled" && (
            <div className={cn("rounded-2xl border p-4 space-y-3",
              !hasPaidDp ? "border-amber-500/15 bg-amber-500/10" :
              !isTimeReached ? "border-blue-500/15 bg-blue-500/10" :
              "border-emerald-500/15 bg-emerald-500/10"
            )}>
              <p className={cn("text-[11px] font-bold leading-relaxed",
                !hasPaidDp ? "text-amber-700 dark:text-amber-200" :
                !isTimeReached ? "text-blue-700 dark:text-blue-200" :
                "text-emerald-700 dark:text-emerald-200"
              )}>
                {!hasPaidDp 
                  ? "⚠️ Selesaikan pembayaran DP terlebih dahulu untuk bisa mengaktifkan sesi ini."
                  : !isTimeReached 
                    ? "🕒 Waktu sesi belum dimulai. Aktivasi tetap dilakukan manual saat jam mulai sudah tiba." 
                    : "✅ Waktu sesi telah tiba! Aktifkan sesi sekarang jika Anda sudah siap."}
              </p>
              <Button
                onClick={handleActivateSession}
                disabled={activating || !hasPaidDp || !isTimeReached}
                className={cn(
                  "h-12 w-full rounded-2xl text-white font-[1000] uppercase italic tracking-widest text-xs gap-2 shadow-sm transition-all",
                  (!hasPaidDp || !isTimeReached)
                    ? "bg-slate-300 dark:bg-white/10 text-slate-500 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500"
                )}
              >
                <Zap size={15} />
                {activating ? "Mengaktifkan..." : "Aktifkan Sesi Sekarang"}
              </Button>
            </div>
          )}

          {sessionStatus === "completed" && (
            <div className="rounded-2xl border border-blue-500/15 bg-blue-500/10 p-4">
              <p className="text-[11px] font-bold text-blue-700 dark:text-blue-200 text-center">
                Sesi telah berakhir. Silakan cek detail pelunasan di bawah jika ada sisa tagihan.
              </p>
            </div>
          )}

          {liveNotice && !isLiveSession && (
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/10 px-4 py-3 text-[11px] font-bold text-amber-700 dark:text-amber-200">
              {liveNotice}
            </div>
          )}

          <BookingLiveController
            active={isLiveSession}
            booking={booking}
            menuItems={menuItems}
            addonItems={booking?.resource_addons || []}
            onExtend={handleExtend}
            onOrderFnb={handleAddFnb}
            onOrderAddon={handleAddons}
            onComplete={handleCompleteSession}
          />
        </Card>

        {/* UNIFIED INFO CARD */}
        <Card className="rounded-[2rem] p-0 overflow-hidden border-none shadow-sm ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-[#0c0c0c]">
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between text-left leading-none gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <MapPin size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">
                    {booking.tenant_name || "Booking Detail"}
                  </span>
                </div>
                <h3 className="text-2xl font-[1000] uppercase dark:text-white italic tracking-tighter line-clamp-2">
                  {booking.resource_name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge
                    className={cn(
                      "rounded-lg border-none font-black italic text-[9px] px-3 py-1 uppercase shadow-sm",
                      isPending
                        ? "bg-blue-600 text-white"
                        : sessionStatus === "completed"
                          ? "bg-slate-800 text-slate-400"
                          : "bg-emerald-600 text-white",
                    )}
                  >
                    sesi: {booking.status}
                  </Badge>
                  <Badge
                    className={cn(
                      "rounded-lg border-none font-black italic text-[9px] px-3 py-1 uppercase shadow-sm",
                      paymentStateTone,
                    )}
                  >
                    bayar: {paymentLabel}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t dark:border-white/5">
              <div className="space-y-1 text-left leading-none">
                <div className="flex items-center gap-1.5 opacity-40 mb-1">
                  <CalendarDays size={12} />
                  <span className="text-[9px] font-black uppercase italic tracking-widest">
                    Tanggal
                  </span>
                </div>
                <p className="text-xs font-black dark:text-white uppercase italic">
                  {format(parseISO(booking.start_time), "dd MMMM yyyy", {
                    locale: idLocale,
                  })}
                </p>
              </div>
              <div className="space-y-1 border-l dark:border-white/5 pl-4 text-left leading-none">
                <div className="flex items-center gap-1.5 opacity-40 mb-1">
                  <Clock size={12} />
                  <span className="text-[9px] font-black uppercase italic tracking-widest">
                    Waktu Sesi
                  </span>
                </div>
                <p className="text-xs font-black dark:text-white uppercase italic">
                  {format(parseISO(booking.start_time), "HH:mm")} —{" "}
                  {format(parseISO(booking.end_time), "HH:mm")}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-[2rem] border-none bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-[#0c0c0c] dark:ring-white/5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                Timeline
              </p>
              <p className="mt-1 text-sm font-[1000] italic text-slate-900 dark:text-white">
                Aktivitas booking kamu
              </p>
            </div>
            <Badge className="border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200 text-[8px] font-black uppercase italic">
              {booking.events?.length || 0} event
            </Badge>
          </div>
          <div className="space-y-3">
            {(booking.events || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-center text-[11px] font-bold text-slate-400 dark:border-white/10">
                Timeline belum tersedia untuk booking lama.
              </div>
            ) : (
              booking.events.map((event: any) => (
                <div key={event.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-950 dark:text-white">{event.title || event.event_type}</p>
                      <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">{event.description || event.event_type}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase text-slate-500 dark:bg-white/10">
                      {event.actor_type}
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-slate-400">
                    {event.created_at ? format(parseISO(event.created_at), "dd MMM yyyy, HH:mm", { locale: idLocale }) : "-"}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-[#0c0c0c] p-4 space-y-4">
          <div className="flex items-center gap-2">
            <ReceiptText size={16} className="text-blue-600" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                Pembayaran Booking
              </p>
              <p className="mt-1 text-sm font-[1000] italic text-slate-900 dark:text-white">
                {depositAmount > 0
                  ? "Booking ini memakai flow DP"
                  : "Booking ini bisa langsung bayar di akhir sesi"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-4">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">
                Total
              </p>
              <p className="mt-2 text-sm font-[1000] italic text-slate-950 dark:text-white">
                Rp {Number(booking.grand_total || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-4">
              <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 italic">
                DP
              </p>
              <p className="mt-2 text-sm font-[1000] italic text-emerald-600">
                Rp {depositAmount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 text-white border border-slate-800 p-4">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">
                Status
              </p>
              <p className="mt-2 text-sm font-[1000] italic">
                {paymentLabel}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/5 px-4 py-3 text-[11px] font-bold leading-relaxed text-slate-700 dark:text-slate-200">
            {depositAmount > 0
              ? paymentStatus === "pending"
                ? `Bayar DP dulu sebesar Rp ${depositAmount.toLocaleString()} supaya booking bisa masuk ke flow aktivasi sesi.`
                : `DP sudah tercatat. Sisa pembayaran akan muncul terpisah di bagian pelunasan setelah rincian item.`
              : "Booking ini tidak membutuhkan DP. Pelunasan dilakukan dari tagihan akhir sesi."}
          </div>

          {paymentStatus === "pending" && depositAmount > 0 && (
            <Button
              onClick={() => handlePayBooking("dp")}
              disabled={!midtransReady}
              className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:text-slate-600 text-white font-[1000] uppercase italic tracking-widest text-sm shadow-lg gap-2"
            >
              <CreditCard size={16} />
              {midtransReady ? "Bayar DP Booking" : "Menyiapkan Midtrans..."}
            </Button>
          )}

          {paymentNotice && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/15 px-4 py-3 text-[11px] font-bold text-emerald-700 dark:text-emerald-200">
              {paymentNotice}
            </div>
          )}
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-[#0c0c0c] p-4 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle size={16} className="text-blue-600" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                  Rental & Add-ons
                </p>
              </div>
              <Badge className="border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200 text-[8px] font-black uppercase italic">
                {groupedOptions.length} item
              </Badge>
            </div>

            {groupedOptions.map((opt: any) => (
              <div
                key={`${opt.item_name}-${opt.item_type}`}
                className="flex justify-between items-start gap-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.03] p-4"
              >
                <div className="min-w-0">
                  <p className="font-black text-[11px] dark:text-white uppercase leading-none italic tracking-tight">
                    {opt.item_name}
                  </p>
                  <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase">
                    {opt.quantity} {opt.item_type.includes("main") ? getUnitLabel(booking.unit_duration) : "unit"} x Rp {Number(opt.unitPrice || 0).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs font-[1000] dark:text-white italic pt-1 whitespace-nowrap">
                  Rp {Number(opt.totalPrice || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t dark:border-white/5 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={16} className="text-orange-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                  Rental F&B
                </p>
              </div>
              <Badge className="border-none bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-200 text-[8px] font-black uppercase italic">
                {groupedOrders.length} item
              </Badge>
            </div>

            {groupedOrders.length > 0 ? (
              groupedOrders.map((order: any) => (
                <div
                  key={String(order.item_name || "").toLowerCase()}
                  className="flex justify-between items-start gap-4 rounded-2xl border border-orange-500/10 bg-orange-50/40 dark:bg-orange-500/[0.03] p-4"
                >
                  <div className="min-w-0">
                    <p className="font-black text-[11px] dark:text-white uppercase leading-none italic tracking-tight">
                      {order.item_name}
                    </p>
                    <p className="mt-2 text-[10px] font-bold text-orange-600/70 uppercase">
                      {order.quantity} porsi x Rp {Number(order.price_at_purchase || 0).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs font-[1000] text-orange-600 italic pt-1 whitespace-nowrap">
                    Rp {Number(order.subtotal || 0).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 px-4 py-6 text-center text-[11px] font-bold text-slate-400">
                Belum ada pesanan F&B
              </div>
            )}
          </div>

          <div className="space-y-4 border-t dark:border-white/5 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                  Pelunasan Sesi
                </p>
                <p className="mt-1 text-sm font-[1000] italic text-slate-900 dark:text-white">
                  Bayar settlement di bagian paling bawah
                </p>
              </div>
              <Badge className={cn("border-none px-3 py-1 text-[8px] font-black uppercase italic", paymentStateTone)}>
                {paymentLabel}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-4">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">
                  Dibayar
                </p>
                <p className="mt-2 text-sm font-[1000] italic text-slate-950 dark:text-white">
                  Rp {paidAmount.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl bg-blue-500/5 border border-blue-500/10 p-4">
                <p className="text-[8px] font-black uppercase tracking-widest text-blue-600 italic">
                  Sisa
                </p>
                <p className="mt-2 text-sm font-[1000] italic text-blue-600">
                  Rp {balanceDue.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950 text-white border border-slate-800 p-4">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">
                  Total
                </p>
                <p className="mt-2 text-sm font-[1000] italic">
                  Rp {Number(booking.grand_total || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {sessionStatus === "completed" ? (
              (paymentStatus === "partial_paid" || (paymentStatus === "paid" && balanceDue > 0)) ? (
                <Button
                  onClick={() => handlePayBooking("settlement")}
                  disabled={!midtransReady}
                  className="w-full h-14 rounded-2xl bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-600 text-white font-[1000] uppercase italic tracking-widest text-sm shadow-lg gap-2"
                >
                  <CreditCard size={16} />
                  {midtransReady ? "Bayar Settlement" : "Menyiapkan Midtrans..."}
                </Button>
              ) : (
                <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/5 px-4 py-3 text-[11px] font-bold leading-relaxed text-slate-700 dark:text-slate-200">
                  {balanceDue > 0
                    ? "Settlement akan tersedia setelah DP tercatat."
                    : "Tidak ada sisa pembayaran untuk sesi ini."}
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-blue-500/15 bg-blue-500/10 px-4 py-3 text-[11px] font-bold leading-relaxed text-blue-700 dark:text-blue-200 text-center">
                🕒 Tombol pelunasan akan muncul setelah sesi berakhir.
              </div>
            )}
          </div>
        </Card>

        {/* BOTTOM ACTIONS */}
        <div className="rounded-[2rem] bg-white dark:bg-[#0c0c0c] border dark:border-white/5 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic mb-1">
              Quick Actions
            </span>
            <p className="text-xs font-bold italic text-slate-700 dark:text-slate-200 leading-relaxed">
              PDF tetap tersedia dari halaman ini.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:text-white text-[10px] font-black uppercase italic gap-2 tracking-widest hover:bg-slate-100 transition-all"
            onClick={() => window.print()}
          >
            <Share2 size={16} /> PDF
          </Button>
        </div>
      </main>
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] p-4 space-y-6">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/5" />
          <Skeleton className="h-6 w-32 rounded-lg bg-slate-200 dark:bg-white/5" />
          <Skeleton className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/5" />
        </div>
        <Skeleton className="h-64 w-full rounded-[2rem] bg-slate-200 dark:bg-white/5" />
        <Skeleton className="h-64 w-full rounded-[2rem] bg-slate-200 dark:bg-white/5" />
        <Skeleton className="h-48 w-full rounded-[2rem] bg-slate-200 dark:bg-white/5" />
      </div>
    </div>
  );
}
