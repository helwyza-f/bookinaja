"use client";

import { useEffect, useMemo, useState } from "react";
import {
  UtensilsCrossed,
  Layers,
  SplitSquareHorizontal,
  PowerOff,
  MonitorSmartphone,
  Store,
  BookOpen,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  defaultTenantProfile,
  type TenantProfile,
} from "@/app/(dashboard)/[tenant]/admin/(internal)/settings/bisnis/sections/types";

type FnbMode = "integrated" | "standalone" | "off";

const MODES: {
  value: FnbMode;
  icon: typeof Layers;
  title: string;
  desc: string;
  example: string;
}[] = [
  {
    value: "integrated",
    icon: Layers,
    title: "Nyatu dengan booking",
    desc: "F&B & add-on muncul saat sesi main dan masuk ke tagihan booking.",
    example: "Gaming lounge, studio musik",
  },
  {
    value: "standalone",
    icon: SplitSquareHorizontal,
    title: "POS Menu terpisah",
    desc: "Menu punya kasir & buku sendiri, lepas dari booking lapangan.",
    example: "Sport center + kafe",
  },
  {
    value: "off",
    icon: PowerOff,
    title: "Matikan",
    desc: "Bookinaja fokus booking lapangan. F&B ditangani aplikasi lain.",
    example: "F&B di Majoo / kasir luar",
  },
];

const EFFECTS: Record<
  FnbMode,
  { controller: string; pos: string; report: string; tone: "on" | "off" | "split" }[]
> = {
  integrated: [
    { controller: "Tampil — customer bisa pesan F&B saat main", pos: "", report: "", tone: "on" },
    { controller: "", pos: "F&B jadi add-on di dalam sesi booking", report: "", tone: "on" },
    { controller: "", pos: "", report: "Satu buku — F&B menyatu dengan pendapatan booking", tone: "on" },
  ],
  standalone: [
    { controller: "Bersih — controller murni kontrol sesi lapangan", pos: "", report: "", tone: "off" },
    { controller: "", pos: "Kasir Menu terpisah, di samping kasir Booking", report: "", tone: "split" },
    { controller: "", pos: "", report: "Dua buku — P&L Booking & Menu terpisah, satu dashboard", tone: "split" },
  ],
  off: [
    { controller: "Bersih — controller murni kontrol sesi lapangan", pos: "", report: "", tone: "off" },
    { controller: "", pos: "Tidak ada F&B di POS", report: "", tone: "off" },
    { controller: "", pos: "", report: "Satu buku — hanya pendapatan booking", tone: "off" },
  ],
};

function deriveMode(profile: TenantProfile): FnbMode {
  const explicit = profile.booking_form_config?.fnb_mode;
  if (explicit) return explicit;
  // Backward-compat: tenant lama tanpa fnb_mode.
  return profile.booking_form_config?.controller_features?.enable_fnb === false
    ? "off"
    : "integrated";
}

