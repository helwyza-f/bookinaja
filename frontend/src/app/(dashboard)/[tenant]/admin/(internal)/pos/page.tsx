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
  ChevronLeft,
  X,
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
};

const POS_UPCOMING_WINDOW_MINUTES = 6 * 60;

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

function isActiveBooking(booking: POSBooking) {
  const status = String(booking.status || "").toLowerCase();
  return status === "active" || status === "ongoing";
}

function isUpcomingBooking(booking: POSBooking, now: Date) {
  const status = String(booking.status || "").toLowerCase();
  if (!["pending", "confirmed"].includes(status)) return false;
  const startsIn = differenceInMinutes(new Date(booking.start_time), now);
  return startsIn >= 0 && startsIn <= POS_UPCOMING_WINDOW_MINUTES;
}

function isActionableBooking(booking: POSBooking, now: Date) {
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  return (
    paymentStatus === "awaiting_verification" ||
    needsSettlement(booking) ||
    isActiveBooking(booking) ||
    isUpcomingBooking(booking, now)
  );
}

function getStatusMeta(booking: POSBooking, now: Date) {
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const remaining = differenceInMinutes(new Date(booking.end_time), now);

  if (paymentStatus === "awaiting_verification") {
    return {
      label: "Menunggu verifikasi",
      className: "bg-amber-500 text-white",
      toneClass: "border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/8",
      lineClass: "bg-amber-500",
    };
  }

  if (needsSettlement(booking)) {
    return {
      label: "Perlu pelunasan",
      className: "bg-orange-500 text-white",
      toneClass: "border-orange-200 bg-orange-50/50 dark:border-orange-500/20 dark:bg-orange-500/8",
      lineClass: "bg-orange-500",
    };
  }

  if (status === "active" || status === "ongoing") {
    if (remaining <= 0) {
      return {
        label: "Overtime",
        className: "bg-red-500 text-white",
        toneClass: "border-red-200 bg-red-50/50 dark:border-red-500/20 dark:bg-red-500/8",
        lineClass: "bg-red-500",
      };
    }
    if (remaining <= 15) {
      return {
        label: "Segera habis",
        className: "bg-amber-500 text-white",
        toneClass: "border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/8",
        lineClass: "bg-amber-500",
      };
    }
    return {
      label: "Sedang berjalan",
      className: "bg-emerald-500 text-white",
      toneClass: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/8",
      lineClass: "bg-emerald-500",
    };
  }

  if (isUpcomingBooking(booking, now)) {
    return {
      label: "Akan datang",
      className: "bg-blue-600 text-white",
      toneClass: "border-blue-200 bg-blue-50/40 dark:border-blue-500/20 dark:bg-blue-500/8",
      lineClass: "bg-blue-600",
    };
  }

  return {
    label: booking.status || "Booking",
    className: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    toneClass: "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0f0f17]",
    lineClass: "bg-slate-300",
  };
}

function getBookingHint(booking: POSBooking, now: Date) {
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  if (paymentStatus === "awaiting_verification") return "Review bukti bayar";
  if (needsSettlement(booking)) return "Tutup tagihan booking";
  if (isActiveBooking(booking)) return "Buka kontrol sesi";
  if (isUpcomingBooking(booking, now)) return "Review booking sebelum mulai";
  return "Lihat detail";
}

function getRelativeWindow(booking: POSBooking, now: Date) {
  if (isActiveBooking(booking)) {
    const remaining = differenceInMinutes(new Date(booking.end_time), now);
    if (remaining <= 0) return "Waktu habis";
    if (remaining < 60) return `${remaining} menit lagi`;
    return `${Math.floor(remaining / 60)}j ${remaining % 60}m lagi`;
  }

  const untilStart = differenceInMinutes(new Date(booking.start_time), now);
  if (untilStart <= 0) return "Siap ditangani";
  if (untilStart < 60) return `${untilStart} menit lagi`;
  return `${Math.floor(untilStart / 60)}j ${untilStart % 60}m lagi`;
}

function compareActionableBookings(a: POSBooking, b: POSBooking, now: Date) {
  const aPriority = getPriority(a, now);
  const bPriority = getPriority(b, now);
  if (aPriority !== bPriority) return aPriority - bPriority;
  return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
}

function getPriority(booking: POSBooking, now: Date) {
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const remaining = differenceInMinutes(new Date(booking.end_time), now);
  if (paymentStatus === "awaiting_verification") return 0;
  if (needsSettlement(booking)) return 1;
  if (isActiveBooking(booking) && remaining <= 0) return 2;
  if (isActiveBooking(booking) && remaining <= 15) return 3;
  if (isActiveBooking(booking)) return 4;
  if (isUpcomingBooking(booking, now)) return 5;
  return 10;
}

