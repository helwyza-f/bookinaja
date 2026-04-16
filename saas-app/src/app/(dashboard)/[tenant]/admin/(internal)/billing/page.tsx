"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        opts?: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

type SubscriptionInfo = {
  tenant_id: string;
  plan: string;
  status: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
};

export default function BillingPage() {
  const searchParams = useSearchParams();
  const preselectedPlan = (searchParams.get("plan") || "").toLowerCase();
  const preselectedInterval = (searchParams.get("interval") || "").toLowerCase();

  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const isProd = (process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true";

  const suggested = useMemo(() => {
    const plan =
      preselectedPlan === "pro" || preselectedPlan === "starter"
        ? preselectedPlan
        : "pro";
    const interval =
      preselectedInterval === "annual" || preselectedInterval === "monthly"
        ? preselectedInterval
        : "monthly";
    return { plan, interval };
  }, [preselectedInterval, preselectedPlan]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await api.get("/billing/subscription");
      setSub(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal memuat subscription.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkout = async (plan: "starter" | "pro", interval: "monthly" | "annual") => {
    if (!clientKey) {
      toast.error("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY belum di-set.");
      return;
    }
    if (!window.snap?.pay) {
      toast.error("Midtrans Snap belum siap. Coba refresh halaman.");
      return;
    }

    setPaying(true);
    try {
      const res = await api.post("/billing/checkout", { plan, interval });
      const token = res.data?.snap_token as string;
      if (!token) throw new Error("Snap token kosong");

      window.snap.pay(token, {
        onSuccess: () => {
          toast.success("Pembayaran sukses. Subscription diaktifkan.");
          refresh();
        },
        onPending: () => toast.message("Pembayaran pending. Cek status beberapa saat lagi."),
        onError: () => toast.error("Pembayaran gagal. Coba lagi."),
        onClose: () => toast.message("Checkout ditutup."),
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Checkout gagal.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-8">
      {clientKey && (
        <Script
          src={
            isProd
              ? "https://app.midtrans.com/snap/snap.js"
              : "https://app.sandbox.midtrans.com/snap/snap.js"
          }
          data-client-key={clientKey}
          strategy="afterInteractive"
        />
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight">Subscription</h1>
          <p className="text-sm font-semibold text-muted-foreground">
            Aktifkan paket untuk membuka fitur penuh Bookinaja.
          </p>
        </div>
        <Button variant="secondary" onClick={refresh} disabled={loading || paying}>
          Refresh Status
        </Button>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Badge className={cn("font-black uppercase", sub?.status === "active" ? "bg-green-600" : "bg-slate-700")}>
              {loading ? "loading" : sub?.status || "unknown"}
            </Badge>
            <div className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              Plan: {sub?.plan || "-"}
            </div>
          </div>
          <div className="text-xs font-bold text-muted-foreground">
            {sub?.current_period_end ? `Aktif sampai ${new Date(sub.current_period_end).toLocaleString()}` : ""}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-black">Starter</div>
            <Badge variant="outline" className="font-black">IDR 150.000 / bln</Badge>
          </div>
          <div className="text-sm font-semibold text-muted-foreground">
            Cocok untuk operasional persewaan tunggal.
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              className="font-black"
              onClick={() => checkout("starter", "monthly")}
              disabled={paying}
            >
              Bayar Bulanan
            </Button>
            <Button
              variant="secondary"
              className="font-black"
              onClick={() => checkout("starter", "annual")}
              disabled={paying}
            >
              Bayar Tahunan
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-blue-500/30 bg-blue-500/5 p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-black">Pro</div>
            <Badge className="bg-blue-600 font-black">IDR 300.000 / bln</Badge>
          </div>
          <div className="text-sm font-semibold text-muted-foreground">
            Untuk bisnis dengan tim, traffic tinggi, dan kebutuhan role staff.
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              className="font-black bg-blue-600 hover:bg-blue-700"
              onClick={() => checkout("pro", "monthly")}
              disabled={paying}
            >
              Bayar Bulanan
            </Button>
            <Button
              variant="secondary"
              className="font-black"
              onClick={() => checkout("pro", "annual")}
              disabled={paying}
            >
              Bayar Tahunan
            </Button>
          </div>
          <div className="text-[11px] font-black uppercase tracking-widest text-blue-600">
            Disarankan: {suggested.plan} / {suggested.interval}
          </div>
        </div>
      </div>
    </div>
  );
}
