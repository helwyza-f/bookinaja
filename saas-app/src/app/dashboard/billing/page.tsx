"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type BillingRow = {
  order_id: string;
  tenant_slug: string;
  tenant_name: string;
  plan: string;
  billing_interval: string;
  amount: number;
  currency: string;
  status: string;
  midtrans_payment_type?: string | null;
};

export default function DashboardBillingPage() {
  const [orders, setOrders] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/platform/billing/orders", { params: { limit: 50 } });
        setOrders(res.data?.orders || []);
      } catch (error: unknown) {
        const message =
          typeof error === "object" && error && "response" in error
            ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
            : null;
        toast.error(message || "Gagal memuat billing global");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = useMemo(
    () => orders.reduce((sum, order) => sum + (order.amount || 0), 0),
    [orders],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Platform Billing</div>
        <h1 className="text-3xl font-black tracking-tight">Global Subscription Orders</h1>
        <div className="mt-2 text-sm text-muted-foreground">Total snapshot: {new Intl.NumberFormat("id-ID").format(total)}</div>
      </div>
      <Card className="space-y-3 rounded-[2rem] p-4">
        {loading ? <Skeleton className="h-40 w-full" /> : orders.map((order) => (
          <div key={order.order_id} className="rounded-2xl border p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-bold">{order.tenant_name} · {order.tenant_slug}</div>
              <div className="text-xs text-muted-foreground">{order.plan} / {order.billing_interval} · {order.order_id}</div>
            </div>
            <div className="text-right">
              <Badge>{order.status}</Badge>
              <div className="text-xs text-muted-foreground mt-1">{order.currency} {new Intl.NumberFormat("id-ID").format(order.amount)}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
