"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CreditCard, Users, Activity, RefreshCw } from "lucide-react";
import Link from "next/link";

type OrderRow = {
  ID: string;
  Plan: string;
  BillingInterval: string;
  OrderID: string;
  Status: string;
  Amount?: number;
};

type SubscriptionRow = {
  status?: string;
  plan?: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
};

export default function DashboardOverviewPage() {
  const [customers, setCustomers] = useState<Array<{ id: string }>>([]);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [custRes, subRes, ordRes] = await Promise.all([
        api.get("/platform/customers"),
        api.get("/platform/tenants"),
        api.get("/platform/billing/orders", { params: { limit: 10 } }),
      ]);
      setCustomers(custRes.data?.customers || []);
      setSubscription(subRes.data?.tenants?.[0] || null);
      setOrders(ordRes.data?.orders || []);
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "response" in error
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : null;
      toast.error(message || "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(
    () => ({
      totalCustomers: customers.length,
      activeSubscription: subscription?.status === "active",
      totalRevenue: orders.reduce((sum, order) => sum + (order.Amount || 0), 0),
    }),
    [customers, orders, subscription],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Bookinaja Admin</div>
          <h1 className="text-3xl font-black tracking-tight">Platform Dashboard</h1>
        </div>
        <Button variant="secondary" onClick={refresh} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 rounded-[1.5rem]"><Users className="mb-3 h-5 w-5 text-blue-600" /><div className="text-3xl font-black">{loading ? <Skeleton className="h-8 w-16" /> : stats.totalCustomers}</div><div className="text-xs uppercase tracking-widest text-muted-foreground">Customers</div></Card>
        <Card className="p-6 rounded-[1.5rem]"><CreditCard className="mb-3 h-5 w-5 text-blue-600" /><div className="text-3xl font-black">{loading ? <Skeleton className="h-8 w-20" /> : (subscription?.plan || "-").toUpperCase()}</div><div className="text-xs uppercase tracking-widest text-muted-foreground">{subscription?.status || "inactive"}</div></Card>
        <Card className="p-6 rounded-[1.5rem]"><Activity className="mb-3 h-5 w-5 text-blue-600" /><div className="text-3xl font-black">{loading ? <Skeleton className="h-8 w-24" /> : new Intl.NumberFormat("id-ID").format(stats.totalRevenue)}</div><div className="text-xs uppercase tracking-widest text-muted-foreground">Revenue snapshot</div></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 rounded-[2rem]">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-black">Subscription</h2><Badge>{subscription?.status || "inactive"}</Badge></div>
          <div className="space-y-2 text-sm">
            <div>Plan: <span className="font-bold">{subscription?.plan || "-"}</span></div>
            <div>Period start: <span className="font-bold">{subscription?.current_period_start || "-"}</span></div>
            <div>Period end: <span className="font-bold">{subscription?.current_period_end || "-"}</span></div>
          </div>
          <Button asChild className="mt-4"><Link href="/dashboard/billing">Manage billing</Link></Button>
        </Card>
        <Card className="p-6 rounded-[2rem]">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-black">Recent Orders</h2><Button asChild variant="secondary"><Link href="/dashboard/customers">Open CRM</Link></Button></div>
          <div className="space-y-3">
            {loading ? <Skeleton className="h-24 w-full" /> : orders.slice(0, 4).map((order) => (
              <div key={order.ID} className="rounded-2xl border p-4">
                <div className="flex justify-between gap-4"><div><div className="font-bold">{order.Plan} • {order.BillingInterval}</div><div className="text-xs text-muted-foreground">{order.OrderID}</div></div><Badge>{order.Status}</Badge></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
