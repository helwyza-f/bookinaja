"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type CustomerPortalItem,
  formatPortalDate,
  getBookingStatusMeta,
  getOrderStatusMeta,
} from "@/lib/customer-portal";
import {
  getCustomerPortalCached,
  peekCustomerPortalCache,
  primeCustomerPortalCache,
} from "@/lib/customer-portal-cache";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { customerOrdersChannel } from "@/lib/realtime/channels";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";

const REALTIME_REFRESH_THROTTLE_MS = 1200;

export default function UserHistoryPage() {
  const router = useRouter();
  const cached = peekCustomerPortalCache<{
    customer_id?: string;
    past_history?: CustomerPortalItem[];
    past_orders?: CustomerPortalItem[];
  }>("customer-history");
  const [loading, setLoading] = useState(!cached);
  const [customerID, setCustomerID] = useState(String(cached?.customer_id || ""));
  const [history, setHistory] = useState<CustomerPortalItem[]>(cached?.past_history || []);
  const [orders, setOrders] = useState<CustomerPortalItem[]>(cached?.past_orders || []);
  const lastBackgroundRefreshRef = useRef(0);

  const load = useCallback(async (mode: "initial" | "background" = "initial") => {
    try {
      const data =
        mode === "background"
          ? (await api.get("/user/me/history")).data
          : await getCustomerPortalCached("customer-history", async () => {
              const res = await api.get("/user/me/history");
              return res.data;
            });
      setCustomerID(String(data?.customer_id || ""));
      setHistory(data?.past_history || []);
      setOrders(data?.past_orders || []);
      primeCustomerPortalCache("customer-history", data);
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
    channels: customerID ? [customerOrdersChannel(customerID)] : [],
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-[1.5rem]" />
        <Skeleton className="h-24 rounded-[1.35rem]" />
        <Skeleton className="h-24 rounded-[1.35rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
          Riwayat
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
            Riwayat transaksi
          </h1>
          <Badge className="rounded-full border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
            {history.length + orders.length} item
          </Badge>
        </div>
      </section>

      <div className="space-y-4">
        {orders.length ? (
          <section className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">
              Order
            </div>
            {orders.map((order) => {
              const statusMeta = getOrderStatusMeta(order.status, order.payment_status, order.balance_due);
              return (
              <Card
                key={order.id}
                className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#10141f]"
              >
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={statusMeta.className}>
                        {statusMeta.label}
                      </Badge>
                      <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        {order.tenant_name || "Tenant"}
                      </span>
                    </div>
                    <div className="mt-2 truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {order.resource || "Order"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(order.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ReceiptText className="h-3.5 w-3.5" />
                        Rp {(order.grand_total || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  <Button asChild variant="outline" className="h-10 w-10 shrink-0 rounded-2xl p-0">
                    <Link href={`/user/me/orders/${order.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              );
            })}
          </section>
        ) : null}

        {history.length ? (
          <section className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
              Booking timed
            </div>
            {history.map((booking) => {
              const statusMeta = getBookingStatusMeta(booking.status);
              return (
            <Card
              key={booking.id}
              className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#10141f]"
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className={statusMeta.className}>
                      {statusMeta.label}
                    </Badge>
                    <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      {booking.tenant_name || "Tenant"}
                    </span>
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {booking.resource || "Booking"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(booking.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ReceiptText className="h-3.5 w-3.5" />
                      Rp {(booking.grand_total || 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <Button asChild variant="outline" className="h-10 w-10 shrink-0 rounded-2xl p-0">
                  <Link href={`/user/me/bookings/${booking.id}`}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
              );
            })}
          </section>
        ) : (
          !orders.length ? <Card className="rounded-[1.5rem] border-dashed border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
            <CardContent className="p-5 text-sm text-slate-500 dark:text-slate-400">
              Belum ada riwayat transaksi.
            </CardContent>
          </Card> : null
        )}
      </div>
    </div>
  );
}

function formatDate(value?: string) {
  return formatPortalDate(value, true);
}
