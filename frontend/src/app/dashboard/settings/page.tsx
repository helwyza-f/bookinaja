"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, BadgeCheck, Settings2, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PageShell } from "@/components/dashboard/page-shell";
import {
  getPlatformDiscoveryFeedSetting,
  updatePlatformDiscoveryFeedSetting,
} from "@/lib/platform-admin";

const sections = [
  { href: "/dashboard/overview", title: "Overview", desc: "Ringkasan data platform", icon: BadgeCheck },
  { href: "/dashboard/tenants", title: "Tenants", desc: "Directory tenant aktif", icon: ShieldCheck },
  { href: "/dashboard/discovery", title: "Discovery editorial", desc: "Override featured order lintas tenant", icon: Sparkles },
  { href: "/dashboard/referral-withdrawals", title: "Referral payout", desc: "Review request pencairan", icon: Sparkles },
];

export default function SettingsPage() {
  const [enableDiscoveryPosts, setEnableDiscoveryPosts] = useState(false);
  const [loadingSetting, setLoadingSetting] = useState(true);
  const [savingSetting, setSavingSetting] = useState(false);

  useEffect(() => {
    getPlatformDiscoveryFeedSetting()
      .then((data) => setEnableDiscoveryPosts(Boolean(data.enable_discovery_posts)))
      .finally(() => setLoadingSetting(false));
  }, []);

  const handleToggle = async (checked: boolean) => {
    setEnableDiscoveryPosts(checked);
    setSavingSetting(true);
    try {
      await updatePlatformDiscoveryFeedSetting(checked);
      toast.success(
        checked
          ? "Mode tenant + post di feed discovery diaktifkan"
          : "Mode tenant-only di feed discovery diaktifkan",
      );
    } catch {
      setEnableDiscoveryPosts((current) => !current);
      toast.error("Gagal memperbarui mode feed discovery");
    } finally {
      setSavingSetting(false);
    }
  };

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

      <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">
              Discovery Feed Mode
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
              Switch tenant-only vs tenant + post
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              Gunakan switch ini untuk menentukan apakah feed customer, publik, dan owner hanya menampilkan profil tenant atau sudah ikut menampilkan post/konten.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-950 dark:text-white">
                {enableDiscoveryPosts ? "Tenant + Post" : "Tenant Only"}
              </div>
              <div className="text-[11px] text-slate-500">
                {loadingSetting
                  ? "Memuat status..."
                  : savingSetting
                    ? "Menyimpan perubahan..."
                    : "Berlaku tanpa ganti env"}
              </div>
            </div>
            <Switch
              checked={enableDiscoveryPosts}
              disabled={loadingSetting || savingSetting}
              onCheckedChange={(checked) => void handleToggle(checked)}
            />
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Settings2 className="h-4 w-4" />
          Operational checklist
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["platform login", "summary", "tenants", "discovery editorial", "customers", "transactions", "referral payout"].map((item) => (
            <Badge key={item} variant="outline" className="rounded-full uppercase">
              {item}
            </Badge>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
