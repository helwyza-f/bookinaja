"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminHeader, StatCard, SectionCard } from "@/components/platform/admin-kit";
import {
  getPlatformPlanFeatures,
  type PlatformPlanFeatureSettings,
  updatePlatformPlanFeatures,
} from "@/lib/platform-admin";

type PlanKey = "trial" | "starter" | "pro" | "scale";

type FeatureDef = { key: string; label: string; note: string };

const PLAN_META: Record<PlanKey, { title: string; short: string }> = {
  trial: { title: "Trial", short: "Evaluasi flow inti" },
  starter: { title: "Starter", short: "Operasional dasar" },
  pro: { title: "Pro", short: "Tim & kontrol" },
  scale: { title: "Scale", short: "Retention & growth" },
};

const PLAN_KEYS = Object.keys(PLAN_META) as PlanKey[];

const FEATURES: FeatureDef[] = [
  { key: "advanced_receipt_branding", label: "Receipt branding", note: "Nota custom & printer flow" },
  { key: "staff_accounts", label: "Staff accounts", note: "Akun staff tambahan" },
  { key: "role_permissions", label: "Role permissions", note: "Role & izin staff" },
  { key: "pos_workflow", label: "POS workflow", note: "Kontrol kasir & POS" },
  { key: "payment_method_management", label: "Payment methods", note: "Kelola metode bayar" },
  { key: "manual_payment_verification", label: "Manual payment verify", note: "Verifikasi manual payment" },
  { key: "customer_import", label: "Customer import", note: "Import customer lama" },
  { key: "whatsapp_blast", label: "Customer blast", note: "Blast WhatsApp customer" },
  { key: "pricing_rules_flexible", label: "Flexible pricing", note: "Pricing rules fleksibel" },
  { key: "crm_basic", label: "CRM basic", note: "CRM dasar follow-up" },
  { key: "advanced_analytics", label: "Advanced analytics", note: "Analytics lebih dalam" },
  { key: "membership_enabled", label: "Membership", note: "Membership per tenant" },
  { key: "membership_auto_join_enabled", label: "Auto join membership", note: "Auto join saat transaksi" },
  { key: "membership_reward_redeem_enabled", label: "Reward redeem", note: "Redeem reward di checkout" },
  { key: "membership_analytics_enabled", label: "Membership analytics", note: "Insight membership" },
  { key: "retention_analytics", label: "Retention analytics", note: "Cohort & retention" },
  { key: "growth_analytics", label: "Growth analytics", note: "Growth funnel & outcome" },
  { key: "multi_outlet_enabled", label: "Multi outlet", note: "Multi outlet & cabang" },
  { key: "advanced_automation_controls", label: "Automation controls", note: "Otomasi lanjutan" },
  { key: "franchise_visibility", label: "Franchise visibility", note: "View agregat franchise" },
];

const EMPTY_PLANS: Record<PlanKey, string[]> = { trial: [], starter: [], pro: [], scale: [] };

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
      return { ...current, [plan]: [...nextSet].sort() };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await updatePlatformPlanFeatures(draft);
      setDraft(normalizePlans(res.data?.data?.plans || draft));
      setUpdatedAt(res.data?.data?.updated_at);
      toast.success("Plan entitlements diperbarui.");
    } catch {
      toast.error("Gagal menyimpan plan entitlements.");
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(
    () => PLAN_KEYS.map((plan) => ({ plan, total: draft[plan]?.length || 0 })),
    [draft],
  );

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6">
      <AdminHeader
        title="Plans & entitlements"
        subtitle={
          updatedAt
            ? `Update terakhir ${new Date(updatedAt).toLocaleString("id-ID")}`
            : "Atur fitur yang bisa diakses tiap plan."
        }
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => void load()}
              disabled={loading || saving}
            >
              <RefreshCcw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" className="rounded-lg" onClick={() => void save()} disabled={loading || saving}>
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <StatCard
            key={item.plan}
            label={PLAN_META[item.plan].title}
            value={`${item.total} fitur`}
            hint={PLAN_META[item.plan].short}
          />
        ))}
      </section>

      <SectionCard title="Entitlement matrix" bodyClassName="p-0">
        {loading ? (
          <div className="p-4 text-sm text-slate-400">Memuat matrix…</div>
        ) : (
          <Table className="rounded-none border-0 bg-transparent shadow-none">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-56">Fitur</TableHead>
                {PLAN_KEYS.map((plan) => (
                  <TableHead key={plan} className="text-center">
                    {PLAN_META[plan].title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {FEATURES.map((feature) => (
                <TableRow key={feature.key}>
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-white">{feature.label}</div>
                    <div className="text-xs text-slate-400">{feature.note}</div>
                  </TableCell>
                  {PLAN_KEYS.map((plan) => (
                    <TableCell key={plan} className="text-center">
                      <div className="flex justify-center">
                        <Switch
                          checked={draft[plan]?.includes(feature.key)}
                          onCheckedChange={(checked) => toggleFeature(plan, feature.key, checked)}
                          disabled={loading || saving}
                        />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </main>
  );
}
