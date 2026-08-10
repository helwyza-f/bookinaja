"use client";

import { useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import { CalendarX2, Save } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type CancellationSettings = {
  customer_cancel_enabled: boolean;
  cutoff_hours: number;
  refund_mode: "forfeit" | "full";
  require_reason: boolean;
  allowed_statuses: string;
};

const DEFAULTS: CancellationSettings = {
  customer_cancel_enabled: false,
  cutoff_hours: 0,
  refund_mode: "forfeit",
  require_reason: false,
  allowed_statuses: "pending,confirmed",
};

const STATUS_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: "pending", label: "Pending", desc: "Belum dikonfirmasi / belum bayar" },
  { value: "confirmed", label: "Confirmed", desc: "Sudah dikonfirmasi, sesi belum mulai" },
];

const REFUND_MODES: { value: "forfeit" | "full"; label: string; desc: string }[] = [
  { value: "forfeit", label: "DP hangus", desc: "Uang yang sudah dibayar tidak dikembalikan" },
  { value: "full", label: "Refund penuh", desc: "Uang dikembalikan penuh (diproses manual via gateway)" },
];

const sanitizeInt = (value: string) => value.replace(/[^\d]/g, "");

export default function CancellationSettingsPage() {
  const [settings, setSettings] = useState<CancellationSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const allowed = useMemo(
    () =>
      new Set(
        (settings.allowed_statuses || "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      ),
    [settings.allowed_statuses],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/cancellation-settings");
        const data = res.data || {};
        setSettings({
          customer_cancel_enabled: Boolean(data.customer_cancel_enabled),
          cutoff_hours: Number(data.cutoff_hours ?? 0),
          refund_mode: data.refund_mode === "full" ? "full" : "forfeit",
          require_reason: Boolean(data.require_reason),
          allowed_statuses: String(data.allowed_statuses || DEFAULTS.allowed_statuses),
        });
      } catch {
        toast.error("Gagal memuat kebijakan pembatalan");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const toggleStatus = (value: string, checked: boolean) => {
    setSettings((current) => {
      const next = new Set(
        (current.allowed_statuses || "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      );
      if (checked) next.add(value);
      else next.delete(value);
      // Pertahankan urutan pending -> confirmed.
      const ordered = STATUS_OPTIONS.map((o) => o.value).filter((v) => next.has(v));
      return { ...current, allowed_statuses: ordered.join(",") };
    });
  };

  const save = async () => {
    if (settings.customer_cancel_enabled && allowed.size === 0) {
      toast.error("Pilih minimal satu status yang boleh dibatalkan.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer_cancel_enabled: settings.customer_cancel_enabled,
        cutoff_hours: Number(settings.cutoff_hours || 0),
        refund_mode: settings.refund_mode,
        require_reason: settings.require_reason,
        allowed_statuses: settings.allowed_statuses || DEFAULTS.allowed_statuses,
      };
      await api.put("/admin/cancellation-settings", payload);
      toast.success("Kebijakan pembatalan diperbarui");
    } catch (error) {
      const err = error as AxiosError<{ error?: string }>;
      toast.error(err.response?.data?.error || "Gagal menyimpan kebijakan pembatalan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0f0f17]">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            <CalendarX2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-950 dark:text-white">Kebijakan Pembatalan</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Atur apakah customer boleh membatalkan booking sendiri, dan aturannya.
            </p>
          </div>
        </div>
      </Card>

      <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0f0f17]">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Izinkan customer membatalkan sendiri
              </div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Kalau nonaktif, hanya admin yang bisa membatalkan booking.
              </div>
            </div>
            <Switch
              checked={settings.customer_cancel_enabled}
              onCheckedChange={(checked) =>
                setSettings((c) => ({ ...c, customer_cancel_enabled: checked }))
              }
            />
          </div>

          <div
            className={cn(
              "space-y-6 transition-opacity",
              settings.customer_cancel_enabled ? "opacity-100" : "pointer-events-none opacity-50",
            )}
          >
            <div>
              <Label className="mb-2 block">Status yang boleh dibatalkan customer</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {STATUS_OPTIONS.map((opt) => {
                  const active = allowed.has(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleStatus(opt.value, !active)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left transition-colors",
                        active
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04]",
                      )}
                    >
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">{opt.label}</div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Sesi yang sudah aktif tidak bisa dibatalkan — harus diakhiri.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
              <div>
                <Label>Batas waktu (jam sebelum jadwal)</Label>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={String(settings.cutoff_hours)}
                  onChange={(e) =>
                    setSettings((c) => ({ ...c, cutoff_hours: Number(sanitizeInt(e.target.value) || 0) }))
                  }
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                {settings.cutoff_hours > 0
                  ? `Customer hanya bisa membatalkan sampai ${settings.cutoff_hours} jam sebelum jadwal mulai.`
                  : "0 = boleh dibatalkan kapan saja selama status masih memenuhi syarat."}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Wajib isi alasan</div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Customer harus menuliskan alasan saat membatalkan.
                </div>
              </div>
              <Switch
                checked={settings.require_reason}
                onCheckedChange={(checked) => setSettings((c) => ({ ...c, require_reason: checked }))}
              />
            </div>

            <div>
              <Label className="mb-2 block">Kebijakan dana</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {REFUND_MODES.map((mode) => {
                  const active = settings.refund_mode === mode.value;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setSettings((c) => ({ ...c, refund_mode: mode.value }))}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left transition-colors",
                        active
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04]",
                      )}
                    >
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">{mode.label}</div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{mode.desc}</div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Catatan: Bookinaja tidak menggerakkan dana. Pilihan ini hanya kebijakan tercatat —
                refund penuh diproses manual lewat dashboard gateway kamu.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
