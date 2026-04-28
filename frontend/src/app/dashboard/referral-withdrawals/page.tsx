"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, HandCoins, RefreshCw, WalletCards, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

type Withdrawal = {
  id?: string;
  tenant_slug?: string;
  tenant_name?: string;
  amount?: number;
  status?: string;
  note?: string;
  created_at?: string;
};

const formatIDR = (value?: number) => new Intl.NumberFormat("id-ID").format(Number(value || 0));

export default function ReferralWithdrawalsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get("/platform/referral-withdrawals", { params: { status: "pending" } });
      setItems(res.data?.data || []);
    } catch {
      setMessage("Gagal memuat antrian pencairan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateStatus = async (id?: string, status?: string) => {
    if (!id || !status) return;
    setBusyId(id);
    setMessage(null);
    try {
      await api.patch(`/platform/referral-withdrawals/${id}`, { status });
      setMessage(`Request berhasil diubah ke ${status}.`);
      await loadData();
    } catch {
      setMessage("Gagal memperbarui status pencairan.");
    } finally {
      setBusyId(null);
    }
  };

  const totalPending = useMemo(() => items.reduce((sum, item) => sum + Number(item.amount || 0), 0), [items]);

  return (
    <div className="space-y-4 p-3 pb-24 sm:space-y-6 sm:p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a] sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <HandCoins className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">Referral Payout</div>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Antrian pencairan referral
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
                Request dari tenant masuk ke status pending dan diproses langsung dari dashboard Bookinaja.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Jumlah request</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{items.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Nominal pending</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Rp {formatIDR(totalPending)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status antrian</div>
              <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">Perlu review manual</div>
            </div>
          </div>

          <Button variant="outline" onClick={loadData} className="w-full justify-center sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
          {message}
        </div>
      )}

      <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle className="text-base">Pending Requests</CardTitle>
          <CardDescription>Semua withdrawal referral yang belum diproses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-slate-500">Memuat...</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-white/10">
              Tidak ada request pending.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {item.tenant_name || item.tenant_slug || "-"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.tenant_slug || "-"} - {item.created_at || "-"}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-sm font-semibold text-blue-600">Rp {formatIDR(item.amount)}</div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {String(item.status || "-")}
                    </div>
                  </div>
                </div>

                {item.note ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300">
                    {item.note}
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(item.id, "approved")}
                    disabled={busyId === item.id}
                    className="w-full"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(item.id, "rejected")}
                    disabled={busyId === item.id}
                    className="w-full"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateStatus(item.id, "paid")}
                    disabled={busyId === item.id}
                    className="w-full"
                  >
                    <WalletCards className="mr-2 h-4 w-4" />
                    Mark Paid
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
