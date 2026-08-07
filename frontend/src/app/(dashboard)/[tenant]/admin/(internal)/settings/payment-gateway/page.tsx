"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Radio,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";
import api from "@/lib/api";
import { analyzeTenantFeatureAccess } from "@/lib/plan-access";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { PlanFeatureCallout } from "@/components/dashboard/plan-feature-ux";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://api.bookinaja.local:8080/api/v1";

type Provider = "midtrans" | "xendit";
type Environment = "sandbox" | "production";

type AdminView = {
  provider: string;
  environment: string;
  client_key: string;
  server_key_masked: string;
  server_key_set: boolean;
  callback_secret_set: boolean;
  status: string;
  last_error?: string;
  verified_at?: string;
  updated_at: string;
};

const PROVIDER_INFO: Record<Provider, { label: string; desc: string }> = {
  midtrans: {
    label: "Midtrans",
    desc: "QRIS, Virtual Account, E-wallet, Kartu Kredit",
  },
  xendit: {
    label: "Xendit",
    desc: "QRIS, Virtual Account, E-wallet, Direct Debit",
  },
};

const STATUS_UI: Record<string, { icon: typeof Shield; label: string; tone: string }> = {
  verified: {
    icon: ShieldCheck,
    label: "Terverifikasi",
    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  unverified: {
    icon: ShieldAlert,
    label: "Belum diverifikasi",
    tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  disabled: {
    icon: Shield,
    label: "Nonaktif",
    tone: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400",
  },
};

export default function PaymentGatewaySettingsPage() {
  const { user } = useAdminSession();

  const [data, setData] = useState<AdminView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Form state
  const [provider, setProvider] = useState<Provider>("midtrans");
  const [environment, setEnvironment] = useState<Environment>("sandbox");
  const [serverKey, setServerKey] = useState("");
  const [clientKey, setClientKey] = useState("");
  const [callbackSecret, setCallbackSecret] = useState("");
  const [showServerKey, setShowServerKey] = useState(false);
  const [showCallbackSecret, setShowCallbackSecret] = useState(false);

  const planGate = useMemo(
    () =>
      analyzeTenantFeatureAccess(user || {}, {
        anyFeatures: ["payment_method_management"],
      }),
    [user],
  );
  const featureLocked = planGate.state !== "available";

  const tenantId = useMemo(() => {
    const u = user as Record<string, unknown> | null;
    return String(u?.tenant_id || u?.tenantID || u?.tenantId || "");
  }, [user]);

  const webhookUrl = useMemo(() => {
    const base = API_BASE.replace("/api/v1", "");
    if (provider === "xendit" && tenantId) {
      return `${base}/webhooks/xendit/${tenantId}`;
    }
    return `${base}/webhooks/midtrans`;
  }, [provider, tenantId]);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/payment-gateway");
      const view: AdminView | null = res.data?.data || null;
      setData(view);
      if (view && view.provider) {
        setProvider(view.provider as Provider);
        setEnvironment(view.environment as Environment);
        setClientKey(view.client_key || "");
        // Don't overwrite server key / secret — masked values are display-only
        setServerKey("");
        setCallbackSecret("");
      }
    } catch {
      // Not configured yet — that's fine
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!featureLocked) void fetchConfig();
    else setLoading(false);
  }, [featureLocked, fetchConfig]);

  const handleSave = async () => {
    if (!serverKey.trim() && !data?.server_key_set) {
      toast.error("Server key wajib diisi");
      return;
    }
    if (provider === "midtrans" && !clientKey.trim() && !data?.client_key) {
      toast.error("Client key wajib diisi untuk Midtrans");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        provider,
        environment,
      };
      // Only send keys if user entered new values
      if (serverKey.trim()) payload.server_key = serverKey.trim();
      if (clientKey.trim()) payload.client_key = clientKey.trim();
      if (callbackSecret.trim()) payload.callback_secret = callbackSecret.trim();

      const res = await api.put("/admin/payment-gateway", payload);
      setData(res.data?.data || null);
      setServerKey("");
      setCallbackSecret("");
      toast.success("Konfigurasi gateway disimpan");
    } catch (error) {
      const err = error as AxiosError<{ error?: string }>;
      toast.error(err.response?.data?.error || "Gagal menyimpan konfigurasi");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await api.post("/admin/payment-gateway/test");
      setData(res.data?.data || null);
      toast.success("Koneksi berhasil — gateway terverifikasi!");
    } catch (error) {
      const err = error as AxiosError<{ error?: string }>;
      toast.error(err.response?.data?.error || "Koneksi gagal");
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete("/admin/payment-gateway");
      setData(null);
      setServerKey("");
      setClientKey("");
      setCallbackSecret("");
      setProvider("midtrans");
      setEnvironment("sandbox");
      setConfirmDelete(false);
      toast.success("Konfigurasi gateway dihapus");
    } catch (error) {
      const err = error as AxiosError<{ error?: string }>;
      toast.error(err.response?.data?.error || "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const copyWebhookUrl = () => {
    void navigator.clipboard.writeText(webhookUrl);
    toast.success("URL webhook disalin");
  };

  const statusInfo = STATUS_UI[data?.status || ""] || STATUS_UI.unverified;
  const StatusIcon = statusInfo.icon;

  const isConfigured = Boolean(data && data.provider && data.server_key_set);
  const hasUnsavedChanges =
    serverKey.trim() !== "" || callbackSecret.trim() !== "" ||
    (data && (provider !== data.provider || environment !== data.environment)) ||
    (data && clientKey.trim() !== "" && clientKey !== data.client_key) ||
    (!data && (serverKey.trim() || clientKey.trim()));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      <PlanFeatureCallout
        input={user || {}}
        title="Payment Gateway"
        description="Hubungkan gateway pembayaran milikmu untuk menerima uang langsung ke akun bisnismu."
        requirement={{ anyFeatures: ["payment_method_management"] }}
      />

      {/* Header */}
      <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              Gateway
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              Payment Gateway
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Hubungkan Midtrans atau Xendit — uang booking dan POS langsung masuk ke akunmu.
            </p>
          </div>
          {isConfigured ? (
            <div className="flex items-center gap-2">
              <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium", statusInfo.tone)}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusInfo.label}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Main form */}
      <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
        {/* Provider selector */}
        <div className="border-b border-slate-100 px-5 py-4 dark:border-white/5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            Provider
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pilih provider payment gateway.
          </p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {(Object.entries(PROVIDER_INFO) as [Provider, { label: string; desc: string }][]).map(
            ([key, info]) => (
              <button
                key={key}
                type="button"
                onClick={() => setProvider(key)}
                disabled={featureLocked}
                className={cn(
                  "rounded-xl border px-4 py-4 text-left transition-colors",
                  provider === key
                    ? "border-blue-500 bg-blue-50 dark:border-blue-400/50 dark:bg-blue-500/10"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "rounded-xl p-2.5",
                    provider === key
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                      : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400",
                  )}>
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">
                      {info.label}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {info.desc}
                    </div>
                  </div>
                </div>
              </button>
            ),
          )}
        </div>

        {/* Environment */}
        <div className="border-t border-slate-100 px-5 py-4 dark:border-white/5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            Environment
          </p>
          <div className="mt-3 flex gap-2">
            {(["sandbox", "production"] as Environment[]).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => setEnvironment(env)}
                disabled={featureLocked}
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                  environment === env
                    ? env === "production"
                      ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                      : "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400/50 dark:bg-blue-500/10 dark:text-blue-300"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20",
                )}
              >
                {env === "sandbox" ? "Sandbox" : "Production"}
              </button>
            ))}
          </div>
          {environment === "production" ? (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Mode production — transaksi nyata akan diproses.
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Mode sandbox — gunakan untuk testing sebelum go-live.
            </p>
          )}
        </div>

        {/* Credentials */}
        <div className="border-t border-slate-100 px-5 py-4 dark:border-white/5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            Kredensial
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Ambil dari dashboard {PROVIDER_INFO[provider].label}. Key disimpan terenkripsi.
          </p>
        </div>
        <div className="space-y-4 px-5 pb-5">
          {/* Server Key */}
          <div>
            <Label className="mb-1.5 flex items-center gap-2 text-sm">
              <Key className="h-3.5 w-3.5 text-slate-400" />
              Server Key
              {data?.server_key_set ? (
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Sudah diisi
                </span>
              ) : null}
            </Label>
            <div className="relative">
              <Input
                type={showServerKey ? "text" : "password"}
                placeholder={data?.server_key_masked || "Masukkan server key..."}
                value={serverKey}
                onChange={(e) => setServerKey(e.target.value)}
                disabled={featureLocked}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowServerKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showServerKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Client Key (Midtrans only) */}
          {provider === "midtrans" ? (
            <div>
              <Label className="mb-1.5 flex items-center gap-2 text-sm">
                <Key className="h-3.5 w-3.5 text-slate-400" />
                Client Key
                {data?.client_key ? (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Sudah diisi
                  </span>
                ) : null}
              </Label>
              <Input
                type="text"
                placeholder={data?.client_key || "Masukkan client key..."}
                value={clientKey}
                onChange={(e) => setClientKey(e.target.value)}
                disabled={featureLocked}
              />
              <p className="mt-1 text-xs text-slate-400">
                Digunakan di browser customer untuk Snap.js — bersifat publik.
              </p>
            </div>
          ) : null}

          {/* Callback Secret (Xendit only) */}
          {provider === "xendit" ? (
            <div>
              <Label className="mb-1.5 flex items-center gap-2 text-sm">
                <Shield className="h-3.5 w-3.5 text-slate-400" />
                Callback Verification Token
                {data?.callback_secret_set ? (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Sudah diisi
                  </span>
                ) : null}
              </Label>
              <div className="relative">
                <Input
                  type={showCallbackSecret ? "text" : "password"}
                  placeholder="Masukkan callback token..."
                  value={callbackSecret}
                  onChange={(e) => setCallbackSecret(e.target.value)}
                  disabled={featureLocked}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCallbackSecret((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCallbackSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Digunakan untuk memverifikasi webhook dari Xendit.
              </p>
            </div>
          ) : null}

          {/* Save button */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={() => void handleSave()}
              disabled={featureLocked || saving || !hasUnsavedChanges}
              className="h-10 rounded-xl px-5"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
            {isConfigured ? (
              <Button
                variant="outline"
                onClick={() => void handleTest()}
                disabled={featureLocked || testing}
                className="h-10 rounded-xl px-5"
              >
                {testing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Test Koneksi
              </Button>
            ) : null}
          </div>

          {/* Last error */}
          {data?.last_error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              <p className="font-semibold">Error terakhir:</p>
              <p className="mt-1">{data.last_error}</p>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Webhook URL */}
      {isConfigured || hasUnsavedChanges ? (
        <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-white/5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Webhook
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Paste URL ini di dashboard {PROVIDER_INFO[provider].label} sebagai webhook notification URL.
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <span className="block truncate">{webhookUrl}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={copyWebhookUrl}
                className="h-11 shrink-0 rounded-xl px-3"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {provider === "midtrans"
                ? "Midtrans: paste di Settings → Configuration → Payment Notification URL."
                : "Xendit: paste di Settings → Developers → Webhooks → tambahkan URL."}
            </p>
          </div>
        </Card>
      ) : null}

      {/* Status detail card */}
      {isConfigured ? (
        <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-white/5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Status
            </p>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatusStat label="Provider" value={PROVIDER_INFO[data?.provider as Provider]?.label || data?.provider || "-"} />
              <StatusStat label="Environment" value={data?.environment === "production" ? "Production" : "Sandbox"} />
              <StatusStat
                label="Verifikasi"
                value={
                  data?.verified_at
                    ? new Date(data.verified_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Belum"
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  Hapus konfigurasi
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Metode pembayaran otomatis akan dinonaktifkan.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={featureLocked || deleting}
                className="h-9 rounded-xl px-3 text-xs"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Hapus
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hapus konfigurasi gateway?</DialogTitle>
            <DialogDescription>
              Kredensial akan dihapus dan metode pembayaran otomatis (Midtrans/Xendit) akan
              dinonaktifkan. Customer hanya bisa menggunakan metode manual sampai konfigurasi baru
              disimpan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} className="rounded-xl">
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="rounded-xl"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Ya, hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}
