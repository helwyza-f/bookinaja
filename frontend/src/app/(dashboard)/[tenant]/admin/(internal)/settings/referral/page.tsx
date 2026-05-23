"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Banknote,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

type Summary = {
  referral_code?: string;
  total_referred?: number;
  active_referred?: number;
  trial_referred?: number;
  available_balance?: number;
  pending_withdrawal?: number;
  payout_bank_name?: string;
  payout_account_name?: string;
  payout_account_number?: string;
  payout_whatsapp?: string;
};

type ReferralItem = {
  tenant_name?: string;
  tenant_slug?: string;
  status?: string;
  trial_ends_at?: string;
  subscribed_at?: string;
  reward_status?: string;
  reward_amount?: number;
};

type WithdrawalItem = {
  id?: string;
  amount?: number;
  status?: string;
  created_at?: string;
  note?: string;
};

const formatIDR = (value?: number) =>
  new Intl.NumberFormat("id-ID").format(Number(value || 0));

const statusLabel: Record<string, string> = {
  active: "Aktif",
  trial: "Trial",
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  paid: "Dibayar",
  available: "Tersedia",
  pending_withdrawal: "Menunggu cair",
  withdrawn: "Sudah cair",
};

const rewardTone: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20",
  withdrawn: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/20",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20",
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function ReferralSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payout, setPayout] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    whatsapp: "",
  });

  const referralUrl = useMemo(() => {
    if (!summary?.referral_code) return "";
    const url = new URL("https://bookinaja.com/register");
    url.searchParams.set("ref", summary.referral_code);
    return url.toString();
  }, [summary?.referral_code]);

  const payoutReady = Boolean(
    summary?.payout_bank_name &&
      summary?.payout_account_name &&
      summary?.payout_account_number &&
      summary?.payout_whatsapp,
  );
  const canWithdraw = (summary?.available_balance || 0) > 0 && payoutReady;

  const loadData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [summaryRes, referralsRes, withdrawalsRes] = await Promise.all([
        api.get("/admin/settings/referrals/summary"),
        api.get("/admin/settings/referrals"),
        api.get("/admin/settings/referrals/withdrawals"),
      ]);
      const nextSummary = summaryRes.data?.data || summaryRes.data || {};
      const nextReferrals =
        referralsRes.data?.data ?? referralsRes.data?.items ?? referralsRes.data ?? [];
      const nextWithdrawals =
        withdrawalsRes.data?.data ?? withdrawalsRes.data?.items ?? withdrawalsRes.data ?? [];

      setSummary(nextSummary);
      setReferrals(Array.isArray(nextReferrals) ? nextReferrals : []);
      setWithdrawals(Array.isArray(nextWithdrawals) ? nextWithdrawals : []);
      setPayout({
        bank_name: nextSummary.payout_bank_name || "",
        account_name: nextSummary.payout_account_name || "",
        account_number: nextSummary.payout_account_number || "",
        whatsapp: nextSummary.payout_whatsapp || "",
      });
    } catch {
      setMessage("Gagal memuat data referral.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const copyReferralLink = async () => {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    toast.success("Link referral disalin.");
  };

  const savePayout = async () => {
    if (
      !payout.bank_name.trim() ||
      !payout.account_name.trim() ||
      !payout.account_number.trim() ||
      !payout.whatsapp.trim()
    ) {
      setMessage("Lengkapi rekening dan WhatsApp pencairan.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put("/admin/settings/referrals/payout", {
        payout_bank_name: payout.bank_name,
        payout_account_name: payout.account_name,
        payout_account_number: payout.account_number,
        payout_whatsapp: payout.whatsapp,
      });
      const updated = res.data?.data || {};
      setSummary((prev) => ({
        ...(prev || {}),
        payout_bank_name: updated.payout_bank_name || payout.bank_name,
        payout_account_name: updated.payout_account_name || payout.account_name,
        payout_account_number: updated.payout_account_number || payout.account_number,
        payout_whatsapp: updated.payout_whatsapp || payout.whatsapp,
      }));
      toast.success("Rekening pencairan tersimpan.");
      setPayoutDialogOpen(false);
      await loadData();
    } catch {
      setMessage("Gagal menyimpan rekening pencairan.");
    } finally {
      setSaving(false);
    }
  };

  const requestWithdrawal = async () => {
    setWithdrawing(true);
    setMessage(null);
    try {
      await api.post("/admin/settings/referrals/withdrawals");
      toast.success("Request pencairan diajukan.");
      await loadData();
    } catch {
      setMessage("Pencairan gagal. Pastikan saldo dan rekening sudah siap.");
    } finally {
      setWithdrawing(false);
    }
  };

  const resetPayoutDraft = () => {
    setPayout({
      bank_name: summary?.payout_bank_name || "",
      account_name: summary?.payout_account_name || "",
      account_number: summary?.payout_account_number || "",
      whatsapp: summary?.payout_whatsapp || "",
    });
  };

  const openPayoutDialog = () => {
    resetPayoutDraft();
    setPayoutDialogOpen(true);
  };

  return (
    <div className="space-y-3 px-3 py-3 pb-16 sm:px-4 lg:px-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--bookinaja-600)]">
            Referral
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Refer & Earn
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Kode, link, saldo, dan payout dalam satu halaman.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="rounded-xl">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={requestWithdrawal}
            disabled={!canWithdraw || withdrawing || loading}
            className="rounded-xl"
          >
            <Banknote className="mr-2 h-4 w-4" />
            Cairkan
          </Button>
          <Button asChild size="sm" className="rounded-xl">
            <Link href="/admin/settings/billing">
              Billing
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                Referral link
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Bagikan link ini ke calon tenant.
              </p>
            </div>
            <StatusPill active={Boolean(summary?.referral_code)}>
              {summary?.referral_code ? "Kode aktif" : "Menyiapkan kode"}
            </StatusPill>
          </div>

          <div className="mt-3 grid gap-2">
            <InfoLine label="Kode" value={summary?.referral_code || (loading ? "Memuat..." : "-")} />
            <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-white/[0.03] sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {referralUrl || "Link akan muncul setelah kode tersedia"}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={copyReferralLink}
                disabled={!referralUrl}
                className="rounded-lg sm:w-auto"
              >
                <Copy className="mr-2 h-4 w-4" />
                Salin
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Snapshot</h3>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            <StatRow label="Saldo" value={`Rp ${formatIDR(summary?.available_balance)}`} tone="emerald" />
            <StatRow label="Pending" value={`Rp ${formatIDR(summary?.pending_withdrawal)}`} tone="amber" />
            <StatRow label="Referral" value={String(summary?.total_referred || 0)} />
            <StatRow label="Aktif" value={String(summary?.active_referred || 0)} />
          </div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">Payout</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Rekening pencairan bonus.
              </p>
            </div>
            <StatusPill active={payoutReady}>{payoutReady ? "Siap" : "Belum lengkap"}</StatusPill>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <InfoLine label="Bank" value={summary?.payout_bank_name || "-"} />
            <InfoLine label="Nama" value={summary?.payout_account_name || "-"} />
            <InfoLine label="No. rekening" value={summary?.payout_account_number || "-"} />
            <InfoLine label="WhatsApp" value={summary?.payout_whatsapp || "-"} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={openPayoutDialog} variant="outline" size="sm" className="rounded-xl">
              <Wallet className="mr-2 h-4 w-4" />
              {payoutReady ? "Edit rekening" : "Tambah rekening"}
            </Button>
            <Button
              onClick={requestWithdrawal}
              disabled={!canWithdraw || withdrawing}
              size="sm"
              className="rounded-xl"
            >
              <Send className="mr-2 h-4 w-4" />
              Ajukan cair
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Aturan bonus</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <RuleLine>Tenant daftar lewat link referral.</RuleLine>
            <RuleLine>Bonus masuk saat tenant jadi subscriber aktif.</RuleLine>
            <RuleLine>Pencairan butuh rekening terverifikasi.</RuleLine>
          </div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <ListHeader title="Referral" subtitle="Tenant yang masuk dari kode kamu." />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <EmptyLine label="Memuat referral..." />
            ) : referrals.length === 0 ? (
              <EmptyLine label="Belum ada tenant referral." />
            ) : (
              referrals.map((item) => {
                const rewardStatus = item.reward_status || "pending";
                return (
                  <div key={`${item.tenant_slug}-${item.tenant_name}`} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {item.tenant_name || item.tenant_slug || "-"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {item.tenant_slug || "-"}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                          rewardTone[rewardStatus] ||
                            "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10",
                        )}
                      >
                        {statusLabel[rewardStatus] || rewardStatus || "-"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <MiniValue label="Reward" value={`Rp ${formatIDR(item.reward_amount)}`} />
                      <MiniValue label="Tenant" value={statusLabel[item.status || ""] || item.status || "-"} />
                      <MiniValue label="Trial" value={formatDate(item.trial_ends_at)} />
                      <MiniValue label="Subscribe" value={formatDate(item.subscribed_at)} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <ListHeader title="Withdrawal" subtitle="Riwayat pencairan bonus." />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {withdrawals.length === 0 ? (
              <EmptyLine label="Belum ada riwayat pencairan." />
            ) : (
              withdrawals.map((item) => (
                <div key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">
                        Rp {formatIDR(item.amount)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                      {statusLabel[item.status || ""] || item.status || "-"}
                    </span>
                  </div>
                  {item.note ? (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.note}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] max-w-lg flex-col overflow-hidden rounded-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>{payoutReady ? "Edit rekening" : "Tambah rekening"}</DialogTitle>
            <DialogDescription>Data ini dipakai saat pencairan bonus referral.</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
            <Field label="Nama bank">
              <Input
                value={payout.bank_name}
                onChange={(e) => setPayout((prev) => ({ ...prev, bank_name: e.target.value }))}
                placeholder="BCA / BRI / Mandiri"
              />
            </Field>
            <Field label="Nama pemilik rekening">
              <Input
                value={payout.account_name}
                onChange={(e) => setPayout((prev) => ({ ...prev, account_name: e.target.value }))}
                placeholder="Sesuai rekening"
              />
            </Field>
            <Field label="Nomor rekening">
              <Input
                value={payout.account_number}
                onChange={(e) =>
                  setPayout((prev) => ({ ...prev, account_number: e.target.value }))
                }
                placeholder="1234567890"
              />
            </Field>
            <Field label="WhatsApp konfirmasi">
              <Input
                value={payout.whatsapp}
                onChange={(e) => setPayout((prev) => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="08xxxxxxxxxx"
              />
            </Field>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-background px-4 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPayoutDialogOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="button" onClick={savePayout} disabled={saving}>
              <Download className="mr-2 h-4 w-4" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-white/[0.03]">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">
        {value || "-"}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber";
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold text-slate-950 dark:text-white",
          tone === "emerald" && "text-emerald-700 dark:text-emerald-300",
          tone === "amber" && "text-amber-700 dark:text-amber-300",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function StatusPill({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20"
          : "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10",
      )}
    >
      {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

function RuleLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      <span>{children}</span>
    </div>
  );
}

function ListHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-slate-100 p-3 dark:border-slate-800">
      <h3 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

function EmptyLine({ label }: { label: string }) {
  return <div className="p-3 text-sm text-slate-500 dark:text-slate-400">{label}</div>;
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 truncate font-semibold text-slate-700 dark:text-slate-200">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</Label>
      {children}
    </div>
  );
}
