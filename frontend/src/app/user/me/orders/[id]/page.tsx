"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, CircleDashed, ReceiptText, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { toast } from "sonner";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { getOrderStatusMeta } from "@/lib/customer-portal";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { customerOrderChannel, customerOrdersChannel } from "@/lib/realtime/channels";
import {
  BOOKING_EVENT_PREFIXES,
  matchesRealtimePrefix,
  type RealtimeEvent,
} from "@/lib/realtime/event-types";

const REALTIME_REFRESH_THROTTLE_MS = 1200;

type OrderItem = {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type CustomerOrderDetail = {
  id?: string;
  status?: string;
  payment_status?: string;
  customer_id?: string;
  balance_due?: number;
  grand_total?: number;
  resource_name?: string;
  items?: OrderItem[];
  payment_attempts?: {
    id: string;
    method_label?: string;
    status?: string;
    created_at?: string;
    reference_code?: string;
  }[];
};

function patchOrderDetailFromEvent(current: CustomerOrderDetail | null, event: RealtimeEvent) {
  const orderID = String(event.refs?.order_id || event.entity_id || "");
  if (!current || !orderID || String(current.id || "") !== orderID) {
    return current;
  }

  return {
    ...current,
    status: String(event.summary?.status ?? current.status ?? ""),
    payment_status: String(event.summary?.payment_status ?? current.payment_status ?? ""),
    grand_total:
      typeof event.summary?.grand_total === "number"
        ? Number(event.summary.grand_total)
        : current.grand_total,
    balance_due:
      typeof event.summary?.balance_due === "number"
        ? Number(event.summary.balance_due)
        : current.balance_due,
  };
}

export default function CustomerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastBackgroundRefreshRef = useRef(0);

  const fetchDetail = useCallback(async (mode: "initial" | "background" = "initial") => {
    const background = mode === "background";
    try {
      if (background) setRefreshing(true);
      const res = await api.get(`/user/me/orders/${params.id}`);
      setOrder(res.data);
    } catch (error) {
      if (isTenantAuthError(error)) {
        clearTenantSession({ keepTenantSlug: true });
        router.replace("/user/login");
        return;
      }
      toast.error("Gagal memuat order customer");
    } finally {
      if (background) setRefreshing(false);
      else setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void fetchDetail("initial");
  }, [fetchDetail]);

  const customerID = String(order?.customer_id || "");
  const { connected: realtimeConnected } = useRealtime({
    enabled: Boolean(customerID && params.id),
    channels:
      customerID && params.id
        ? [customerOrdersChannel(customerID), customerOrderChannel(customerID, String(params.id))]
        : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      setOrder((current) => patchOrderDetailFromEvent(current, event));
      const now = Date.now();
      if (now - lastBackgroundRefreshRef.current < REALTIME_REFRESH_THROTTLE_MS) return;
      lastBackgroundRefreshRef.current = now;
      void fetchDetail("background");
    },
    onReconnect: () => {
      void fetchDetail("background");
    },
  });

  const isPaid = useMemo(() => Number(order?.balance_due || 0) <= 0, [order?.balance_due]);
  const statusMeta = useMemo(
    () => getOrderStatusMeta(order?.status, order?.payment_status, order?.balance_due),
    [order?.balance_due, order?.payment_status, order?.status],
  );
  const latestAttempt = useMemo(() => order?.payment_attempts?.[0], [order?.payment_attempts]);
  const actionLabel = isPaid
    ? "Detail bayar"
    : statusMeta.label === "Menunggu verifikasi" || statusMeta.label === "Diproses"
      ? "Cek bayar"
      : "Bayar";
  const currentStep = isPaid ? 3 : statusMeta.label === "Menunggu verifikasi" || statusMeta.label === "Diproses" ? 2 : 1;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-28 rounded-[1.5rem]" />
        <Skeleton className="h-96 rounded-[1.5rem]" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card className="rounded-[1.5rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b0f19]">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-none bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            Direct Sale
          </Badge>
          <Badge className={statusMeta.className}>
            {statusMeta.label}
          </Badge>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {order.resource_name}
            </div>
            <h1 className="mt-2 text-3xl font-black uppercase italic tracking-tight text-slate-950 dark:text-white">
              Ringkasan order
            </h1>
            <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {realtimeConnected ? "Realtime aktif" : refreshing ? "Memuat ulang..." : "Auto update aktif"}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
              Total
            </div>
            <div className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-100">
              Rp{Number(order.grand_total || 0).toLocaleString("id-ID")}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <PortalStepCard
            title="Order dibuat"
            description="Produk dan jumlah sudah tercatat."
            done
            active={currentStep === 1}
          />
          <PortalStepCard
            title="Pembayaran"
            description={
              isPaid
                ? "Pembayaran sudah selesai."
                : statusMeta.label === "Menunggu verifikasi"
                  ? "Bukti bayar sedang dicek."
                  : statusMeta.label === "Diproses"
                    ? "Pembayaran sedang diproses."
                    : "Customer masih perlu menyelesaikan pembayaran."
            }
            done={currentStep > 2}
            active={currentStep === 2}
          />
          <PortalStepCard
            title="Selesai"
            description="Order akan dianggap selesai setelah pembayarannya beres."
            done={currentStep === 3}
            active={false}
          />
        </div>
      </Card>

      <Card className="rounded-[1.5rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b0f19]">
        {statusMeta.hint ? (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
            {statusMeta.hint}
          </div>
        ) : null}
        {latestAttempt ? (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Pembayaran terakhir
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                  {latestAttempt.method_label || "Pembayaran"}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                <div>{latestAttempt.reference_code || "Tanpa referensi"}</div>
                <div className="mt-1">
                  {latestAttempt.created_at
                    ? new Date(latestAttempt.created_at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="space-y-3">
          {(order.items || []).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
              <div>
                <div className="text-sm font-semibold text-slate-950 dark:text-white">{item.item_name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {item.quantity} x Rp{Number(item.unit_price || 0).toLocaleString("id-ID")}
                </div>
              </div>
              <div className="text-sm font-black text-slate-950 dark:text-white">
                Rp{Number(item.subtotal || 0).toLocaleString("id-ID")}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-slate-950 p-2 text-white dark:bg-white dark:text-slate-950">
              {isPaid ? <BadgeCheck className="h-4 w-4" /> : <WalletCards className="h-4 w-4" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-950 dark:text-white">
                {isPaid
                  ? "Order sudah beres"
                  : statusMeta.label === "Menunggu verifikasi"
                    ? "Tinggal tunggu verifikasi"
                    : statusMeta.label === "Diproses"
                      ? "Pembayaran sedang dipantau"
                      : "Langkah berikutnya: bayar order"}
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isPaid
                  ? "Kamu tetap bisa buka detail pembayaran kapan saja dari sini."
                  : statusMeta.label === "Menunggu verifikasi"
                    ? "Admin akan mengecek bukti bayar yang sudah dikirim."
                    : statusMeta.label === "Diproses"
                      ? "Tunggu update otomatis dari gateway atau halaman pembayaran."
                      : "Masuk ke halaman pembayaran untuk pilih metode dan selesaikan order."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            onClick={() => router.push(`/user/me/orders/${params.id}/payment`)}
            className="h-11 rounded-2xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-500"
          >
            {isPaid ? <BadgeCheck className="mr-2 h-4 w-4" /> : <ReceiptText className="mr-2 h-4 w-4" />}
            {actionLabel}
          </Button>
          <Button variant="outline" className="h-11 rounded-2xl" onClick={() => router.push("/user/me")}>
            Kembali ke portal
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PortalStepCard({
  title,
  description,
  done,
  active,
}: {
  title: string;
  description: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={
        done
          ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"
          : active
            ? "rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10"
            : "rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]"
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            done
              ? "rounded-full bg-emerald-600 p-2 text-white"
              : active
                ? "rounded-full bg-blue-600 p-2 text-white"
                : "rounded-full bg-slate-300 p-2 text-slate-700 dark:bg-white/10 dark:text-slate-200"
          }
        >
          {done ? <BadgeCheck className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-950 dark:text-white">{title}</div>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </div>
  );
}
