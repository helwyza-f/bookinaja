"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { ArrowUpRight, CreditCard, History, Receipt, Zap } from "lucide-react";

type SubscriptionInfo = {
  plan: string;
  status: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
};

type BillingOrder = {
  ID: string;
  OrderID: string;
  Plan: string;
  BillingInterval: string;
  Amount: number;
  Status: string;
  CreatedAt: string;
};

export default function SettingsBillingPage() {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [orders, setOrders] = useState<BillingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [subRes, ordersRes] = await Promise.all([
          api.get("/billing/subscription"),
          api.get("/billing/orders", { params: { limit: 12 } }),
        ]);
        setSub(subRes.data);
        setOrders(ordersRes.data?.orders || []);
      } catch {
        toast.error("Gagal memuat data billing");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <BillingSkeleton />;

  const status = (sub?.status || "").toLowerCase();
  const isTrial = status === "trial";
  const isActive = status === "active";

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="rounded-[2rem] md:rounded-[2.25rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-5 md:p-10 shadow-sm relative overflow-hidden">
        <Zap className="absolute -right-8 -top-8 size-44 opacity-[0.04] text-blue-600" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-blue-500/20 bg-blue-500/5 text-blue-600 font-black uppercase tracking-widest text-[9px]">
                Subscription
              </Badge>
              {isTrial ? (
                <Badge className="bg-amber-500/10 text-amber-600 border-none text-[9px] font-black uppercase tracking-widest">
                  Free Trial 30 Hari
                </Badge>
              ) : isActive ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] font-black uppercase tracking-widest">
                  Active
                </Badge>
              ) : (
                <Badge className="bg-red-500/10 text-red-500 border-none text-[9px] font-black uppercase tracking-widest">
                  Inactive / Expired
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none dark:text-white">
              {sub?.plan || "Starter"}
            </h1>
            <p className="max-w-2xl text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium">
              {isTrial 
                ? "Kamu sedang dalam masa uji coba gratis. Segera upgrade untuk mendapatkan akses penuh tanpa batas." 
                : "Kelola status paket, invoice, dan upgrade tanpa keluar dari command center executive."}
            </p>
          </div>

          <Link href="/admin/settings/billing/subscribe">
            <Button className={cn("h-14 rounded-2xl font-black uppercase italic tracking-[0.2em] px-6 shadow-xl", isTrial ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20" : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20")}>
              <CreditCard className="mr-2 h-4 w-4" />
              {isTrial ? "Upgrade Sekarang" : "Ganti Paket"}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card className="relative overflow-hidden rounded-[1.5rem] p-4 md:p-5 border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] shadow-sm">
          {isTrial && <div className="absolute top-0 right-0 rounded-bl-[1.5rem] bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-amber-600">Trial</div>}
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Status</div>
          <div className={cn("mt-2 text-2xl font-black italic uppercase", isTrial ? "text-amber-500" : isActive ? "text-emerald-500" : "text-red-500")}>
            {sub?.status || "-"}
          </div>
        </Card>
        <Card className="rounded-[1.5rem] p-4 md:p-5 border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] shadow-sm">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Active Plan</div>
          <div className="mt-2 text-2xl font-black italic uppercase text-blue-600">
            {sub?.plan || "-"}
          </div>
        </Card>
        <Card className="rounded-[1.5rem] p-4 md:p-5 border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] shadow-sm">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
            {isTrial ? "Masa Trial Berakhir" : "Perpanjangan Berikutnya"}
          </div>
          <div className="mt-2 text-lg font-black italic dark:text-white">
            {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-"}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <History className="h-4 w-4 text-slate-400" />
          <h2 className="text-xl font-black italic uppercase tracking-tight dark:text-white">
            Invoice History
          </h2>
        </div>

        <div className="grid gap-2">
          {orders.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 dark:border-white/5 p-16 text-center text-slate-400 font-black uppercase tracking-[0.25em] italic">
              Belum ada invoice
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.ID}
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[1.5rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-slate-400" />
                    <div className="truncate text-sm font-black italic uppercase dark:text-white">
                      {order.Plan} • {order.BillingInterval}
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {order.OrderID} • {new Date(order.CreatedAt).toLocaleDateString("id-ID")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-black italic text-blue-600">
                      IDR {new Intl.NumberFormat("id-ID").format(order.Amount)}
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {order.Status}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 rounded-[2.25rem] bg-slate-100 dark:bg-white/5" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28 rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
        <Skeleton className="h-28 rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
        <Skeleton className="h-28 rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
      </div>
      <Skeleton className="h-80 rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
    </div>
  );
}
