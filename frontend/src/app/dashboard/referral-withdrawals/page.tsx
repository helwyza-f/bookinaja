"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, HandCoins, RefreshCw, WalletCards, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminHeader,
  StatCard,
  StatusPill,
  SectionCard,
  EmptyState,
  formatIDR,
} from "@/components/platform/admin-kit";
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
      setItems(Array.isArray(res.data?.data) ? res.data.data : []);
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

  const totalPending = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [items],
  );

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6">
      <AdminHeader
        title="Referral payout"
        subtitle="Review dan proses request pencairan referral dari tenant."
        actions={
          <Button size="sm" variant="outline" className="rounded-lg" onClick={loadData}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Jumlah request" value={items.length.toLocaleString("id-ID")} icon={HandCoins} loading={loading} />
        <StatCard label="Nominal pending" value={formatIDR(totalPending)} icon={WalletCards} loading={loading} />
        <StatCard label="Status" value="Perlu review" />
      </section>

      {message ? (
        <div className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
          {message}
        </div>
      ) : null}

      <SectionCard title="Request pending">
        {loading ? (
          <div className="text-sm text-slate-400">Memuat…</div>
        ) : items.length === 0 ? (
          <EmptyState icon={HandCoins} title="Tidak ada request pending" />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {item.tenant_name || item.tenant_slug || "—"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.tenant_slug || "—"}
                      {item.created_at ? ` · ${item.created_at}` : ""}
                    </div>
                    {item.note ? (
                      <div className="mt-2 rounded-md border border-[var(--admin-line-soft)] bg-[var(--admin-surface)] px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                        {item.note}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatIDR(item.amount)}
                    </div>
                    <StatusPill status="trial" label={item.status || "pending"} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => updateStatus(item.id, "approved")}
                    disabled={busyId === item.id}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    onClick={() => updateStatus(item.id, "rejected")}
                    disabled={busyId === item.id}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-lg"
                    onClick={() => updateStatus(item.id, "paid")}
                    disabled={busyId === item.id}
                  >
                    <WalletCards className="mr-1.5 h-4 w-4" />
                    Mark Paid
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </main>
  );
}
