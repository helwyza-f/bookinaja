"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  MonitorPlay,
  ChevronRight,
  User as UserIcon,
  Search,
  RefreshCw,
  Timer,
  Wallet,
  AlertTriangle,
  PanelRightOpen,
  ChevronLeft,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hasPermission, isOwner } from "@/lib/admin-access";
import { useRealtime } from "@/lib/realtime/use-realtime";
import {
  tenantBookingsChannel,
  tenantDashboardChannel,
} from "@/lib/realtime/channels";
import {
  BOOKING_EVENT_PREFIXES,
  matchesRealtimePrefix,
} from "@/lib/realtime/event-types";
import {
  POSControlHub,
  type POSSessionDetail,
} from "@/components/pos/pos-control-hub";
import type { FnBMenuItem } from "@/components/pos/fnb-catalog-dialog";
import { format, differenceInMinutes } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
import { useAdminSession } from "@/components/dashboard/admin-session-context";

type POSBooking = {
  id: string;
  resource_name?: string;
  customer_name?: string;
  customer_phone?: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  status?: string;
  payment_status?: string;
  balance_due?: number;
  grand_total?: number;
  total_resource?: number;
  total_fnb?: number;
  deposit_amount?: number;
  created_at?: string;
};

type QueueSectionTone = "danger" | "warning" | "neutral" | "info";

const ACTION_PREVIEW_LIMIT = 6;

const needsSettlement = (
  session: Pick<POSBooking, "status" | "payment_status" | "balance_due">,
) => {
  const status = String(session.status || "").toLowerCase();
  const paymentStatus = String(session.payment_status || "").toLowerCase();
  const balanceDue = Number(session.balance_due || 0);
  return (
    status === "completed" &&
    (balanceDue > 0 ||
      ["pending", "partial_paid", "unpaid", "failed", "expired"].includes(
        paymentStatus,
      ))
  );
};

function POSControlSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white font-plus-jakarta dark:bg-slate-950">
      <div className="shrink-0 space-y-4 border-b border-slate-200 px-4 py-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-white/5" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-slate-100 dark:bg-white/5" />
            <Skeleton className="h-3 w-24 bg-slate-100 dark:bg-white/5" />
          </div>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <Skeleton className="h-28 w-full rounded-xl dark:bg-slate-900" />
        <Skeleton className="h-28 w-full rounded-xl dark:bg-slate-900" />
        <Skeleton className="h-28 w-full rounded-xl dark:bg-slate-900" />
      </div>
    </div>
  );
}

function getBookingTotal(booking: POSBooking) {
  if (typeof booking.grand_total === "number") return Number(booking.grand_total || 0);
  return Number(booking.total_resource || 0) + Number(booking.total_fnb || 0);
}

function getActionHint(booking: POSBooking, now: Date) {
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const remaining = differenceInMinutes(new Date(booking.end_time), now);

  if (paymentStatus === "awaiting_verification") {
    return "Review bukti bayar";
  }
  if (needsSettlement(booking)) {
    return "Tutup pelunasan";
  }
  if (status === "active" || status === "ongoing") {
    if (remaining <= 0) return "Akhiri atau tagih";
    if (remaining <= 15) return "Pantau sesi";
    return "Buka kontrol sesi";
  }
  if (status === "pending") return "Cek status booking";
  if (status === "confirmed") return "Siapkan sesi";
  return "Lihat detail";
}

function getQueueTone(booking: POSBooking, now: Date): QueueSectionTone {
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const remaining = differenceInMinutes(new Date(booking.end_time), now);

  if (paymentStatus === "awaiting_verification" || needsSettlement(booking)) {
    return "danger";
  }
  if ((status === "active" || status === "ongoing") && remaining <= 15) {
    return remaining <= 0 ? "danger" : "warning";
  }
  if (status === "pending" || status === "confirmed") {
    return "info";
  }
  return "neutral";
}

function isAttentionBooking(booking: POSBooking, now: Date) {
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const remaining = differenceInMinutes(new Date(booking.end_time), now);

  return (
    paymentStatus === "awaiting_verification" ||
    needsSettlement(booking) ||
    ((status === "active" || status === "ongoing") && remaining <= 15) ||
    ["failed", "expired"].includes(paymentStatus)
  );
}

