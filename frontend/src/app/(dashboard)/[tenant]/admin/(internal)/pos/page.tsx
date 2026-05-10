"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  MonitorPlay,
  ChevronRight,
  User as UserIcon,
  Search,
  RefreshCw,
  Timer,
  AlertTriangle,
  ChevronLeft,
  Plus,
  ShoppingCart,
  Minus,
  Package2,
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
  type POSCatalogResource,
  type POSControlAction,
  type POSSalesOrderDetail,
  type POSSessionDetail,
} from "@/components/pos/pos-control-hub";
import type { FnBMenuItem } from "@/components/pos/fnb-catalog-dialog";
import { format, differenceInMinutes } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
import { useAdminSession } from "@/components/dashboard/admin-session-context";

type POSFeedItem = {
  kind: "booking" | "sales_order";
  id: string;
  tenant_id: string;
  resource_id: string;
  resource_name?: string;
  customer_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  status?: string;
  payment_status?: string;
  deposit_override_active?: boolean;
  action_label?: string;
  priority?: number;
  scheduled_at?: string | null;
  end_time?: string | null;
  total?: number;
  balance_due?: number;
  operating_mode?: string;
};

type DirectSaleDraftItem = {
  id: string;
  resource_id: string;
  resource_name: string;
  name: string;
  price: number;
  price_unit?: string;
  unit_duration?: number;
  item_type?: string;
  is_default?: boolean;
  metadata?: Record<string, unknown> | null;
  quantity: number;
};

const POS_UPCOMING_WINDOW_MINUTES = 6 * 60;

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

function isBookingItem(item: POSFeedItem) {
  return item.kind === "booking";
}

function isSalesOrderItem(item: POSFeedItem) {
  return item.kind === "sales_order";
}

function needsBookingSettlement(item: POSFeedItem) {
  if (!isBookingItem(item)) return false;
  const status = String(item.status || "").toLowerCase();
  const paymentStatus = String(item.payment_status || "").toLowerCase();
  const balanceDue = Number(item.balance_due || 0);
  return (
    status === "completed" &&
    (balanceDue > 0 ||
      ["pending", "partial_paid", "unpaid", "failed", "expired", "awaiting_verification"].includes(
        paymentStatus,
      ))
  );
}

function isActiveBooking(item: POSFeedItem) {
  if (!isBookingItem(item)) return false;
  const status = String(item.status || "").toLowerCase();
  return status === "active" || status === "ongoing";
}

function isUpcomingBooking(item: POSFeedItem, now: Date) {
  if (!isBookingItem(item) || !item.scheduled_at) return false;
  const status = String(item.status || "").toLowerCase();
  if (!["pending", "confirmed"].includes(status)) return false;
  const startsIn = differenceInMinutes(new Date(item.scheduled_at), now);
  return startsIn >= 0 && startsIn <= POS_UPCOMING_WINDOW_MINUTES;
}

function getItemTotal(item: POSFeedItem) {
  return Number(item.total || 0);
}

