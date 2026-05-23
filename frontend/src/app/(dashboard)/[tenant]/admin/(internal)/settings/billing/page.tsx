"use client";

import { useEffect, useState } from "react";
import { History, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { formatPlanLabel, formatSubscriptionStatusLabel } from "@/lib/plan-access";
import { formatIDR } from "@/lib/pricing";
import {
  BillingPlanBoard,
  type BillingPlanBoardSubscription,
} from "@/components/dashboard/billing-plan-board";

type SubscriptionInfo = BillingPlanBoardSubscription;

type BillingOrder = {
  ID: string;
  OrderID: string;
  Plan: string;
  BillingInterval: string;
  Amount: number;
  Status: string;
  CreatedAt: string;
};

const STALE_PENDING_HOURS = 24;

const parseSafeDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value?: string | null) => {
  const parsed = parseSafeDate(value);
  return parsed
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(parsed)
    : "-";
};

const isStalePendingOrder = (order: BillingOrder) => {
  const status = String(order.Status || "").toLowerCase();
  if (status !== "pending" && status !== "created") return false;
  const createdAt = parseSafeDate(order.CreatedAt);
  if (!createdAt) return false;
  const elapsedHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return elapsedHours >= STALE_PENDING_HOURS;
};

export default function SettingsBillingPage() {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [orders, setOrders] = useState<BillingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [subRes, ordersRes] = await Promise.all([
          api.get("/billing/subscription"),
          api.get("/billing/orders", { params: { limit: 8 } }),
        ]);
        if (!mounted) return;
        setSub(subRes.data || null);
        setOrders(ordersRes.data?.orders || []);
      } catch {
        toast.error("Gagal memuat billing.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-[720px] rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
        <Skeleton className="h-80 rounded-[1.5rem] bg-slate-100 dark:bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      <BillingPlanBoard sub={sub} />

      <Card className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f1117]/96 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <History className="h-4 w-4 text-slate-400" />
            <div>
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                Invoice history
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Recent invoices and statuses from your subscription updates.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              Belum ada invoice.
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.ID}
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="h-4 w-4 text-slate-400" />
                      <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {formatPlanLabel(order.Plan)} |{" "}
                        {String(order.BillingInterval).toUpperCase()}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(order.CreatedAt)} | {order.OrderID}
                    </div>
                    {isStalePendingOrder(order) ? (
                      <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        Invoice ini masih pending cukup lama. Status gateway belum tersinkron penuh.
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3 md:justify-end">
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">
                      Rp {formatIDR(order.Amount)}
                    </div>
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
                      {formatSubscriptionStatusLabel(order.Status)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