function isWaitingBooking(booking: POSBooking, now: Date) {
  const status = String(booking.status || "").toLowerCase();
  if (!["pending", "confirmed"].includes(status)) return false;
  const startDiff = differenceInMinutes(new Date(booking.start_time), now);
  return startDiff <= 360;
}

function isUpcomingBooking(booking: POSBooking, now: Date) {
  const status = String(booking.status || "").toLowerCase();
  if (!["pending", "confirmed"].includes(status)) return false;
  const startDiff = differenceInMinutes(new Date(booking.start_time), now);
  return startDiff > 360;
}

function getRelativeBookingWindow(booking: POSBooking, now: Date) {
  const status = String(booking.status || "").toLowerCase();
  if (status === "active" || status === "ongoing") {
    const remaining = differenceInMinutes(new Date(booking.end_time), now);
    if (remaining <= 0) return "Waktu habis";
    if (remaining < 60) return `${remaining} menit lagi`;
    return `${Math.floor(remaining / 60)}j ${remaining % 60}m lagi`;
  }

  const untilStart = differenceInMinutes(new Date(booking.start_time), now);
  if (untilStart <= 0) return "Siap ditangani";
  if (untilStart < 60) return `${untilStart} menit lagi`;
  if (untilStart < 1440) return `${Math.floor(untilStart / 60)}j ${untilStart % 60}m lagi`;
  return format(new Date(booking.start_time), "dd MMM, HH:mm");
}

function compareByCreatedOrStartDesc(a: POSBooking, b: POSBooking) {
  const aTime = new Date(a.created_at || a.start_time).getTime();
  const bTime = new Date(b.created_at || b.start_time).getTime();
  return bTime - aTime;
}

function compareByStartAsc(a: POSBooking, b: POSBooking) {
  return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
}

function QueueStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
        {hint}
      </div>
    </Card>
  );
}