function BookingActionCard({
  booking,
  now,
  isSelected,
  onOpen,
}: {
  booking: POSBooking;
  now: Date;
  isSelected: boolean;
  onOpen: () => void;
}) {
  const statusMeta = getStatusMeta(booking, now);
  const startLabel = formatTenantTime(
    booking.start_time,
    booking.timezone || "Asia/Jakarta",
    "HH:mm",
  );
  const endLabel = formatTenantTime(
    booking.end_time,
    booking.timezone || "Asia/Jakarta",
    "HH:mm",
  );
  const billLabel = needsSettlement(booking)
    ? Number(booking.balance_due || 0)
    : getBookingTotal(booking);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group w-full overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-colors hover:border-[var(--bookinaja-300)] hover:bg-slate-50 dark:bg-[#0f0f17] dark:hover:bg-white/[0.03]",
        statusMeta.toneClass,
        isSelected && "ring-2 ring-[color:rgba(59,130,246,0.18)] border-[var(--bookinaja-400)]",
      )}
    >
      <div className={cn("h-1 w-full", statusMeta.lineClass)} />
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 text-slate-700 shadow-sm dark:bg-white/10 dark:text-white">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                  {booking.customer_name || "Customer"}
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {booking.resource_name || "Unit"}
                </p>
              </div>
            </div>
          </div>
          <Badge className={cn("rounded-full border-none text-[10px] font-semibold", statusMeta.className)}>
            {statusMeta.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/80 px-3 py-2 dark:bg-white/5">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Waktu
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Clock className="h-3.5 w-3.5 text-[var(--bookinaja-600)]" />
              {startLabel} - {endLabel}
            </p>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2 dark:bg-white/5">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Kondisi
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Timer className="h-3.5 w-3.5 text-[var(--bookinaja-600)]" />
              {getRelativeWindow(booking, now)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200/70 pt-3 dark:border-white/10">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {needsSettlement(booking) ? "Sisa tagihan" : "Nilai booking"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
              Rp{new Intl.NumberFormat("id-ID").format(billLabel)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Aksi
            </p>
            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              {getBookingHint(booking, now)}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function DrawerShell({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 hidden bg-slate-950/20 transition-opacity lg:block",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 hidden w-[620px] max-w-[96vw] border-l border-slate-200 bg-white shadow-2xl transition-transform lg:block dark:border-white/15 dark:bg-[#0f0f17]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {children}
      </aside>
    </>
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
      toast.error("Gagal sinkronisasi daftar tindakan");
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
      const exists = bookings.find((booking) => booking.id === activeId);
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

  const actionableBookings = useMemo(() => {
    return bookings.filter((booking) => isActionableBooking(booking, now));
  }, [bookings, now]);

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...actionableBookings].sort((a, b) =>
      compareActionableBookings(a, b, now),
    );
    if (!query) return sorted;
    return sorted.filter((booking) =>
      [booking.customer_name, booking.resource_name, booking.customer_phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [actionableBookings, now, searchQuery]);

  const summary = useMemo(() => {
    return {
      verification: filteredBookings.filter(
        (booking) =>
          String(booking.payment_status || "").toLowerCase() ===
          "awaiting_verification",
      ).length,
      settlement: filteredBookings.filter((booking) => needsSettlement(booking))
        .length,
      active: filteredBookings.filter((booking) => isActiveBooking(booking)).length,
      upcoming: filteredBookings.filter((booking) => isUpcomingBooking(booking, now))
        .length,
    };
  }, [filteredBookings, now]);

  const closeDetail = () => {
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
            onClick={closeDetail}
            className="h-10 w-10 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              POS Action
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
            POS
          </Badge>
          <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/bookings")}
            className="h-8 rounded-lg px-3 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
          >
            Ledger booking
          </Button>
          <Button
            variant="ghost"
            onClick={fetchData}
            disabled={loading}
            className="h-8 rounded-lg px-3 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] md:p-3.5">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Verifikasi bayar
          </div>
          <div className="mt-1.5 text-lg font-semibold text-amber-600 md:text-xl">
            {summary.verification}
          </div>
        </Card>
        <Card className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] md:p-3.5">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Perlu pelunasan
          </div>
          <div className="mt-1.5 text-lg font-semibold text-orange-600 md:text-xl">
            {summary.settlement}
          </div>
        </Card>
        <Card className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] md:p-3.5">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Sedang berjalan
          </div>
          <div className="mt-1.5 text-lg font-semibold text-emerald-600 md:text-xl">
            {summary.active}
          </div>
        </Card>
        <Card className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] md:p-3.5">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Akan datang
          </div>
          <div className="mt-1.5 text-lg font-semibold text-blue-600 md:text-xl">
            {summary.upcoming}
          </div>
        </Card>
      </div>

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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <Card
              key={i}
              className="h-52 overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950"
            >
              <Skeleton className="h-1 w-full" />
              <div className="space-y-4 p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white text-center shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
          <MonitorPlay size={34} className="text-slate-300" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Tidak ada booking untuk action desk
          </h3>
          <p className="text-sm text-slate-500">
            Yang tampil di sini hanya booking yang akan datang, sedang berjalan, atau perlu pelunasan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {filteredBookings.map((booking) => (
            <BookingActionCard
              key={booking.id}
              booking={booking}
              now={now}
              isSelected={selectedSessionId === booking.id}
              onOpen={() => openSessionDetail(booking.id)}
            />
          ))}
        </div>
      )}

      <DrawerShell open={Boolean(selectedSessionId)} onClose={closeDetail}>
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
            onClose={closeDetail}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-sm text-slate-500">Pilih booking untuk melihat tindakan.</div>
          </div>
        )}
      </DrawerShell>
    </div>
  );
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
