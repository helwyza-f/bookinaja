"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCheck, RefreshCcw, Save, SlidersHorizontal } from "lucide-react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  getPlatformPlanFeatures,
  type PlatformPlanFeatureSettings,
  updatePlatformPlanFeatures,
} from "@/lib/platform-admin";

type PlanKey = "trial" | "starter" | "pro" | "scale";

type FeatureDef = {
  key: string;
  label: string;
  note: string;
  plans: PlanKey[];
};

const PLAN_META: Record<PlanKey, { title: string; short: string }> = {
  trial: { title: "Free Trial", short: "Evaluasi flow inti" },
  starter: { title: "Starter", short: "Operasional dasar" },
  pro: { title: "Pro", short: "Tim dan kontrol lebih rapi" },
  scale: { title: "Scale", short: "Retention dan growth" },
};

const FEATURES: FeatureDef[] = [
  { key: "advanced_receipt_branding", label: "Receipt branding", note: "Nota custom dan printer flow.", plans: ["pro", "scale"] },
  { key: "staff_accounts", label: "Staff accounts", note: "Akun staff tambahan.", plans: ["pro", "scale"] },
  { key: "role_permissions", label: "Role permissions", note: "Role dan izin staff.", plans: ["pro", "scale"] },
  { key: "pos_workflow", label: "POS workflow", note: "Kontrol kasir dan POS lebih rapi.", plans: ["pro", "scale"] },
  { key: "payment_method_management", label: "Payment methods", note: "Kelola metode bayar tenant.", plans: ["pro", "scale"] },
  { key: "manual_payment_verification", label: "Manual payment verify", note: "Verifikasi manual payment.", plans: ["pro", "scale"] },
  { key: "customer_import", label: "Customer import", note: "Import customer lama.", plans: ["pro", "scale"] },
  { key: "whatsapp_blast", label: "Customer blast", note: "Blast WhatsApp customer.", plans: ["pro", "scale"] },
  { key: "pricing_rules_flexible", label: "Flexible pricing", note: "Pricing rules lebih fleksibel.", plans: ["pro", "scale"] },
  { key: "crm_basic", label: "CRM basic", note: "CRM dasar untuk follow-up.", plans: ["pro", "scale"] },
  { key: "advanced_analytics", label: "Advanced analytics", note: "Analytics yang lebih dalam.", plans: ["pro", "scale"] },
  { key: "membership_enabled", label: "Membership", note: "Membership active per tenant.", plans: ["scale"] },
  { key: "membership_auto_join_enabled", label: "Auto join membership", note: "Auto join saat transaksi.", plans: ["scale"] },
  { key: "membership_reward_redeem_enabled", label: "Reward redeem", note: "Redeem reward di checkout.", plans: ["scale"] },
  { key: "membership_analytics_enabled", label: "Membership analytics", note: "Insight membership.", plans: ["scale"] },
  { key: "retention_analytics", label: "Retention analytics", note: "Cohort dan retention growth.", plans: ["scale"] },
  { key: "growth_analytics", label: "Growth analytics", note: "Growth funnel dan outcome.", plans: ["scale"] },
  { key: "multi_outlet_enabled", label: "Multi outlet", note: "Multi outlet dan struktur cabang.", plans: ["scale"] },
  { key: "advanced_automation_controls", label: "Automation controls", note: "Otomasi lanjutan.", plans: ["scale"] },
  { key: "franchise_visibility", label: "Franchise visibility", note: "View agregat franchise.", plans: ["scale"] },
];

const EMPTY_PLANS: Record<PlanKey, string[]> = {
  trial: [],
  starter: [],
  pro: [],
  scale: [],
};

function normalizePlans(input?: Record<string, string[]>) {
  return {
    trial: [...new Set(input?.trial || [])].sort(),
    starter: [...new Set(input?.starter || [])].sort(),
    pro: [...new Set(input?.pro || [])].sort(),
    scale: [...new Set(input?.scale || [])].sort(),
  } satisfies Record<PlanKey, string[]>;
}

export default function PlatformPlanSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [draft, setDraft] = useState<Record<PlanKey, string[]>>(EMPTY_PLANS);

  const load = async () => {
    setLoading(true);
    try {
      const data: PlatformPlanFeatureSettings = await getPlatformPlanFeatures();
      setDraft(normalizePlans(data.plans));
      setUpdatedAt(data.updated_at);
    } catch {
      toast.error("Gagal memuat plan entitlements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleFeature = (plan: PlanKey, feature: string, enabled: boolean) => {
    setDraft((current) => {
      const nextSet = new Set(current[plan] || []);
      if (enabled) nextSet.add(feature);
      else nextSet.delete(feature);
      return {
        ...current,
        [plan]: [...nextSet].sort(),
      };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await updatePlatformPlanFeatures(draft);
      const next = normalizePlans(res.data?.data?.plans || draft);
      setDraft(next);
      setUpdatedAt(res.data?.data?.updated_at);
      toast.success("Plan entitlements diperbarui.");
    } catch {
      toast.error("Gagal menyimpan plan entitlements.");
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(
    () =>
      (Object.keys(PLAN_META) as PlanKey[]).map((plan) => ({
        plan,
        total: draft[plan]?.length || 0,
      })),
    [draft],
  );

  return (
    <PageShell
      eyebrow="Platform controls"
      title="Plans & entitlements"
      description="Atur plan bisa akses apa. Tenant dan admin akan baca matrix yang sama."
      stats={summary.map((item) => ({
        label: PLAN_META[item.plan].title,
        value: `${item.total} fitur`,
      }))}
    >
      <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <SlidersHorizontal className="h-4 w-4" />
              Entitlement matrix
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              Trial dan Starter tetap ringan. Pro untuk tim dan kontrol. Scale untuk membership, retention, dan growth.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading || saving}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => void save()} disabled={loading || saving}>
              <Save className="mr-2 h-4 w-4" />
              Simpan
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {updatedAt ? (
            <Badge variant="outline" className="rounded-full">
              Update terakhir {new Date(updatedAt).toLocaleString("id-ID")}
            </Badge>
          ) : null}
          <Badge variant="outline" className="rounded-full">
            Source of truth: platform settings
          </Badge>
        </div>
      </Card>

      <section className="grid gap-4">
        {FEATURES.map((feature) => (
          <Card key={feature.key} className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
            <div className="grid gap-5 xl:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] xl:items-center">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-950 dark:text-white">{feature.label}</h2>
                  {feature.plans.includes("scale") && !feature.plans.includes("pro") ? (
                    <Badge className="border-none bg-violet-500/10 text-violet-600">Scale</Badge>
                  ) : null}
                </div>
                <p className="text-sm leading-6 text-slate-500">{feature.note}</p>
                <code className="text-xs text-slate-400">{feature.key}</code>
              </div>

              {(Object.keys(PLAN_META) as PlanKey[]).map((plan) => {
                const enabled = draft[plan]?.includes(feature.key);
                return (
                  <div
                    key={plan}
                    className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-950 dark:text-white">
                          {PLAN_META[plan].title}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{PLAN_META[plan].short}</div>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => toggleFeature(plan, feature.key, checked)}
                        disabled={loading || saving}
                      />
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      {enabled ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />}
                      {enabled ? "Aktif" : "Tidak aktif"}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </section>
    </PageShell>
  );
}