function QueueSection({
  title,
  description,
  items,
  emptyMessage,
  now,
  selectedId,
  onOpen,
}: {
  title: string;
  description: string;
  items: POSBooking[];
  emptyMessage: string;
  now: Date;
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          >
            {items.length}
          </Badge>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-white/10">
        {items.length > 0 ? (
          items.map((booking) => (
            <button
              key={booking.id}
              type="button"
              onClick={() => onOpen(booking.id)}
              className={cn(
                "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]",
                selectedId === booking.id && "bg-[var(--bookinaja-50)] dark:bg-[color:rgba(59,130,246,0.12)]",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      getQueueTone(booking, now) === "danger"
                        ? "bg-red-500"
                        : getQueueTone(booking, now) === "warning"
                          ? "bg-amber-500"
                          : getQueueTone(booking, now) === "info"
                            ? "bg-blue-500"
                            : "bg-slate-300",
                    )}
                  />
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {booking.customer_name || "Customer"}
                  </p>
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {(booking.resource_name || "Unit")} |{" "}
                  {formatTenantTime(
                    booking.start_time,
                    booking.timezone || "Asia/Jakarta",
                    "dd MMM, HH:mm",
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    className={cn(
                      "rounded-full border-none px-2 py-1 text-[10px] font-semibold",
                      getQueueTone(booking, now) === "danger"
                        ? "bg-red-500 text-white"
                        : getQueueTone(booking, now) === "warning"
                          ? "bg-amber-500 text-white"
                          : getQueueTone(booking, now) === "info"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
                    )}
                  >
                    {getActionHint(booking, now)}
                  </Badge>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {getRelativeBookingWindow(booking, now)}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  Rp{new Intl.NumberFormat("id-ID").format(getBookingTotal(booking))}
                </div>
                {Number(booking.balance_due || 0) > 0 ? (
                  <div className="mt-1 text-[11px] text-amber-600">
                    Sisa Rp{new Intl.NumberFormat("id-ID").format(Number(booking.balance_due || 0))}
                  </div>
                ) : null}
                <ChevronRight className="ml-auto mt-2 h-4 w-4 text-slate-300" />
              </div>
            </button>
          ))
        ) : (
          <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
            {emptyMessage}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function POSPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeId = searchParams.get("active");
  const { user: adminUser } = useAdminSession();
  const tenantId = adminUser?.tenant_id || "";

  const [bookings, setBookings] = useState<POSBooking[]>([]);
  const [menuItems, setMenuItems] = useState<FnBMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] =
    useState<POSSessionDetail | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);
  const [now, setNow] = useState(new Date());
  const lastRealtimeToastRef = useRef<string>("");

  const canReadBookings = hasPermission(adminUser, "bookings.read");
  const canReadPos = hasPermission(adminUser, "pos.read");
  const canOperateSession = hasPermission(adminUser, [
    "sessions.extend",
    "sessions.complete",
    "pos.order.add",
    "pos.checkout",
    "pos.cash.settle",
  ]);
  const canReadFnb = hasPermission(adminUser, "fnb.read");
  const canManageFnb = hasPermission(adminUser, [
    "fnb.create",
    "fnb.update",
    "fnb.delete",
  ]);
  const canUseReceiptActions = hasPermission(adminUser, [
    "receipts.send",
    "receipts.print",
  ]);

  const fetchData = useCallback(async () => {
    try {
      const [bookingsRes, menuRes] = await Promise.allSettled([
        canReadPos || canReadBookings ? api.get("/bookings") : Promise.resolve(null),
        canReadFnb ? api.get("/fnb") : Promise.resolve(null),
      ]);

      setBookings(
        bookingsRes.status === "fulfilled" ? bookingsRes.value?.data || [] : [],
      );
      setMenuItems(
        menuRes.status === "fulfilled" ? menuRes.value?.data || [] : [],
      );
    } catch {
      toast.error("Gagal sinkronisasi action desk");
    } finally {
      setLoading(false);
    }
  }, [canReadBookings, canReadFnb, canReadPos]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => {
      setIsDesktop(query.matches);
    };

    syncViewport();
    query.addEventListener("change", syncViewport);
    return () => query.removeEventListener("change", syncViewport);
  }, []);

  const openSessionDetail = useCallback(
    async (id: string) => {
      if (!canReadBookings) return;
      setSelectedSessionId(id);
      setSelectedSession(null);
      setIsSheetLoading(true);
      try {
        const res = await api.get(`/bookings/${id}`);
        setSelectedSession(res.data);
      } catch {
        toast.error("Detail gagal dimuat");
        setSelectedSessionId(null);
      } finally {
        setIsSheetLoading(false);
      }
    },
    [canReadBookings],
  );

  useEffect(() => {
    if (activeId && bookings.length > 0 && !selectedSessionId) {
      const exists = bookings.find((s) => s.id === activeId);
      if (exists) {
        openSessionDetail(activeId);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("active");
        router.replace(`/admin/pos?${params.toString()}`, { scroll: false });
      }
    }
  }, [
    activeId,
    bookings,
    openSessionDetail,
    selectedSessionId,
    router,
    searchParams,
  ]);

  const refreshSelectedSession = async (id: string) => {
    if (!canReadBookings) return;
    const res = await api.get(`/bookings/${id}`);
    setSelectedSession(res.data);
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id
          ? {
              ...booking,
              status: res.data.status,
              payment_status: res.data.payment_status,
              balance_due: res.data.balance_due,
              grand_total: res.data.grand_total,
            }
          : booking,
      ),
    );
  };

  const { connected: realtimeConnected, status: realtimeStatus } = useRealtime({
    enabled: Boolean(tenantId),
    channels: tenantId
      ? [tenantBookingsChannel(tenantId), tenantDashboardChannel(tenantId)]
      : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      fetchData();
      if (selectedSessionId) {
        void refreshSelectedSession(selectedSessionId);
      }
      const bookingId = String(event.refs?.booking_id || "");
      if (!selectedSessionId || bookingId !== selectedSessionId) return;
      const eventKey = `${event.type}:${bookingId}:${event.occurred_at || ""}`;
      if (lastRealtimeToastRef.current === eventKey) return;
      lastRealtimeToastRef.current = eventKey;
      if (event.type === "session.completed") {
        toast.success("Sesi dipindahkan ke status selesai");
      } else if (
        event.type === "payment.cash.settled" ||
        event.type === "payment.settlement.paid"
      ) {
        toast.success("Pembayaran booking sudah diterima");
      } else if (event.type === "payment.awaiting_verification") {
        toast.message("Ada bukti bayar yang perlu direview");
      } else if (event.type === "order.fnb.added") {
        toast.message("Pesanan F&B baru masuk");
      } else if (event.type === "order.addon.added") {
        toast.message("Add-on baru masuk");
      }
    },
    onReconnect: fetchData,
  });

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...bookings].sort(compareByStartAsc);
    if (!query) return sorted;
    return sorted.filter((booking) =>
      [booking.customer_name, booking.resource_name, booking.customer_phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [bookings, searchQuery]);

  const attentionBookings = useMemo(
    () =>
      filteredBookings
        .filter((booking) => isAttentionBooking(booking, now))
        .sort((a, b) => {
          const aPriority = getAttentionPriority(a, now);
          const bPriority = getAttentionPriority(b, now);
          if (aPriority !== bPriority) return aPriority - bPriority;
          return compareByStartAsc(a, b);
        })
        .slice(0, ACTION_PREVIEW_LIMIT),
    [filteredBookings, now],
  );

  const waitingBookings = useMemo(
    () =>
      filteredBookings
        .filter((booking) => isWaitingBooking(booking, now))
        .sort(compareByStartAsc)
        .slice(0, ACTION_PREVIEW_LIMIT),
    [filteredBookings, now],
  );

  const upcomingBookings = useMemo(
    () =>
      filteredBookings
        .filter((booking) => isUpcomingBooking(booking, now))
        .sort(compareByStartAsc)
        .slice(0, ACTION_PREVIEW_LIMIT),
    [filteredBookings, now],
  );

  const latestBookings = useMemo(
    () => [...filteredBookings].sort(compareByCreatedOrStartDesc).slice(0, ACTION_PREVIEW_LIMIT),
    [filteredBookings],
  );

  const summary = useMemo(() => {
    return {
      attention: filteredBookings.filter((booking) => isAttentionBooking(booking, now))
        .length,
      waiting: filteredBookings.filter((booking) => isWaitingBooking(booking, now))
        .length,
      upcoming: filteredBookings.filter((booking) => isUpcomingBooking(booking, now))
        .length,
      latest: filteredBookings.length,
    };
  }, [filteredBookings, now]);

  const closeMobileDetail = () => {
    setSelectedSession(null);
    setSelectedSessionId(null);
  };

  if (!isDesktop && selectedSessionId) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white font-plus-jakarta dark:bg-[#0f0f17]">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 dark:border-white/15 dark:bg-[#0f0f17]">
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobileDetail}
            className="h-10 w-10 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              Action Desk
            </p>
            <h1 className="truncate text-sm font-semibold text-slate-950 dark:text-white">
              {selectedSession?.customer_name || "Memuat booking..."}
            </h1>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {isSheetLoading ? (
            <POSControlSkeleton />
          ) : selectedSession ? (
            <POSControlHub
              session={selectedSession}
              menuItems={menuItems}
              onRefresh={refreshSelectedSession}
              canWriteBookings={canOperateSession}
              canManageFnb={canManageFnb}
              canUseReceiptActions={canUseReceiptActions && isOwner(adminUser)}
            />
          ) : (
            <POSControlSkeleton />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-360 space-y-4 px-3 pb-20 pt-4 font-plus-jakarta">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border-none bg-[var(--bookinaja-600)] text-white">
            Action Desk
          </Badge>
          <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/bookings")}
            className="h-8 rounded-lg px-3 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
          >
            Ledger booking
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari customer, WA, atau unit..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium outline-none transition focus:border-[var(--bookinaja-500)] focus:ring-4 focus:ring-[color:rgba(59,130,246,0.14)] dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="h-10 rounded-lg border-slate-200 bg-white px-4 text-sm font-medium dark:border-white/10 dark:bg-white/5"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <QueueStatCard
          label="Perlu perhatian"
          value={String(summary.attention)}
          hint="Verifikasi, overtime, atau pelunasan"
        />
        <QueueStatCard
          label="Menunggu tindakan"
          value={String(summary.waiting)}
          hint="Pending atau confirmed yang dekat jadwal"
        />
        <QueueStatCard
          label="Akan datang"
          value={String(summary.upcoming)}
          hint="Booking berikutnya yang belum dekat"
        />
        <QueueStatCard
          label="Terlihat"
          value={String(summary.latest)}
          hint="Booking hasil pencarian saat ini"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="min-w-0 space-y-4">
          {!canReadPos ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-amber-200 bg-amber-50 text-center shadow-sm dark:border-amber-500/20 dark:bg-amber-950/20">
              <AlertTriangle size={38} className="text-amber-500" />
              <h3 className="text-base font-semibold text-amber-700 dark:text-amber-200">
                Akses POS belum diberikan
              </h3>
              <p className="max-w-sm text-sm text-amber-600 dark:text-amber-300">
                Halaman ini butuh izin `pos.read` agar daftar tindakan bisa dibuka.
              </p>
            </div>
          ) : loading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Card
                  key={i}
                  className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950"
                >
                  <div className="space-y-4 p-4">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-20 w-full rounded-lg" />
                    <Skeleton className="h-20 w-full rounded-lg" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white text-center shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
              <Search size={34} className="text-slate-300" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                Booking tidak ditemukan
              </h3>
              <p className="text-sm text-slate-500">
                Coba nama customer, nomor WA, atau unit lain.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <QueueSection
                title="Perlu perhatian"
                description="Item yang sebaiknya ditangani lebih dulu."
                items={attentionBookings}
                emptyMessage="Belum ada booking yang mendesak."
                now={now}
                selectedId={selectedSessionId}
                onOpen={openSessionDetail}
              />
              <QueueSection
                title="Menunggu tindakan"
                description="Pending atau confirmed yang sudah dekat jadwal."
                items={waitingBookings}
                emptyMessage="Belum ada booking dekat jadwal yang menunggu aksi."
                now={now}
                selectedId={selectedSessionId}
                onOpen={openSessionDetail}
              />
              <QueueSection
                title="Akan datang"
                description="Antrian booking berikutnya yang belum mendesak."
                items={upcomingBookings}
                emptyMessage="Belum ada booking mendatang lain."
                now={now}
                selectedId={selectedSessionId}
                onOpen={openSessionDetail}
              />
              <QueueSection
                title="Booking terbaru"
                description="Snapshot terbaru dari booking yang masuk atau berubah."
                items={latestBookings}
                emptyMessage="Belum ada booking terbaru untuk ditampilkan."
                now={now}
                selectedId={selectedSessionId}
                onOpen={openSessionDetail}
              />
            </div>
          )}
        </div>

        <aside className="sticky top-20 hidden h-[calc(100vh-7rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block dark:border-white/15 dark:bg-[#0f0f17]">
          {isSheetLoading ? (
            <POSControlSkeleton />
          ) : selectedSession ? (
            <POSControlHub
              session={selectedSession}
              menuItems={menuItems}
              onRefresh={refreshSelectedSession}
              canWriteBookings={canOperateSession}
              canManageFnb={canManageFnb}
              canUseReceiptActions={canUseReceiptActions && isOwner(adminUser)}
              onClose={() => {
                setSelectedSession(null);
                setSelectedSessionId(null);
              }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--bookinaja-50)] text-[var(--bookinaja-600)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-200)]">
                <PanelRightOpen className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Pilih booking untuk tindakan
              </h2>
              <p className="max-w-xs text-sm text-slate-500">
                Detail billing, aksi sesi, dan pelunasan akan tampil di panel ini.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function getAttentionPriority(booking: POSBooking, now: Date) {
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const remaining = differenceInMinutes(new Date(booking.end_time), now);

  if (paymentStatus === "awaiting_verification") return 0;
  if (needsSettlement(booking)) return 1;
  if ((status === "active" || status === "ongoing") && remaining <= 0) return 2;
  if ((status === "active" || status === "ongoing") && remaining <= 15) return 3;
  if (["failed", "expired"].includes(paymentStatus)) return 4;
  return 10;
}

function getTimeZoneParts(date: Date, timezone = "Asia/Jakarta") {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || "0");

  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
}

function toTenantWallClock(dateValue: string, timezone = "Asia/Jakarta") {
  const parts = getTimeZoneParts(new Date(dateValue), timezone);
  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  );
}

function formatTenantTime(
  dateValue: string,
  timezone = "Asia/Jakarta",
  pattern = "HH:mm",
) {
  return format(toTenantWallClock(dateValue, timezone), pattern);
}