function getStatusMeta(item: POSFeedItem, now: Date) {
  if (isSalesOrderItem(item)) {
    const status = String(item.status || "").toLowerCase();
    const paymentStatus = String(item.payment_status || "").toLowerCase();
    if (paymentStatus === "awaiting_verification") {
      return {
        label: "Menunggu verifikasi",
        className: "bg-amber-500 text-white",
        toneClass: "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-500/25 dark:from-amber-500/10 dark:to-orange-500/10",
        lineClass: "bg-amber-500",
      };
    }
    if (status === "pending_payment") {
      return {
        label: "Menunggu bayar",
        className: "bg-orange-500 text-white",
        toneClass: "border-orange-200 bg-orange-50/50 dark:border-orange-500/20 dark:bg-orange-500/8",
        lineClass: "bg-orange-500",
      };
    }
    if (status === "paid") {
      return {
        label: "Siap ditutup",
        className: "bg-emerald-500 text-white",
        toneClass: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/8",
        lineClass: "bg-emerald-500",
      };
    }
    return {
      label: "Order langsung",
      className: "bg-[var(--bookinaja-600)] text-white",
      toneClass: "border-blue-200 bg-blue-50/40 dark:border-blue-500/20 dark:bg-blue-500/8",
      lineClass: "bg-[var(--bookinaja-600)]",
    };
  }

  const paymentStatus = String(item.payment_status || "").toLowerCase();
  const remaining = item.end_time ? differenceInMinutes(new Date(item.end_time), now) : 0;
  const hasDepositOverride = Boolean(item.deposit_override_active);

  if (paymentStatus === "awaiting_verification") {
    return {
      label: "Menunggu verifikasi",
      className: "bg-amber-500 text-white",
      toneClass: "border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/8",
      lineClass: "bg-amber-500",
    };
  }

  if (needsBookingSettlement(item)) {
    return {
      label: "Perlu pelunasan",
      className: "bg-orange-500 text-white",
      toneClass: "border-orange-200 bg-orange-50/50 dark:border-orange-500/20 dark:bg-orange-500/8",
      lineClass: "bg-orange-500",
    };
  }

  if (
    isBookingItem(item) &&
    ["pending", "confirmed"].includes(String(item.status || "").toLowerCase()) &&
    ["pending", "partial_paid", "unpaid", "failed", "expired"].includes(paymentStatus)
  ) {
    return {
      label: hasDepositOverride ? "Tanpa DP" : "Menunggu bayar",
      className: hasDepositOverride ? "bg-amber-500 text-white" : "bg-orange-500 text-white",
      toneClass: hasDepositOverride
        ? "border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/8"
        : "border-orange-200 bg-orange-50/50 dark:border-orange-500/20 dark:bg-orange-500/8",
      lineClass: hasDepositOverride ? "bg-amber-500" : "bg-orange-500",
    };
  }

  if (isActiveBooking(item)) {
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

  if (isUpcomingBooking(item, now)) {
    return {
      label: "Akan datang",
      className: "bg-blue-600 text-white",
      toneClass: "border-blue-200 bg-blue-50/40 dark:border-blue-500/20 dark:bg-blue-500/8",
      lineClass: "bg-blue-600",
    };
  }

  return {
    label: item.status || "Transaksi",
    className: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    toneClass: "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0f0f17]",
    lineClass: "bg-slate-300",
  };
}

function getActionHint(item: POSFeedItem, now: Date) {
  if (isSalesOrderItem(item)) return item.action_label || "Buka transaksi";
  const paymentStatus = String(item.payment_status || "").toLowerCase();
  const hasDepositOverride = Boolean(item.deposit_override_active);
  if (paymentStatus === "awaiting_verification") return "Review bukti bayar";
  if (
    ["pending", "confirmed"].includes(String(item.status || "").toLowerCase()) &&
    ["pending", "partial_paid", "unpaid", "failed", "expired"].includes(paymentStatus)
  ) {
    return hasDepositOverride ? "Bayar penuh di akhir" : "Tuntaskan pembayaran";
  }
  if (needsBookingSettlement(item)) return "Tutup tagihan booking";
  if (isActiveBooking(item)) return "Buka kontrol sesi";
  if (isUpcomingBooking(item, now)) return "Review booking sebelum mulai";
  return item.action_label || "Lihat detail";
}

function getRelativeWindow(item: POSFeedItem, now: Date) {
  if (isSalesOrderItem(item)) {
    const status = String(item.status || "").toLowerCase();
    const paymentStatus = String(item.payment_status || "").toLowerCase();
    if (paymentStatus === "awaiting_verification") return "Review admin";
    if (status === "pending_payment") return "Tunggu pembayaran";
    if (status === "paid") return "Siap ditutup";
    return "Order langsung";
  }

  if (isActiveBooking(item) && item.end_time) {
    const remaining = differenceInMinutes(new Date(item.end_time), now);
    if (remaining <= 0) return "Waktu habis";
    if (remaining < 60) return `${remaining} menit lagi`;
    return `${Math.floor(remaining / 60)}j ${remaining % 60}m lagi`;
  }

  if (item.scheduled_at) {
    if (Boolean(item.deposit_override_active)) return "Tanpa DP";
    const untilStart = differenceInMinutes(new Date(item.scheduled_at), now);
    if (untilStart <= 0) return "Siap ditangani";
    if (untilStart < 60) return `${untilStart} menit lagi`;
    return `${Math.floor(untilStart / 60)}j ${untilStart % 60}m lagi`;
  }

  return "Perlu aksi";
}

function compareActionItems(a: POSFeedItem, b: POSFeedItem) {
  const aPriority = Number(a.priority || 999);
  const bPriority = Number(b.priority || 999);
  if (aPriority !== bPriority) return aPriority - bPriority;
  const aDate = a.scheduled_at || a.end_time || "";
  const bDate = b.scheduled_at || b.end_time || "";
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  return new Date(aDate).getTime() - new Date(bDate).getTime();
}

function ActionCard({
  item,
  now,
  isSelected,
  onOpen,
}: {
  item: POSFeedItem;
  now: Date;
  isSelected: boolean;
  onOpen: () => void;
}) {
  const statusMeta = getStatusMeta(item, now);
  const isSales = isSalesOrderItem(item);
  const startLabel = item.scheduled_at
    ? formatTenantTime(item.scheduled_at, "Asia/Jakarta", "HH:mm")
    : "Langsung";
  const endLabel = item.end_time
    ? formatTenantTime(item.end_time, "Asia/Jakarta", "HH:mm")
    : "Kasir";
  const amountLabel = isSales
    ? Number(item.balance_due || 0) > 0
      ? Number(item.balance_due || 0)
      : getItemTotal(item)
    : needsBookingSettlement(item)
    ? Number(item.balance_due || 0)
    : getItemTotal(item);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group w-full overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-colors hover:border-[var(--bookinaja-300)] hover:bg-slate-50 dark:bg-[#0f0f17] dark:hover:bg-white/[0.03]",
        statusMeta.toneClass,
        isSelected && "border-[var(--bookinaja-400)] ring-2 ring-[color:rgba(59,130,246,0.18)]",
      )}
    >
      <div className={cn("h-1 w-full", statusMeta.lineClass)} />
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 text-slate-700 shadow-sm dark:bg-white/10 dark:text-white">
                {isSales ? <ShoppingCart className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {item.customer_name || (isSales ? "Walk-in order" : "Customer")}
                  </p>
                  <Badge
                    className={cn(
                      "shrink-0 rounded-full border-none text-[10px] font-semibold",
                      isSales
                        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200",
                    )}
                  >
                    {isSales ? "Direct sale" : "Booking timed"}
                  </Badge>
                </div>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {item.resource_name || (isSales ? "Counter POS" : "Unit")}
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
              {isSales ? "Mode" : "Waktu"}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Clock className="h-3.5 w-3.5 text-[var(--bookinaja-600)]" />
              {isSales ? "Direct sale" : `${startLabel} - ${endLabel}`}
            </p>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2 dark:bg-white/5">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Kondisi
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Timer className="h-3.5 w-3.5 text-[var(--bookinaja-600)]" />
              {getRelativeWindow(item, now)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200/70 pt-3 dark:border-white/10">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {Number(item.balance_due || 0) > 0 ? "Sisa tagihan" : "Nilai transaksi"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
              Rp{new Intl.NumberFormat("id-ID").format(amountLabel)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Aksi</p>
            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              {getActionHint(item, now)}
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
          "fixed inset-y-0 right-0 z-50 hidden w-[840px] max-w-[98vw] border-l border-slate-200 bg-white shadow-2xl transition-transform lg:block xl:w-[920px] dark:border-white/15 dark:bg-[#0f0f17]",
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

  const [actions, setActions] = useState<POSFeedItem[]>([]);
  const [menuItems, setMenuItems] = useState<FnBMenuItem[]>([]);
  const [posCatalog, setPosCatalog] = useState<POSCatalogResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<POSControlAction | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);
  const [now, setNow] = useState(new Date());
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [creatingOrderResourceId, setCreatingOrderResourceId] = useState<string | null>(null);
  const [draftResourceId, setDraftResourceId] = useState<string>("");
  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({});
  const [directSaleSearch, setDirectSaleSearch] = useState("");
  const lastRealtimeToastRef = useRef<string>("");

  const canReadBookings = hasPermission(adminUser, "bookings.read");
  const canReadPos = hasPermission(adminUser, "pos.read");
  const canOperateSession = hasPermission(adminUser, [
    "bookings.confirm",
    "sessions.start",
    "sessions.extend",
    "sessions.complete",
    "pos.order.add",
    "pos.checkout",
    "pos.cash.settle",
  ]);
  const canConfirmBookings = hasPermission(adminUser, "bookings.confirm");
  const canStartSessions = hasPermission(adminUser, "sessions.start");
  const canCompleteSessions = hasPermission(adminUser, "sessions.complete");
  const canSettleCash = hasPermission(adminUser, "pos.cash.settle");
  const canReadFnb = hasPermission(adminUser, "fnb.read");
  const canManageFnb = hasPermission(adminUser, ["fnb.create", "fnb.update", "fnb.delete"]);
  const canUseReceiptActions = hasPermission(adminUser, ["receipts.send", "receipts.print"]);
  const canCreateDirectSale = hasPermission(adminUser, ["pos.order.add", "bookings.create"]);

  const fetchData = useCallback(async () => {
    try {
      const [actionsRes, menuRes, catalogRes] = await Promise.allSettled([
        canReadPos ? api.get("/pos/action-feed", { params: { window_minutes: 360, limit: 80 } }) : Promise.resolve(null),
        canReadFnb ? api.get("/fnb") : Promise.resolve(null),
        canReadPos ? api.get("/admin/resources/pos-catalog") : Promise.resolve(null),
      ]);

      setActions(
        actionsRes.status === "fulfilled" ? actionsRes.value?.data?.items || [] : [],
      );
      setMenuItems(menuRes.status === "fulfilled" ? menuRes.value?.data || [] : []);
      setPosCatalog(
        catalogRes.status === "fulfilled" ? catalogRes.value?.data?.items || [] : [],
      );
    } catch {
      toast.error("Gagal sinkronisasi daftar tindakan");
    } finally {
      setLoading(false);
    }
  }, [canReadFnb, canReadPos]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => setIsDesktop(query.matches);
    syncViewport();
    query.addEventListener("change", syncViewport);
    return () => query.removeEventListener("change", syncViewport);
  }, []);

  const openActionDetail = useCallback(
    async (item: POSFeedItem) => {
      if (!canReadPos) return;
      setSelectedKey(`${item.kind}:${item.id}`);
      setSelectedAction(null);
      setIsSheetLoading(true);
      try {
        if (item.kind === "sales_order") {
          const res = await api.get(`/sales-orders/${item.id}`);
          setSelectedAction({ kind: "sales_order", data: res.data as POSSalesOrderDetail });
        } else {
          const res = await api.get(`/bookings/${item.id}`);
          setSelectedAction({ kind: "booking", data: res.data as POSSessionDetail });
        }
      } catch {
        toast.error("Detail gagal dimuat");
        setSelectedKey(null);
      } finally {
        setIsSheetLoading(false);
      }
    },
    [canReadPos],
  );

  useEffect(() => {
    if (activeId && actions.length > 0 && !selectedKey) {
      const exists = actions.find((item) => item.id === activeId);
      if (exists) {
        void openActionDetail(exists);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("active");
        router.replace(`/admin/pos?${params.toString()}`, { scroll: false });
      }
    }
  }, [activeId, actions, openActionDetail, selectedKey, router, searchParams]);

  const refreshSelectedAction = async (kind: "booking" | "sales_order", id: string) => {
    if (kind === "sales_order") {
      const res = await api.get(`/sales-orders/${id}`);
      setSelectedAction({ kind: "sales_order", data: res.data as POSSalesOrderDetail });
      setActions((prev) =>
        prev.map((item) =>
          item.kind === kind && item.id === id
            ? {
                ...item,
                status: res.data.status,
                payment_status: res.data.payment_status,
                balance_due: res.data.balance_due,
                total: res.data.grand_total,
              }
            : item,
        ),
      );
      return;
    }

    const res = await api.get(`/bookings/${id}`);
    setSelectedAction({ kind: "booking", data: res.data as POSSessionDetail });
    setActions((prev) =>
      prev.map((item) =>
        item.kind === kind && item.id === id
          ? {
              ...item,
              status: res.data.status,
              payment_status: res.data.payment_status,
              balance_due: res.data.balance_due,
              total: res.data.grand_total,
            }
          : item,
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
      if (selectedAction) {
        void refreshSelectedAction(selectedAction.kind, selectedAction.data.id);
      }
      const bookingId = String(event.refs?.booking_id || "");
      if (!selectedAction || selectedAction.kind !== "booking" || bookingId !== selectedAction.data.id) {
        return;
      }
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

  const filteredActions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...actions].sort(compareActionItems);
    if (!query) return sorted;
    return sorted.filter((item) =>
      [item.customer_name, item.resource_name, item.customer_phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [actions, searchQuery]);

  const summary = useMemo(() => {
    return {
      verification: filteredActions.filter(
        (item) =>
          item.kind === "booking" &&
          String(item.payment_status || "").toLowerCase() === "awaiting_verification",
      ).length,
      settlement: filteredActions.filter(
        (item) =>
          needsBookingSettlement(item) ||
          (item.kind === "sales_order" &&
            ["pending_payment", "paid"].includes(String(item.status || "").toLowerCase())),
      ).length,
      active: filteredActions.filter((item) => isActiveBooking(item)).length,
      directSale: filteredActions.filter((item) => item.kind === "sales_order").length,
    };
  }, [filteredActions]);

  const directSaleResources = useMemo(
    () =>
      posCatalog.filter((item) =>
        ["direct_sale", "hybrid"].includes(String(item.operating_mode || "").toLowerCase()),
      ),
    [posCatalog],
  );

  const filteredDirectSaleResources = useMemo(() => {
    const query = directSaleSearch.trim().toLowerCase();
    if (!query) return directSaleResources;
    return directSaleResources.filter((resource) => {
      const resourceName = String(resource.resource_name || "").toLowerCase();
      const category = String(resource.category || "").toLowerCase();
      const itemNames = (resource.available_items || []).some((item) =>
        String(item.name || "").toLowerCase().includes(query),
      );
      return (
        resourceName.includes(query) ||
        category.includes(query) ||
        itemNames
      );
    });
  }, [directSaleResources, directSaleSearch]);

  const draftResource = useMemo(
    () =>
      directSaleResources.find((item) => item.resource_id === draftResourceId) || null,
    [directSaleResources, draftResourceId],
  );

  const draftItems = draftResource?.available_items || [];

  const allDraftItems = useMemo(
    () =>
      directSaleResources.flatMap((resource) =>
        (resource.available_items || []).map((item) => ({
          ...item,
          resource_id: resource.resource_id,
          resource_name: resource.resource_name,
        })),
      ),
    [directSaleResources],
  );

  const draftSelectedItems = useMemo<DirectSaleDraftItem[]>(
    () =>
      allDraftItems
        .map((item) => ({
          ...item,
          quantity: Number(draftQuantities[item.id] || 0),
        }))
        .filter((item) => item.quantity > 0)
        .sort((a, b) => {
          if (a.resource_name !== b.resource_name) {
            return a.resource_name.localeCompare(b.resource_name);
          }
          return a.name.localeCompare(b.name);
        }),
    [allDraftItems, draftQuantities],
  );

  const draftResourceSelectionCount = useMemo(() => {
    return draftSelectedItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.resource_id] = Number(acc[item.resource_id] || 0) + Number(item.quantity || 0);
      return acc;
    }, {});
  }, [draftSelectedItems]);

  const draftSelectedResourceIds = useMemo(
    () => Array.from(new Set(draftSelectedItems.map((item) => item.resource_id))),
    [draftSelectedItems],
  );

  const draftOrderResourceId = draftSelectedItems[0]?.resource_id || draftResourceId || "";

  const draftOrderResource = useMemo(
    () =>
      directSaleResources.find((item) => item.resource_id === draftOrderResourceId) || null,
    [directSaleResources, draftOrderResourceId],
  );

  const draftTotal = useMemo(
    () =>
      draftSelectedItems.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ),
    [draftSelectedItems],
  );

  const draftSelectedCount = useMemo(
    () =>
      draftSelectedItems.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      ),
    [draftSelectedItems],
  );

  const updateDraftQuantity = useCallback((itemId: string, delta: number) => {
    setDraftQuantities((prev) => {
      const next = Math.max(0, Number(prev[itemId] || 0) + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: next,
      };
    });
  }, []);

  useEffect(() => {
    if (!newOrderOpen) return;
    setDraftResourceId("");
    setDraftQuantities({});
    setDirectSaleSearch("");
    setItemPickerOpen(false);
  }, [newOrderOpen, directSaleResources]);

  const closeDetail = () => {
    setSelectedAction(null);
    setSelectedKey(null);
  };

  if (!isDesktop && selectedKey) {
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
              {selectedAction?.data.resource_name ||
                selectedAction?.data.customer_name ||
                "Memuat transaksi..."}
            </h1>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {isSheetLoading ? (
            <POSControlSkeleton />
          ) : selectedAction ? (
            <POSControlHub
              action={selectedAction}
              menuItems={menuItems}
              posCatalog={posCatalog}
              onRefresh={refreshSelectedAction}
              canWriteBookings={canOperateSession}
              canConfirmBookings={canConfirmBookings}
              canStartSessions={canStartSessions}
              canCompleteSessions={canCompleteSessions}
              canSettleCash={canSettleCash}
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
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
          <div className="relative min-w-0 lg:w-[320px] xl:w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari customer, WA, atau unit..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium outline-none transition focus:border-[var(--bookinaja-500)] focus:ring-4 focus:ring-[color:rgba(59,130,246,0.14)] dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={fetchData}
              disabled={loading}
              className="h-10 rounded-lg px-3 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            {canCreateDirectSale && directSaleResources.length > 0 ? (
              <Button
                onClick={() => {
                  setDraftResourceId("");
                  setDraftQuantities({});
                  setDirectSaleSearch("");
                  setItemPickerOpen(false);
                  setNewOrderOpen(true);
                }}
                className="h-10 rounded-lg bg-[var(--bookinaja-600)] px-4 text-xs font-semibold text-white hover:bg-[var(--bookinaja-700)]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Transaksi baru
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] md:p-3.5">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Verifikasi bayar</div>
          <div className="mt-1.5 text-lg font-semibold text-amber-600 md:text-xl">{summary.verification}</div>
        </Card>
        <Card className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] md:p-3.5">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Perlu tindakan</div>
          <div className="mt-1.5 text-lg font-semibold text-orange-600 md:text-xl">{summary.settlement}</div>
        </Card>
        <Card className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] md:p-3.5">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Sedang berjalan</div>
          <div className="mt-1.5 text-lg font-semibold text-emerald-600 md:text-xl">{summary.active}</div>
        </Card>
        <Card className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] md:p-3.5">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Order langsung</div>
          <div className="mt-1.5 text-lg font-semibold text-[var(--bookinaja-600)] md:text-xl">{summary.directSale}</div>
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
      ) : filteredActions.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white text-center shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
          <MonitorPlay size={34} className="text-slate-300" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Tidak ada transaksi untuk action desk
          </h3>
          <p className="text-sm text-slate-500">
            Yang tampil di sini hanya booking atau transaksi POS yang masih perlu ditindak.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredActions.map((item) => (
            <ActionCard
              key={`${item.kind}:${item.id}`}
              item={item}
              now={now}
              isSelected={selectedKey === `${item.kind}:${item.id}`}
              onOpen={() => void openActionDetail(item)}
            />
          ))}
        </div>
      )}

      <DrawerShell open={Boolean(selectedKey)} onClose={closeDetail}>
        {isSheetLoading ? (
          <POSControlSkeleton />
        ) : selectedAction ? (
          <POSControlHub
            action={selectedAction}
            menuItems={menuItems}
            posCatalog={posCatalog}
            onRefresh={refreshSelectedAction}
            canWriteBookings={canOperateSession}
            canConfirmBookings={canConfirmBookings}
            canStartSessions={canStartSessions}
            canCompleteSessions={canCompleteSessions}
            canSettleCash={canSettleCash}
            canManageFnb={canManageFnb}
            canUseReceiptActions={canUseReceiptActions && isOwner(adminUser)}
            onClose={closeDetail}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-sm text-slate-500">Pilih transaksi untuk melihat tindakan.</div>
          </div>
        )}
      </DrawerShell>

      <Dialog
        open={newOrderOpen}
        onOpenChange={(open) => {
          setNewOrderOpen(open);
          if (!open) setItemPickerOpen(false);
        }}
      >
        <DialogContent className="h-[100dvh] w-screen max-w-none rounded-none border-0 p-0 dark:bg-[#0f0f17] sm:h-auto sm:w-[min(1220px,calc(100vw-1rem))] sm:max-w-[1220px] sm:rounded-2xl sm:border sm:border-slate-200 sm:dark:border-white/10">
          <DialogHeader className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4 text-left dark:border-white/10 dark:bg-[#0f0f17]">
            <div className="flex items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={directSaleSearch}
                  onChange={(event) => setDirectSaleSearch(event.target.value)}
                  placeholder="Cari katalog atau item..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium outline-none transition focus:border-[var(--bookinaja-500)] focus:ring-4 focus:ring-[color:rgba(59,130,246,0.14)] dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setNewOrderOpen(false)}
                className="h-9 w-9 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <DialogTitle className="sr-only">Buat transaksi direct sale</DialogTitle>
            <DialogDescription className="sr-only">
              Pilih resource, tambahkan item, lalu buat order kasir.
            </DialogDescription>
          </DialogHeader>
          <div className="grid h-[calc(100dvh-81px)] overflow-y-auto sm:max-h-[85vh] sm:h-auto lg:max-h-[82vh] lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.02] lg:min-h-0 lg:overflow-y-auto lg:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Katalog item
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Browse semua katalog dulu. Tap kartu item untuk pilih varian dan quantity.
                  </div>
                </div>
                <Badge className="rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {filteredDirectSaleResources.length} katalog
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredDirectSaleResources.map((resource) => {
                  const selected = draftResource?.resource_id === resource.resource_id;
                  const itemCount = Number(resource.available_items?.length || 0);
                  const lowestPrice = Math.min(
                    ...(resource.available_items?.map((item) => Number(item.price || 0)) || [0]),
                  );
                  return (
                    <button
                      key={resource.resource_id}
                      type="button"
                      onClick={() => {
                        setDraftResourceId(resource.resource_id);
                        setItemPickerOpen(true);
                      }}
                      className={cn(
                        "overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-colors",
                        selected
                          ? "border-[var(--bookinaja-400)] ring-2 ring-[color:rgba(59,130,246,0.14)]"
                          : "border-slate-200 hover:border-[var(--bookinaja-300)] hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]",
                      )}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-white/[0.04]">
                        {resource.resource_image_url ? (
                          <img
                            src={resource.resource_image_url}
                            alt={resource.resource_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[rgba(59,130,246,0.08)] to-slate-100 text-[var(--bookinaja-600)] dark:from-[rgba(59,130,246,0.12)] dark:to-white/[0.03]">
                            <Package2 className="h-8 w-8" />
                          </div>
                        )}
                        {selected ? (
                          <div className="absolute left-2 top-2 rounded-full bg-[var(--bookinaja-600)] px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                            Aktif
                          </div>
                        ) : null}
                        {draftResourceSelectionCount[resource.resource_id] ? (
                          <div className="absolute right-2 top-2 rounded-full bg-slate-950/85 px-2 py-1 text-[10px] font-semibold text-white shadow-sm dark:bg-white/15">
                            {draftResourceSelectionCount[resource.resource_id]} item
                          </div>
                        ) : null}
                      </div>
                      <div className="p-3">
                        <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {resource.resource_name}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{itemCount} varian</span>
                          <span>mulai Rp{new Intl.NumberFormat("id-ID").format(lowestPrice)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {filteredDirectSaleResources.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  Tidak ada katalog yang cocok dengan pencarian.
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f17] lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Cart
                    </div>
                    <div className="flex items-center gap-2">
                      {draftSelectedItems.length > 0 ? (
                        <Badge className="rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {draftSelectedItems.length} baris
                        </Badge>
                      ) : null}
                      {draftSelectedItems.length > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setDraftQuantities({})}
                          className="h-8 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
                        >
                          Kosongkan
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {draftSelectedItems.length > 0 ? (
                      draftSelectedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                              {item.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Rp{new Intl.NumberFormat("id-ID").format(Number(item.price || 0))} / {item.price_unit || "pcs"}
                            </div>
                            {draftSelectedResourceIds.length > 1 ? (
                              <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                {item.resource_name}
                              </div>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-sm font-semibold text-slate-950 dark:text-white">
                              Rp{new Intl.NumberFormat("id-ID").format(Number(item.price || 0) * Number(item.quantity || 0))}
                            </div>
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => updateDraftQuantity(item.id, -item.quantity)}
                                className="h-8 rounded-lg px-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
                              >
                                Hapus
                              </Button>
                              <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1 py-1 dark:border-white/10 dark:bg-white/[0.03]">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateDraftQuantity(item.id, -1)}
                                  disabled={item.quantity === 0}
                                  className="h-7 w-7 rounded-full"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <div className="w-7 text-center text-sm font-semibold text-slate-950 dark:text-white">
                                  {item.quantity}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateDraftQuantity(item.id, 1)}
                                  className="h-7 w-7 rounded-full"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                        Cart masih kosong.
                      </div>
                    )}
                  </div>
                </div>

                <div className="sticky bottom-0 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#0f0f17]/95">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                        Total transaksi
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white sm:text-3xl">
                        Rp{new Intl.NumberFormat("id-ID").format(draftTotal)}
                      </div>
                    </div>
                    <Button
                      onClick={async () => {
                        if (!draftOrderResourceId) {
                          toast.error("Pilih minimal satu item dari katalog");
                          return;
                        }
                        if (draftSelectedItems.length === 0) {
                          toast.error("Pilih minimal satu item");
                          return;
                        }
                        try {
                          setCreatingOrderResourceId(draftOrderResourceId);
                          const res = await api.post("/sales-orders", {
                            resource_id: draftOrderResourceId,
                          });
                          const orderId = res.data.id as string;

                          for (const item of draftSelectedItems) {
                            await api.post(`/sales-orders/${orderId}/items`, {
                              resource_item_id: item.id,
                              quantity: item.quantity,
                            });
                          }

                          await api.post(`/sales-orders/${orderId}/checkout`, {
                            payment_method: "cash",
                            notes: "Draft kasir dari POS",
                          });

                          await fetchData();
                          setNewOrderOpen(false);
                          setDraftResourceId("");
                          setDraftQuantities({});
                          toast.success(
                            draftSelectedResourceIds.length > 1
                              ? "Transaksi direct sale siap diproses"
                              : `Transaksi ${draftOrderResource?.resource_name || "direct sale"} siap diproses`,
                          );
                          await openActionDetail({
                            kind: "sales_order",
                            id: orderId,
                            tenant_id: tenantId,
                            resource_id: draftOrderResourceId,
                            resource_name: draftOrderResource?.resource_name || "Direct sale",
                            status: "pending_payment",
                            payment_status: "pending",
                            total: draftTotal,
                            balance_due: draftTotal,
                            operating_mode: draftOrderResource?.operating_mode,
                          });
                        } catch (error) {
                          const err = error as { response?: { data?: { error?: string } } };
                          toast.error(err.response?.data?.error || "Gagal membuat transaksi baru");
                        } finally {
                          setCreatingOrderResourceId(null);
                        }
                      }}
                      disabled={!draftOrderResourceId || draftSelectedItems.length === 0 || creatingOrderResourceId !== null}
                      className="h-11 shrink-0 rounded-xl bg-[var(--bookinaja-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--bookinaja-700)]"
                    >
                      {creatingOrderResourceId ? "Membuat..." : "Buat transaksi"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={itemPickerOpen && Boolean(draftResource)} onOpenChange={setItemPickerOpen}>
        <DialogContent className="w-[min(720px,calc(100vw-1rem))] max-w-none rounded-2xl border-slate-200 p-0 dark:border-white/10 dark:bg-[#0f0f17]">
          <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left dark:border-white/10">
            <DialogTitle className="text-base font-semibold text-slate-950 dark:text-white">
              {draftResource?.resource_name || "Pilih item"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Pilih varian utama dan atur quantity dengan stepper.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto p-4 sm:p-5">
            {draftItems.length > 0 ? (
              <div className="space-y-2">
                {draftItems.map((item) => {
                  const quantity = Number(draftQuantities[item.id] || 0);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]",
                        quantity > 0 &&
                          "border-[var(--bookinaja-400)] ring-2 ring-[color:rgba(59,130,246,0.12)]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                            {item.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Rp{new Intl.NumberFormat("id-ID").format(Number(item.price || 0))} / {item.price_unit || "pcs"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1 py-1 dark:border-white/10 dark:bg-white/[0.03]">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => updateDraftQuantity(item.id, -1)}
                            disabled={quantity === 0}
                            className="h-8 w-8 rounded-full"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="w-8 text-center text-sm font-semibold text-slate-950 dark:text-white">
                            {quantity}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => updateDraftQuantity(item.id, 1)}
                            className="h-8 w-8 rounded-full"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Katalog ini belum punya item direct sale yang bisa dijual.
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0f0f17]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Item dipilih
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                  {draftSelectedCount} item
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setItemPickerOpen(false)}
                className="h-11 rounded-xl bg-[var(--bookinaja-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--bookinaja-700)]"
              >
                Simpan pilihan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
