"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  CreditCard,
  Loader2,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  HandCoins,
} from "lucide-react";
import { toast } from "sonner";
import { AdminHeader, SectionCard } from "@/components/platform/admin-kit";
import {
  getPlatformPaymentGateway,
  updatePlatformPaymentGateway,
  type PlatformPaymentGatewaySetting,
} from "@/lib/platform-admin";

const GATEWAYS: { value: "midtrans" | "xendit"; label: string; note: string }[] = [
  { value: "midtrans", label: "Midtrans", note: "Snap popup (default)" },
  { value: "xendit", label: "Xendit", note: "Invoice redirect" },
];

const sections = [
  { href: "/dashboard/overview", title: "Overview", desc: "Ringkasan data platform", icon: BadgeCheck },
  { href: "/dashboard/tenants", title: "Tenant", desc: "Directory tenant aktif", icon: ShieldCheck },
  { href: "/dashboard/emails", title: "Email logs", desc: "Audit email programatik", icon: Mail },
  { href: "/dashboard/discovery", title: "Discovery editorial", desc: "Override featured order", icon: Sparkles },
  { href: "/dashboard/settings/plans", title: "Plans & entitlements", desc: "Atur akses per plan", icon: SlidersHorizontal },
  { href: "/dashboard/referral-withdrawals", title: "Referral payout", desc: "Review pencairan", icon: HandCoins },
];

function PaymentGatewayCard() {
  const [setting, setSetting] = useState<PlatformPaymentGatewaySetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getPlatformPaymentGateway()
      .then((data) => {
        if (alive) setSetting(data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const select = async (value: "midtrans" | "xendit") => {
    if (!setting || saving || setting.active_gateway === value) return;
    if (value === "xendit" && !setting.xendit_configured) {
      toast.error("Key Xendit belum dikonfigurasi di server (XENDIT_SECRET_KEY & XENDIT_CALLBACK_TOKEN).");
      return;
    }
    setSaving(value);
    try {
      const res = await updatePlatformPaymentGateway(value);
      setSetting(res.data?.data ?? { ...setting, active_gateway: value });
      toast.success(`Gateway pembayaran: ${value === "xendit" ? "Xendit" : "Midtrans"}`);
    } catch {
      toast.error("Gagal mengubah gateway pembayaran");
    } finally {
      setSaving(null);
    }
  };

  return (
    <SectionCard title="Payment gateway">
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Gateway aktif untuk semua tenant. Key rahasia diatur lewat env server.
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {GATEWAYS.map((g) => {
              const active = setting?.active_gateway === g.value;
              const configured =
                g.value === "xendit" ? setting?.xendit_configured : setting?.midtrans_configured;
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => select(g.value)}
                  disabled={Boolean(saving)}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition disabled:opacity-60 ${
                    active
                      ? "border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10"
                      : "border-[var(--admin-line)] hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {g.label}
                    </span>
                    {saving === g.value ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    ) : active ? (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white">
                        Aktif
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-slate-500">{g.note}</span>
                  <span
                    className={`text-[11px] font-medium ${
                      configured ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {configured ? "Key terkonfigurasi" : "Key belum diset di server"}
                  </span>
                </button>
              );
            })}
          </div>
          {setting && !setting.xendit_configured ? (
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Untuk mengaktifkan Xendit, set <code>XENDIT_SECRET_KEY</code> dan{" "}
              <code>XENDIT_CALLBACK_TOKEN</code> di env server, lalu muat ulang halaman ini.
            </p>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6">
      <AdminHeader title="Settings" subtitle="Pengaturan dan pintasan operasional platform." />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 shadow-[var(--admin-shadow-soft)] transition hover:border-blue-300 dark:hover:border-blue-500/40"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-500" />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                {section.title}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{section.desc}</p>
            </Link>
          );
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <PaymentGatewayCard />
        <SectionCard title="Info akses">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Mode</dt>
              <dd className="font-medium text-slate-900 dark:text-white">Operational</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Akses</dt>
              <dd className="inline-flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Platform admin only
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Gateway env</dt>
              <dd className="inline-flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                <CreditCard className="h-4 w-4 text-slate-400" />
                Server-side
              </dd>
            </div>
          </dl>
        </SectionCard>
      </div>
    </main>
  );
}