export default function MenuModeSettingsPage() {
  const [profile, setProfile] = useState<TenantProfile>(defaultTenantProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<FnbMode>("integrated");
  const [enableAddons, setEnableAddons] = useState(true);

  useEffect(() => {
    api
      .get<TenantProfile>("/admin/profile")
      .then((res) => {
        const p = { ...defaultTenantProfile, ...(res.data || {}) };
        setProfile(p);
        setMode(deriveMode(p));
        setEnableAddons(p.booking_form_config?.controller_features?.enable_addons ?? true);
      })
      .catch(() => toast.error("Gagal memuat pengaturan menu"))
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => {
    const savedMode = deriveMode(profile);
    const savedAddons = profile.booking_form_config?.controller_features?.enable_addons ?? true;
    return mode !== savedMode || enableAddons !== savedAddons;
  }, [mode, enableAddons, profile]);

  const save = async () => {
    setSaving(true);
    try {
      const nextProfile: TenantProfile = {
        ...profile,
        booking_form_config: {
          ...(profile.booking_form_config || {}),
          fnb_mode: mode,
          controller_features: {
            ...(profile.booking_form_config?.controller_features || {}),
            // Controller hanya menampilkan F&B saat mode integrated.
            enable_fnb: mode === "integrated",
            enable_addons: enableAddons,
          },
        },
      };
      const res = await api.put("/admin/profile", nextProfile);
      const saved = { ...defaultTenantProfile, ...(res.data?.data || nextProfile) };
      setProfile(saved);
      toast.success("Mode menu tersimpan");
    } catch {
      toast.error("Gagal menyimpan mode menu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat pengaturan menu…
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
              Menu &amp; F&amp;B
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Cara menu bekerja
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
              Satu pilihan ini menyetir live controller, POS, dan pembukuanmu. Bisa diubah kapan saja.
            </p>
          </div>
        </div>
        <Button
          onClick={save}
          disabled={!dirty || saving}
          className="shrink-0 rounded-xl bg-blue-600 text-white hover:bg-blue-500"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {saving ? "Menyimpan…" : dirty ? "Simpan perubahan" : "Tersimpan"}
        </Button>
      </div>

      {/* Mode cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              aria-pressed={active}
              className={`relative rounded-2xl border-2 p-5 text-left transition ${
                active
                  ? "border-blue-600 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-500/10"
                  : "border-slate-200 bg-white hover:border-blue-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-500/40"
              }`}
            >
              <span
                className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  active ? "border-blue-600 bg-blue-600 dark:border-blue-400 dark:bg-blue-400" : "border-slate-300 dark:border-white/20"
                }`}
              >
                {active ? <Check className="h-3 w-3 text-white" /> : null}
              </span>
              <span
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                  active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
                {m.title}
              </h3>
              <p className="mt-1.5 min-h-10 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                {m.desc}
              </p>
              <div className="mt-3 border-t border-slate-200/70 pt-2.5 text-[11.5px] text-slate-400 dark:border-white/10">
                <span className="font-semibold text-slate-500 dark:text-slate-300">Cocok:</span>{" "}
                {m.example}
              </div>
            </button>
          );
        })}
      </div>

      {/* Effect preview */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10.5px] font-black uppercase tracking-[0.14em] text-slate-400 dark:border-white/10 dark:bg-white/[0.03]">
          Efek ke seluruh produk
        </div>
        <EffectRow
          icon={MonitorSmartphone}
          label="Live controller"
          hint="customer"
          text={EFFECTS[mode][0].controller}
          tone={EFFECTS[mode][0].tone}
        />
        <EffectRow
          icon={Store}
          label="POS"
          hint="kasir"
          text={EFFECTS[mode][1].pos}
          tone={EFFECTS[mode][1].tone}
        />
        <EffectRow
          icon={BookOpen}
          label="Laporan"
          hint="pembukuan"
          text={EFFECTS[mode][2].report}
          tone={EFFECTS[mode][2].tone}
        />
      </div>

      {/* Add-on toggle (controller-related) */}
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Add-on saat sesi</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Add-on resource (mis. stik tambahan, sewa alat) bisa dipesan customer saat sesi berjalan.
            {mode !== "integrated" ? " Hanya berlaku saat mode nyatu dengan booking." : ""}
          </p>
        </div>
        <Switch
          checked={enableAddons}
          onCheckedChange={setEnableAddons}
          disabled={mode !== "integrated"}
        />
      </div>
    </main>
  );
}

function EffectRow({
  icon: Icon,
  label,
  hint,
  text,
  tone,
}: {
  icon: typeof Layers;
  label: string;
  hint: string;
  text: string;
  tone: "on" | "off" | "split";
}) {
  const pill =
    tone === "on"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      : tone === "split"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
        : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400";
  const dot =
    tone === "on" ? "bg-emerald-500" : tone === "split" ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className="grid grid-cols-[150px_1fr] items-center gap-3 border-b border-slate-100 px-5 py-3.5 last:border-b-0 dark:border-white/5">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-slate-400" />
        <div>
          <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{label}</div>
          <div className="text-[11px] text-slate-400">{hint}</div>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <span className={`inline-flex h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${pill}`}>
          {tone === "on" ? "Aktif" : tone === "split" ? "Terpisah" : "Bersih"}
        </span>
        <span className="text-[13px] text-slate-600 dark:text-slate-300">{text}</span>
      </div>
    </div>
  );
}
