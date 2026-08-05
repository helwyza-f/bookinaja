"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, BadgeCheck, CreditCard, Loader2, Mail, Settings2, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/dashboard/page-shell";
import {
  getPlatformPaymentGateway,
  updatePlatformPaymentGateway,
  type PlatformPaymentGatewaySetting,
} from "@/lib/platform-admin";

const GATEWAYS: { value: "midtrans" | "xendit"; label: string; note: string }[] = [
  { value: "midtrans", label: "Midtrans", note: "Snap popup (default)" },
  { value: "xendit", label: "Xendit", note: "Invoice redirect" },
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
    <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        <CreditCard className="h-4 w-4" />
        Payment gateway
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        Pilih gateway pembayaran yang aktif untuk semua tenant. Key rahasia diatur lewat env server.
      </p>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {GATEWAYS.map((g) => {
              const active = setting?.active_gateway === g.value;
              const configured = g.value === "xendit" ? setting?.xendit_configured : setting?.midtrans_configured;
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => select(g.value)}
                  disabled={Boolean(saving)}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10"
                      : "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
                  } ${saving ? "opacity-70" : ""}`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-base font-semibold text-slate-950 dark:text-white">{g.label}</span>
                    {saving === g.value ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    ) : active ? (
                      <Badge className="rounded-full bg-blue-600 text-white">Aktif</Badge>
                    ) : null}
                  </div>
                  <span className="text-xs text-slate-500">{g.note}</span>
                  <span className={`text-[11px] font-medium ${configured ? "text-emerald-600" : "text-amber-600"}`}>
                    {configured ? "Key terkonfigurasi" : "Key belum diset di server"}
                  </span>
                </button>
              );
            })}
          </div>
          {setting && !setting.xendit_configured ? (
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Untuk mengaktifkan Xendit, set <code>XENDIT_SECRET_KEY</code> dan <code>XENDIT_CALLBACK_TOKEN</code> di env server, lalu muat ulang halaman ini.
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}

const sections = [
  { href: "/dashboard/overview", title: "Overview", desc: "Ringkasan data platform", icon: BadgeCheck },
  { href: "/dashboard/tenants", title: "Tenants", desc: "Directory tenant aktif", icon: ShieldCheck },
  { href: "/dashboard/emails", title: "Email logs", desc: "Audit trail email programmatic lintas event", icon: Mail },
  { href: "/dashboard/discovery", title: "Discovery editorial", desc: "Override featured order lintas tenant", icon: Sparkles },
  { href: "/dashboard/settings/plans", title: "Plans & entitlements", desc: "Atur plan bisa akses apa", icon: SlidersHorizontal },
  { href: "/dashboard/referral-withdrawals", title: "Referral payout", desc: "Review request pencairan", icon: Sparkles },
];

export default function SettingsPage() {
  return (
    <PageShell
      eyebrow="Platform controls"
      title="Settings"
      description="Pusat pengaturan dan pintasan untuk area operasional platform admin."
      stats={[
        { label: "Mode", value: "Operational" },
        { label: "Access", value: "Platform admin only" },
      ]}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.href} className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
              <Icon className="h-5 w-5 text-blue-600" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{section.desc}</p>
              <Link href={section.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                Open
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Card>
          );
        })}
      </section>

      <PaymentGatewayCard />

      <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Settings2 className="h-4 w-4" />
          Operational checklist
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["platform login", "summary", "tenants", "plan entitlements", "email logs", "discovery editorial", "customers", "transactions", "referral payout"].map((item) => (
            <Badge key={item} variant="outline" className="rounded-full uppercase">
              {item}
            </Badge>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
