"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CreditCard,
  Receipt,
  Zap,
  History,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function BillingHistoryPage() {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [orders, setOrders] = useState<BillingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [subRes, ordersRes] = await Promise.all([
        api.get("/billing/subscription"),
        api.get("/billing/orders", { params: { limit: 50 } }),
      ]);
      setSub(subRes.data);
      setOrders(ordersRes.data?.orders || []);
    } catch (err: any) {
      toast.error("Gagal sinkronisasi data billing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const isActive = sub?.status === "active";

  if (loading) return <BillingSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER SUMMARY - COMPACT & HIGH IMPACT */}
      <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#080808] p-8 md:p-10 shadow-sm relative overflow-hidden ring-1 ring-black/5">
        <Zap className="absolute -right-10 -top-10 size-64 opacity-[0.03] dark:opacity-[0.05] rotate-12 text-blue-600" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-blue-500/20 bg-blue-500/5 text-blue-600 font-[1000] uppercase tracking-widest text-[9px] px-3 py-0.5"
              >
                ENGINE STATUS
              </Badge>
              {isActive && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-tighter italic">
                    Aktif
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-[1000] italic uppercase tracking-tighter leading-none dark:text-white">
                {isActive ? sub?.plan || "PRO" : "PAKET TIDAK AKTIF"}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Kelola langganan dan akses fitur premium Bookinaja
              </p>
            </div>

            <div className="flex items-center gap-8 pt-2">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">
                  Berlaku Hingga
                </span>
                <span className="font-bold text-sm dark:text-white italic">
                  {sub?.current_period_end
                    ? new Date(sub.current_period_end).toLocaleDateString(
                        "id-ID",
                        { dateStyle: "long" },
                      )
                    : "Habis Masa Berlaku"}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">
                  Masa Penagihan
                </span>
                <span className="font-bold text-sm text-blue-600 uppercase italic">
                  {isActive ? "Auto-Renewal" : "Manual Payment"}
                </span>
              </div>
            </div>
          </div>

          <Link href="/admin/billing/subscribe">
            <Button className="h-14 rounded-2xl font-[1000] italic uppercase px-10 text-xs shadow-xl shadow-blue-600/20 bg-blue-600 hover:bg-blue-500 transition-all active:scale-95 gap-2 border-b-4 border-blue-800 active:border-b-0">
              <CreditCard size={16} />
              {isActive ? "Upgrade Paket" : "Aktifkan Sekarang"}
            </Button>
          </Link>
        </div>
      </div>

      {/* TRANSACTION HISTORY */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400">
              <History size={18} strokeWidth={2.5} />
            </div>
            <div className="leading-none text-left">
              <h2 className="text-xl font-[1000] uppercase italic tracking-tight dark:text-white">
                Riwayat Transaksi
              </h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Log pembayaran tenant sultan
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          {orders.length === 0 ? (
            <div className="rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-white/5 p-20 text-center space-y-4 opacity-50 bg-slate-50/30 dark:bg-transparent">
              <Receipt size={40} className="mx-auto text-slate-300" />
              <p className="font-black italic uppercase text-[10px] tracking-[0.4em] text-slate-400">
                Belum Ada Transaksi Tercatat
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.ID}
                className="rounded-2xl border border-slate-100 dark:border-white/5 bg-white dark:bg-[#0c0c0c] p-4 md:px-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                      order.Status === "paid" || order.Status === "settlement"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-orange-500/10 text-orange-500",
                    )}
                  >
                    <CalendarDays size={20} />
                  </div>
                  <div className="text-left leading-tight truncate">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-black uppercase italic tracking-tighter text-sm dark:text-white">
                        {order.Plan}
                      </span>
                      <Badge className="text-[7px] bg-slate-100 dark:bg-white/10 text-slate-400 uppercase border-none px-2 py-0 h-4">
                        {order.BillingInterval}
                      </Badge>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                      {new Date(order.CreatedAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                      })}{" "}
                      • ID: {order.OrderID}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right leading-none">
                    <div className="text-lg font-[1000] tracking-tighter italic text-blue-600 leading-none">
                      IDR {new Intl.NumberFormat("id-ID").format(order.Amount)}
                    </div>
                    <span
                      className={cn(
                        "text-[8px] font-black uppercase italic mt-1 inline-block",
                        order.Status === "paid" || order.Status === "settlement"
                          ? "text-emerald-500"
                          : "text-orange-500",
                      )}
                    >
                      {order.Status}
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <ArrowUpRight size={14} className="text-slate-400" />
                  </div>
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
    <div className="space-y-10">
      <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-100 dark:bg-white/5" />
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-6 w-48 bg-slate-100 dark:bg-white/5" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-20 w-full rounded-2xl bg-slate-100 dark:bg-white/5"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
