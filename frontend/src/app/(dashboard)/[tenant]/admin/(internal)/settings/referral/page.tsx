"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Banknote,
  Copy,
  Download,
  ExternalLink,
  Fingerprint,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  available: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
  withdrawn: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200",
  rejected: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200",
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
      setMessage("Lengkapi nama bank, pemilik rekening, nomor rekening, dan WhatsApp.");
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
      toast.success("Request pencairan berhasil diajukan.");
      await loadData();
    } catch {
      setMessage("Request pencairan gagal. Pastikan saldo dan rekening sudah siap.");
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
    <div className="space-y-4 p-4 pb-24 sm:space-y-6 sm:p-6">
      <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
        <div className="space-y-4 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                Referral
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Bonus Referral
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Share link, pantau saldo, lalu cairkan bonus.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:w-auto">
              <Metric label="Saldo" value={`Rp ${formatIDR(summary?.available_balance)}`} tone="emerald" />
              <Metric
                label="Referral"
                value={String(summary?.total_referred || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap">
            <Button variant="outline" onClick={loadData} className="h-10 rounded-xl">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={requestWithdrawal}
              disabled={!canWithdraw || withdrawing || loading}
              className="h-10 rounded-xl"
            >
              <Banknote className="mr-2 h-4 w-4" />
              Cairkan
            </Button>
            <Button
              asChild
              className="col-span-2 h-10 rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)] lg:col-span-1"
            >
              <Link href="/admin/settings/billing">
                <ExternalLink className="mr-2 h-4 w-4" />
                Billing
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Metric
              label="Pending"
                value={`Rp ${formatIDR(summary?.pending_withdrawal)}`}
                tone="amber"
              />
            <Metric label="Kode" value={summary?.referral_code || "-"} />
          </div>
        </div>
      </Card>

      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Share</CardTitle>
            <CardDescription>Bagikan link referral tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Kode Referral
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                    {summary?.referral_code || "-"}
                  </p>
                </div>
                <Fingerprint className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:text-slate-300">
                {referralUrl || "Link akan muncul setelah kode referral tersedia."}
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button onClick={copyReferralLink} disabled={!referralUrl} className="h-10 rounded-xl sm:w-auto">
                  <Copy className="mr-2 h-4 w-4" />
                  Salin Link
                </Button>
                <div className="rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-500 dark:border-white/10 dark:text-slate-300">
                  Bonus masuk saat tenant referral jadi subscriber aktif.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Payout</CardTitle>
            <CardDescription>Siapkan rekening dan ajukan pencairan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {payoutReady ? (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Rekening Aktif
                </p>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <InfoRow label="Bank" value={summary?.payout_bank_name} />
                  <InfoRow label="Nama" value={summary?.payout_account_name} />
                  <InfoRow label="No. rekening" value={summary?.payout_account_number} />
                  <InfoRow label="WhatsApp" value={summary?.payout_whatsapp} />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center dark:border-white/10">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-white/[0.03]">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                  Rekening pencairan belum diatur
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Tambah rekening dulu supaya bonus bisa dicairkan.
                </p>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={openPayoutDialog} variant="outline" className="h-10 rounded-xl">
                <Download className="mr-2 h-4 w-4" />
                {payoutReady ? "Edit Rekening" : "Tambah Rekening"}
              </Button>
              <Button
                onClick={requestWithdrawal}
                disabled={!canWithdraw || withdrawing}
                className="h-10 rounded-xl"
              >
                <Send className="mr-2 h-4 w-4" />
                Ajukan Cair
              </Button>
            </div>

            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                payoutReady
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
              )}
            >
              {payoutReady
                ? "Rekening siap. Saldo bisa diajukan kalau tersedia."
                : "Lengkapi rekening dulu sebelum ajukan pencairan."}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
          <CardHeader>
            <CardTitle className="text-base">Referral</CardTitle>
            <CardDescription>Tenant yang masuk dari kode kamu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Memuat referral...
              </div>
            ) : referrals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Belum ada tenant referral.
              </div>
            ) : (
              referrals.map((item) => {
                const rewardStatus = item.reward_status || "pending";
                return (
                  <div key={`${item.tenant_slug}-${item.tenant_name}`} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {item.tenant_name || item.tenant_slug || "-"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {item.tenant_slug || "-"}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                          rewardTone[rewardStatus] ||
                            "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300",
                        )}
                      >
                        {statusLabel[rewardStatus] || rewardStatus || "-"}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MiniPanel label="Reward" value={`Rp ${formatIDR(item.reward_amount)}`} />
                      <MiniPanel
                        label="Tenant"
                        value={statusLabel[item.status || ""] || item.status || "-"}
                      />
                      <MiniPanel label="Trial berakhir" value={formatDate(item.trial_ends_at)} />
                      <MiniPanel label="Subscribe" value={formatDate(item.subscribed_at)} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
          <CardHeader>
            <CardTitle className="text-base">Withdrawal</CardTitle>
            <CardDescription>Riwayat pencairan bonus referral.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {withdrawals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Belum ada riwayat pencairan.
              </div>
            ) : (
              withdrawals.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">
                        Rp {formatIDR(item.amount)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                      {statusLabel[item.status || ""] || item.status || "-"}
                    </span>
                  </div>
                  {item.note ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                      {item.note}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {payoutReady ? "Edit rekening pencairan" : "Tambah rekening pencairan"}
            </DialogTitle>
            <DialogDescription>Isi data tujuan bonus referral.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
              Bank, nama pemilik, nomor rekening, dan WhatsApp dipakai untuk konfirmasi pencairan.
            </div>

            <div className="grid gap-3">
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
                  onChange={(e) =>
                    setPayout((prev) => ({ ...prev, account_name: e.target.value }))
                  }
                  placeholder="Sesuai buku rekening"
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
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
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

function Metric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber";
}) {
  const tones = {
    slate: "bg-white/85 text-slate-900 dark:bg-white/[0.04] dark:text-white",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
  };

  return (
    <div
      className={cn(
        "rounded-[1.1rem] border border-slate-200 px-3 py-3 shadow-sm dark:border-white/10",
        tones[tone],
      )}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
        {label}
      </div>
      <div className="mt-1 text-lg font-black tracking-tight break-words">{value}</div>
    </div>
  );
}

function MiniPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-3 dark:border-white/10">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="text-right font-semibold text-slate-950 dark:text-white">
        {value || "-"}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </Label>
      {children}
    </div>
  );
}
