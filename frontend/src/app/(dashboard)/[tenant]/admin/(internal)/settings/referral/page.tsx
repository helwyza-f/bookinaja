"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BadgeCheck,
  Banknote,
  Copy,
  Download,
  ExternalLink,
  Fingerprint,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
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

const formatIDR = (value?: number) => new Intl.NumberFormat("id-ID").format(Number(value || 0));

const statusLabel: Record<string, string> = {
  active: "Aktif",
  trial: "Trial",
  pending: "Menunggu cair",
  approved: "Disetujui",
  rejected: "Ditolak",
  paid: "Dibayar",
  available: "Tersedia",
  pending_withdrawal: "Menunggu pencairan",
  withdrawn: "Sudah dicairkan",
};

const rewardTone: Record<string, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  withdrawn: "border-blue-200 bg-blue-50 text-blue-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
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
      const nextReferrals = referralsRes.data?.data ?? referralsRes.data?.items ?? referralsRes.data ?? [];
      const nextWithdrawals = withdrawalsRes.data?.data ?? withdrawalsRes.data?.items ?? withdrawalsRes.data ?? [];
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
    if (!payout.bank_name.trim() || !payout.account_name.trim() || !payout.account_number.trim() || !payout.whatsapp.trim()) {
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
      setPayout({
        bank_name: updated.payout_bank_name || payout.bank_name,
        account_name: updated.payout_account_name || payout.account_name,
        account_number: updated.payout_account_number || payout.account_number,
        whatsapp: updated.payout_whatsapp || payout.whatsapp,
      });
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
      setMessage("Request pencairan gagal. Pastikan saldo dan rekening pencairan sudah lengkap.");
    } finally {
      setWithdrawing(false);
    }
  };

  const payoutReady = Boolean(
    summary?.payout_bank_name && summary?.payout_account_name && summary?.payout_account_number && summary?.payout_whatsapp,
  );
  const canWithdraw = (summary?.available_balance || 0) > 0 && payoutReady;
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
    <div className="space-y-4 p-3 pb-24 sm:space-y-6 sm:p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Share2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">Referral</div>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Kode referral, konversi, dan saldo bonus
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-500">
                Bagikan link referral ke customer aktif. Bonus Rp100.000 masuk sekali saat tenant yang direfer benar-benar subscribe pertama kali.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={loadData} className="w-full justify-center">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={requestWithdrawal}
              disabled={!canWithdraw || withdrawing || loading}
              className="w-full justify-center"
            >
              <Banknote className="mr-2 h-4 w-4" />
              Ajukan Pencairan
            </Button>
            <Button
              asChild
              variant="default"
              className="w-full justify-center bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
            >
              <Link href="/admin/settings/billing">
                <ExternalLink className="mr-2 h-4 w-4" />
                Cek Billing
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {message}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Kode referral", value: summary?.referral_code || "-", icon: Fingerprint },
          { label: "Total referral", value: String(summary?.total_referred || 0), icon: Share2 },
          { label: "Saldo tersedia", value: `Rp ${formatIDR(summary?.available_balance)}`, icon: Wallet },
          { label: "Menunggu cair", value: `Rp ${formatIDR(summary?.pending_withdrawal)}`, icon: ShieldCheck },
        ].map((item) => (
          <Card key={item.label} className="border-slate-200 bg-white shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
                  <div className="text-lg font-semibold text-slate-950 dark:text-white break-words">{item.value}</div>
                </div>
                <item.icon className="h-5 w-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Link referral</CardTitle>
            <CardDescription>Copy link ini lalu bagikan ke customer aktif yang ingin kamu refer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Referral code</div>
              <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                {summary?.referral_code || "Belum tersedia"}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button onClick={copyReferralLink} disabled={!referralUrl} className="w-full sm:w-auto">
                  <Copy className="mr-2 h-4 w-4" />
                  Salin Link
                </Button>
                <div className="min-w-0 flex-1 rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-white/10">
                  {referralUrl || "Link akan muncul setelah data referral tersedia"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Aktif</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{summary?.active_referred || 0}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Trial</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{summary?.trial_referred || 0}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status payout</div>
                <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                  {payoutReady ? "Siap cair" : "Belum lengkap"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                <BadgeCheck className="h-4 w-4 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]" />
                Kapan bonus masuk?
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Bonus muncul sekali saja, tepat saat tenant yang direfer berhasil jadi subscriber aktif untuk pertama kali.
              </p>
            </div>

          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Rekening pencairan</CardTitle>
            <CardDescription>Rekening tujuan transfer bonus referral.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {payoutReady ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rekening aktif</div>
                  <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                    Siap cair
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <InfoRow label="Bank" value={summary?.payout_bank_name} />
                  <InfoRow label="Nama" value={summary?.payout_account_name} />
                  <InfoRow label="No. rekening" value={summary?.payout_account_number} />
                  <InfoRow label="WhatsApp" value={summary?.payout_whatsapp} />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-white/10">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                  Rekening pencairan belum diatur
                </div>
                <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                  Tambahkan rekening dulu sebelum ajukan pencairan referral.
                </p>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={openPayoutDialog} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {payoutReady ? "Edit Rekening" : "Tambah Rekening"}
              </Button>
              <Button
                onClick={requestWithdrawal}
                disabled={!canWithdraw || withdrawing}
                className="w-full"
              >
                <Send className="mr-2 h-4 w-4" />
                Ajukan Cair
              </Button>
            </div>

            <div
              className={cn(
                "rounded-2xl border p-4 text-sm",
                payoutReady
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
              )}
            >
              {payoutReady ? "Rekening pencairan sudah lengkap." : "Lengkapi rekening pencairan sebelum ajukan request."}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <CardHeader>
            <CardTitle className="text-base">Daftar referral</CardTitle>
            <CardDescription>Status trial dan subscription customer yang kamu refer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-sm text-slate-500">Memuat...</div>
            ) : referrals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-white/10">
                Belum ada customer yang direfer.
              </div>
            ) : (
              referrals.map((item) => {
                const rewardStatus = item.reward_status || "pending";
                return (
                <div key={`${item.tenant_slug}-${item.tenant_name}`} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {item.tenant_name || item.tenant_slug || "-"}
                      </div>
                      <div className="text-xs text-slate-500">{item.tenant_slug || "-"}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                      <div
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                          rewardTone[rewardStatus] || "border-slate-200 bg-slate-50 text-slate-600",
                        )}
                      >
                        {statusLabel[rewardStatus] || rewardStatus || "Belum reward"}
                      </div>
                      <div className="text-sm font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">Rp {formatIDR(item.reward_amount)}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Trial berakhir</span>
                      <span className="mt-1 block text-slate-700 dark:text-slate-200">{formatDate(item.trial_ends_at)}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Subscribe</span>
                      <span className="mt-1 block text-slate-700 dark:text-slate-200">{formatDate(item.subscribed_at)}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Status tenant</span>
                      <span className="mt-1 block text-slate-700 dark:text-slate-200">{statusLabel[item.status || ""] || item.status || "-"}</span>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <CardHeader>
            <CardTitle className="text-base">Riwayat pencairan</CardTitle>
            <CardDescription>Request yang pernah diajukan dan status prosesnya.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {withdrawals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-white/10">
                Belum ada riwayat pencairan.
              </div>
            ) : (
              withdrawals.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">Rp {formatIDR(item.amount)}</div>
                      <div className="text-xs text-slate-500">{item.created_at || "-"}</div>
                    </div>
                    <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                      {statusLabel[item.status || ""] || item.status || "-"}
                    </div>
                  </div>
                  {item.note ? <div className="mt-2 text-sm text-slate-500">{item.note}</div> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{payoutReady ? "Edit rekening pencairan" : "Tambah rekening pencairan"}</DialogTitle>
            <DialogDescription>
              Data ini dipakai tim Bookinaja untuk transfer bonus referral.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Nama bank</Label>
              <Input
                id="bank_name"
                value={payout.bank_name}
                onChange={(e) => setPayout((prev) => ({ ...prev, bank_name: e.target.value }))}
                placeholder="BCA / BRI / Mandiri"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_name">Nama pemilik rekening</Label>
              <Input
                id="account_name"
                value={payout.account_name}
                onChange={(e) => setPayout((prev) => ({ ...prev, account_name: e.target.value }))}
                placeholder="Sesuai buku rekening"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_number">Nomor rekening</Label>
              <Input
                id="account_number"
                value={payout.account_number}
                onChange={(e) => setPayout((prev) => ({ ...prev, account_number: e.target.value }))}
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp konfirmasi</Label>
              <Input
                id="whatsapp"
                value={payout.whatsapp}
                onChange={(e) => setPayout((prev) => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPayoutDialogOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="button" onClick={savePayout} disabled={saving}>
              <Download className="mr-2 h-4 w-4" />
              Simpan Rekening
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="text-right font-semibold text-slate-950 dark:text-white">{value || "-"}</span>
    </div>
  );
}
