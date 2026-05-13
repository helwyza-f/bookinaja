"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  ExternalLink,
  Eye,
  Radio,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { getTenantUrl } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  type CustomerPortalItem,
  formatPortalDate,
  formatPortalTime,
  getBookingStatusMeta,
  getOrderStatusMeta,
} from "@/lib/customer-portal";
import {
  getCustomerPortalCached,
  peekCustomerPortalCache,
  primeCustomerPortalCache,
} from "@/lib/customer-portal-cache";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { customerBookingsChannel, customerOrdersChannel } from "@/lib/realtime/channels";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";

const REALTIME_REFRESH_THROTTLE_MS = 1200;

export default function UserActiveBookingsPage() {
  const router = useRouter();
  const cached = peekCustomerPortalCache<{
    customer_id?: string;
    active_bookings?: CustomerPortalItem[];
    active_orders?: CustomerPortalItem[];
  }>("customer-active");
  const [loading, setLoading] = useState(!cached);
  const [customerID, setCustomerID] = useState(String(cached?.customer_id || ""));
  const [bookings, setBookings] = useState<CustomerPortalItem[]>(cached?.active_bookings || []);
  const [orders, setOrders] = useState<CustomerPortalItem[]>(cached?.active_orders || []);
  const lastBackgroundRefreshRef = useRef(0);

  const load = useCallback(async (mode: "initial" | "background" = "initial") => {
    try {
      const data =
        mode === "background"
          ? (await api.get("/user/me/active")).data
          : await getCustomerPortalCached("customer-active", async () => {
              const res = await api.get("/user/me/active");
              return res.data;
            });

      setCustomerID(String(data?.customer_id || ""));
      setBookings(data?.active_bookings || []);
      setOrders(data?.active_orders || []);
      primeCustomerPortalCache("customer-active", data);
    } catch (error) {
      if (isTenantAuthError(error)) {
        clearTenantSession({ keepTenantSlug: true });
      }
      router.replace("/user/login");
    } finally {
      if (mode === "initial") setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load("initial");
  }, [load]);

  useRealtime({
    enabled: Boolean(customerID),
    channels: customerID ? [customerBookingsChannel(customerID), customerOrdersChannel(customerID)] : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      const now = Date.now();
      if (now - lastBackgroundRefreshRef.current < REALTIME_REFRESH_THROTTLE_MS) return;
      lastBackgroundRefreshRef.current = now;
      void load("background");
    },
    onReconnect: () => {
      void load("background");
    },
  });

  const tenantCount = useMemo(
    () =>
      new Set(
        [...bookings, ...orders].map((item) => item.tenant_slug).filter(Boolean),
      ).size,
    [bookings, orders],
  );
  const activeStateLabel = useMemo(() => {
    if (bookings.length) return "Live";
    if (orders.length) return "Perlu aksi";
    return "Idle";
  }, [bookings.length, orders.length]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-[1.5rem]" />
        <Skeleton className="h-32 rounded-[1.5rem]" />
        <Skeleton className="h-32 rounded-[1.5rem]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
              Aktif
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              Transaksi aktif
            </h1>
          </div>
          <Badge className="rounded-full border-none bg-blue-50 px-3 py-1 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
            {bookings.length + orders.length} item
          </Badge>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetricTile
            label="Live"
            value={String(bookings.length + orders.length)}
            icon={Radio}
            tone="blue"
          />
          <MetricTile
            label="Tenant"
            value={String(tenantCount)}
            icon={ReceiptText}
            tone="slate"
          />
          <MetricTile
            label="Status"
            value={activeStateLabel}
            icon={Wallet}
            tone="emerald"
          />
        </div>
      </section>

      {orders.length ? (
        <section className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">
              Order Langsung
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950 dark:text-white">
              Order yang masih perlu aksi
            </h2>
          </div>
          <div className="space-y-3">
            {orders.map((order) => (
              <ActiveOrderRow key={order.id} order={order} />
            ))}
          </div>
        </section>
      ) : null}

      {bookings.length ? (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
              Booking Timed
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950 dark:text-white">
              Booking sesi yang masih berjalan
            </h2>
          </div>
          {bookings.map((booking) => (
            <ActiveBookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      ) : (
        !orders.length ? (
        <Card className="rounded-[1.75rem] border-dashed border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Belum ada transaksi aktif.
            </p>
            <Button
              onClick={() => router.push("/user/me")}
              className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              Kembali ke Home
            </Button>
          </CardContent>
        </Card>
        ) : null
      )}
    </div>
  );
}

function ActiveOrderRow({ order }: { order: CustomerPortalItem }) {
  const statusMeta = getOrderStatusMeta(order.status, order.payment_status, order.balance_due);
  return (
    <Card className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge className={statusMeta.className}>
                {statusMeta.label}
              </Badge>
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {order.tenant_name || "Tenant"}
              </span>
            </div>
            <h2 className="mt-2 line-clamp-2 text-base font-semibold tracking-tight text-slate-950 dark:text-white">
              {order.resource || "Order"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {statusMeta.hint || "Lanjutkan order ini dari portal."}
            </p>
          </div>
          <Link
            href={`/user/me/orders/${order.id}`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-500"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <InfoPill
            icon={CalendarDays}
            label="Dibuat"
            value={formatDate(order.date)}
          />
          <InfoPill
            icon={ReceiptText}
            label="Tagihan"
            value={`Rp ${Number(order.grand_total || 0).toLocaleString("id-ID")}`}
          />
          <InfoPill
            icon={Wallet}
            label="Jenis"
            value="Non-timed"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            asChild
            className="h-10 rounded-2xl bg-emerald-600 px-3 text-white hover:bg-emerald-500"
          >
            <Link href={`/user/me/orders/${order.id}/payment`}>
              <Wallet className="mr-2 h-4 w-4" />
              Bayar
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-2xl px-3">
            <Link href={`/user/me/orders/${order.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              Detail
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveBookingRow({ booking }: { booking: CustomerPortalItem }) {
  const tenantUrl = booking.tenant_slug ? getTenantUrl(booking.tenant_slug) : null;
  const statusMeta = getBookingStatusMeta(booking.status);

  return (
    <Card className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge className={statusMeta.className}>
                {statusMeta.label}
              </Badge>
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {booking.tenant_name || "Tenant"}
              </span>
            </div>
            <h2 className="mt-2 line-clamp-2 text-base font-semibold tracking-tight text-slate-950 dark:text-white">
              {booking.resource || "Booking"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ref {booking.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <Link
            href={`/user/me/bookings/${booking.id}/live`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-500"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <InfoPill
            icon={CalendarDays}
            label="Tanggal"
            value={formatDate(booking.date)}
          />
          <InfoPill
            icon={Clock3}
            label="Jam"
            value={formatTime(booking.date)}
          />
          <InfoPill
            icon={Wallet}
            label="Total"
            value={`Rp ${Number(booking.grand_total || 0).toLocaleString("id-ID")}`}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            asChild
            className="h-10 rounded-2xl bg-slate-950 px-3 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Link href={`/user/me/bookings/${booking.id}/live`}>
              <Radio className="mr-2 h-4 w-4" />
              Live
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-2xl px-3">
            <Link href={`/user/me/bookings/${booking.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              Detail
            </Link>
          </Button>
          {tenantUrl ? (
            <Button asChild variant="outline" className="h-10 rounded-2xl px-3">
              <a href={tenantUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Tenant
              </a>
            </Button>
          ) : <div />}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "blue" | "slate" | "emerald";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3",
        tone === "blue" && "border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10",
        tone === "slate" && "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]",
        tone === "emerald" && "border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10",
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
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

function formatDate(value?: string) {
  return formatPortalDate(value);
}

function formatTime(value?: string) {
  return formatPortalTime(value);
}
