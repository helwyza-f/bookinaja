"use client";

import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Mail, Settings2, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/dashboard/page-shell";

const sections = [
  { href: "/dashboard/overview", title: "Overview", desc: "Ringkasan data platform", icon: BadgeCheck },
  { href: "/dashboard/tenants", title: "Tenants", desc: "Directory tenant aktif", icon: ShieldCheck },
  { href: "/dashboard/emails", title: "Email logs", desc: "Audit trail email programmatic lintas event", icon: Mail },
  { href: "/dashboard/discovery", title: "Discovery editorial", desc: "Override featured order lintas tenant", icon: Sparkles },
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

      <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Settings2 className="h-4 w-4" />
          Operational checklist
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["platform login", "summary", "tenants", "email logs", "discovery editorial", "customers", "transactions", "referral payout"].map((item) => (
            <Badge key={item} variant="outline" className="rounded-full uppercase">
              {item}
            </Badge>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
