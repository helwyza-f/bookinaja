"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Gift,
  Link2,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
  Users,
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
    const url = new URL("https://bookinaja.com/signup");
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

  const shareReferralLink = async () => {
    if (!referralUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: "Bookinaja Referral",
        text: "Coba Bookinaja untuk booking, POS, dan operasional tenant.",
        url: referralUrl,
      });
      return;
    }
    await copyReferralLink();
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

  const totalReferred = summary?.total_referred || 0;
  const activeReferred = summary?.active_referred || 0;
  const trialReferred = summary?.trial_referred || 0;
  const conversionRate = totalReferred > 0 ? Math.round((activeReferred / totalReferred) * 100) : 0;

  return (
    <div className="space-y-3 px-3 py-3 pb-16 sm:space-y-4 sm:px-4 lg:px-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Referral program
            </div>
            <h1 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
              Refer owner baru, pantau bonus dari satu layar.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Salin link, cek saldo tersedia, dan ajukan pencairan tanpa keluar dari halaman admin.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={copyReferralLink} disabled={!referralUrl} className="rounded-xl">
                <Copy className="mr-2 h-4 w-4" />
                Salin link
              </Button>
              <Button
                onClick={shareReferralLink}
                disabled={!referralUrl}
                variant="outline"
                className="rounded-xl"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Bagikan
              </Button>
              <Button
                onClick={loadData}
                variant="outline"
                className="rounded-xl"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={requestWithdrawal}
                disabled={!canWithdraw || withdrawing || loading}
                className="rounded-xl"
              >
                <Banknote className="mr-2 h-4 w-4" />
                Ajukan cair
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Saldo tersedia</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">Rp {formatIDR(summary?.available_balance)}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
                <Trophy className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4">
              <HeroMiniStat label="Referral" value={String(totalReferred)} />
              <HeroMiniStat label="Aktif" value={String(activeReferred)} />
              <HeroMiniStat label="Trial" value={String(trialReferred)} />
              <HeroMiniStat label="Convert" value={`${conversionRate}%`} />
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {message}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile icon={Wallet} label="Saldo cair" value={`Rp ${formatIDR(summary?.available_balance)}`} tone="emerald" />
        <MetricTile icon={Clock3} label="Menunggu" value={`Rp ${formatIDR(summary?.pending_withdrawal)}`} tone="amber" />
        <MetricTile icon={Users} label="Referral masuk" value={String(totalReferred)} tone="blue" />
        <MetricTile icon={Target} label="Subscriber aktif" value={`${activeReferred}/${totalReferred}`} tone="violet" />
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                <Link2 className="h-4 w-4 text-blue-600" />
                Link siap dibagikan
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Kirim ke owner bisnis yang butuh booking, POS, dan laporan operasional.
              </p>
            </div>
            <StatusPill active={Boolean(summary?.referral_code)}>
              {summary?.referral_code ? "Kode aktif" : "Menyiapkan kode"}
            </StatusPill>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Kode</div>
                <div className="mt-1 font-mono text-lg font-semibold text-slate-950 dark:text-white">
                  {summary?.referral_code || (loading ? "Memuat..." : "-")}
                </div>
              </div>
              <div className="min-w-0 flex-1 truncate rounded-xl bg-white px-3 py-3 font-mono text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {referralUrl || "Link akan muncul setelah kode tersedia"}
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={copyReferralLink} disabled={!referralUrl} className="rounded-xl">
                  <Copy className="mr-2 h-4 w-4" />
                  Salin
                </Button>
                <Button type="button" variant="outline" onClick={shareReferralLink} disabled={!referralUrl} className="rounded-xl">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-base font-semibold text-slate-950 dark:text-white">Cara bonus jalan</h3>
          <div className="mt-4 space-y-3">
            <StepLine index="1" title="Owner daftar" text="Mereka signup lewat link referral kamu." />
            <StepLine index="2" title="Workspace aktif" text="Tenant dibuat dan mulai pakai Bookinaja." />
            <StepLine index="3" title="Bonus cair" text="Reward masuk saat subscription aktif." />
          </div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                <Wallet className="h-4 w-4 text-emerald-600" />
                Payout
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Rekening pencairan bonus.
              </p>
            </div>
            <StatusPill active={payoutReady}>{payoutReady ? "Siap" : "Belum lengkap"}</StatusPill>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
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

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
            <Gift className="h-4 w-4 text-amber-500" />
            Status program
          </h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <RuleLine>Reward dihitung saat referral berubah menjadi subscriber aktif.</RuleLine>
            <RuleLine>Saldo pending menunggu review pencairan.</RuleLine>
            <RuleLine>Rekening payout harus lengkap sebelum request cair.</RuleLine>
          </div>
          <Button asChild variant="outline" className="mt-5 w-full rounded-xl">
            <Link href="/admin/settings/billing">
              Cek billing tenant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <ListHeader title="Referral pipeline" subtitle="Tenant yang masuk dari kode kamu." />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <EmptyLine label="Memuat referral..." />
            ) : referrals.length === 0 ? (
              <EmptyAction
                icon={Users}
                title="Belum ada referral masuk"
                text="Mulai dari share link ke owner yang sudah kamu kenal."
                action={
                  <Button onClick={copyReferralLink} disabled={!referralUrl} size="sm" className="rounded-xl">
                    <Copy className="mr-2 h-4 w-4" />
                    Salin link
                  </Button>
                }
              />
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

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <ListHeader title="Withdrawal" subtitle="Riwayat pencairan bonus." />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {withdrawals.length === 0 ? (
              <EmptyAction
                icon={Banknote}
                title="Belum ada pencairan"
                text={payoutReady ? "Request pencairan akan muncul di sini." : "Lengkapi rekening payout dulu agar saldo bisa dicairkan."}
                action={
                  <Button onClick={openPayoutDialog} variant="outline" size="sm" className="rounded-xl">
                    <Wallet className="mr-2 h-4 w-4" />
                    {payoutReady ? "Edit rekening" : "Tambah rekening"}
                  </Button>
                }
              />
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

function HeroMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.06]">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "emerald" | "amber" | "blue" | "violet";
}) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
            {value}
          </div>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function StepLine({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        {index}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-950 dark:text-white">{title}</div>
        <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{text}</div>
      </div>
    </div>
  );
}

function EmptyAction({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action: ReactNode;
}) {
  return (
    <div className="p-5">
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-white/[0.03]">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-slate-900">
          <Icon className="h-5 w-5" />
        </div>
        <h4 className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{title}</h4>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{text}</p>
        <div className="mt-4 flex justify-center">{action}</div>
      </div>
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
