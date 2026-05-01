"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/dashboard/page-shell";
import {
  getPlatformDiscoveryAnalytics,
  getPlatformTenants,
  type PlatformDiscoveryAnalytics,
  type PlatformTenant,
  updatePlatformTenantDiscovery,
} from "@/lib/platform-admin";

type DiscoveryDraft = {
  discovery_headline: string;
  discovery_subheadline: string;
  promo_label: string;
  featured_image_url: string;
  highlight_copy: string;
  discovery_tags: string;
  discovery_badges: string;
  discovery_featured: boolean;
  discovery_promoted: boolean;
  discovery_priority: number;
  promo_starts_at: string;
  promo_ends_at: string;
};

export default function PlatformDiscoveryPage() {
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<DiscoveryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [analytics, setAnalytics] = useState<PlatformDiscoveryAnalytics | null>(null);

  useEffect(() => {
    Promise.all([getPlatformTenants(), getPlatformDiscoveryAnalytics()]).then(
      ([items, analyticsData]) => {
        const sorted = [...items].sort(sortDiscoveryTenants);
        setTenants(sorted);
        setAnalytics(analyticsData);
        if (sorted[0]) {
          setSelectedId(sorted[0].id);
          setDraft(toDraft(sorted[0]));
        }
      },
    );
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((tenant) =>
      [
        tenant.name,
        tenant.slug,
        tenant.owner_email,
        tenant.discovery_headline,
        tenant.promo_label,
      ].some((value) => (value || "").toLowerCase().includes(q)),
    );
  }, [query, tenants]);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedId) || null,
    [selectedId, tenants],
  );

  const selectTenant = (tenant: PlatformTenant) => {
    setSelectedId(tenant.id);
    setDraft(toDraft(tenant));
  };

  const handleSave = async () => {
    if (!selectedTenant || !draft) return;
    setSaving(true);
    try {
      await updatePlatformTenantDiscovery(selectedTenant.id, {
        discovery_headline: draft.discovery_headline,
        discovery_subheadline: draft.discovery_subheadline,
        promo_label: draft.promo_label,
        featured_image_url: draft.featured_image_url,
        highlight_copy: draft.highlight_copy,
        discovery_tags: splitCsv(draft.discovery_tags),
        discovery_badges: splitCsv(draft.discovery_badges),
        discovery_featured: draft.discovery_featured,
        discovery_promoted: draft.discovery_promoted,
        discovery_priority: Math.max(0, Number(draft.discovery_priority || 0)),
        promo_starts_at: fromDateTimeLocal(draft.promo_starts_at),
        promo_ends_at: fromDateTimeLocal(draft.promo_ends_at),
      });

      const refreshed = tenants
        .map((tenant) =>
          tenant.id === selectedTenant.id
            ? {
                ...tenant,
                discovery_headline: draft.discovery_headline,
                discovery_subheadline: draft.discovery_subheadline,
                promo_label: draft.promo_label,
                featured_image_url: draft.featured_image_url,
                highlight_copy: draft.highlight_copy,
                discovery_tags: splitCsv(draft.discovery_tags),
                discovery_badges: splitCsv(draft.discovery_badges),
                discovery_featured: draft.discovery_featured,
                discovery_promoted: draft.discovery_promoted,
                discovery_priority: Math.max(0, Number(draft.discovery_priority || 0)),
                promo_starts_at: fromDateTimeLocal(draft.promo_starts_at),
                promo_ends_at: fromDateTimeLocal(draft.promo_ends_at),
              }
            : tenant,
        )
        .sort(sortDiscoveryTenants);

      setTenants(refreshed);
      const updated = refreshed.find((tenant) => tenant.id === selectedTenant.id);
      if (updated) {
        setSelectedId(updated.id);
        setDraft(toDraft(updated));
      }
      toast.success("Editorial discovery platform diperbarui");
    } catch {
      toast.error("Gagal menyimpan override discovery");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      eyebrow="Platform editorial override"
      title="Discovery Editorial Console"
      description="Atur featured order, promo momentum, dan priority score lintas tenant dari satu tempat."
      stats={[
        { label: "Tenant editorial", value: String(tenants.length) },
        {
          label: "Featured manual",
          value: String(tenants.filter((tenant) => tenant.discovery_featured).length),
        },
        {
          label: "Promo aktif",
          value: String(tenants.filter((tenant) => tenant.discovery_promoted).length),
        },
        {
          label: "Highest score",
          value: String(Math.max(0, ...tenants.map((tenant) => tenant.discovery_priority || 0))),
        },
        {
          label: "Avg CTR 30d",
          value: `${averageCtr(tenants).toFixed(2)}%`,
        },
      ]}
      actions={
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari tenant, slug, owner, headline, promo..."
            className="h-12 rounded-2xl pl-10"
          />
        </div>
      }
    >
      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Section CTR
          </div>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
            Performa per section
          </h2>
          <div className="mt-4 space-y-3">
            {(analytics?.sections || []).slice(0, 6).map((section) => (
              <BreakdownRow
                key={section.bucket}
                label={section.bucket || "unknown"}
                impressions={section.impressions_30d}
                clicks={section.clicks_30d}
                ctr={section.ctr_30d}
              />
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Card Variant CTR
          </div>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
            Performa per format kartu
          </h2>
          <div className="mt-4 space-y-3">
            {(analytics?.card_variants || []).slice(0, 6).map((variant) => (
              <BreakdownRow
                key={variant.bucket}
                label={variant.bucket || "unknown"}
                impressions={variant.impressions_30d}
                clicks={variant.clicks_30d}
                ctr={variant.ctr_30d}
              />
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SpotlightCard
          eyebrow="Winner"
          title="Top performing featured card"
          tone="emerald"
          item={analytics?.top_featured}
        />
        <SpotlightCard
          eyebrow="Watchlist"
          title="Underperforming promoted card"
          tone="amber"
          item={analytics?.underperforming_promoted}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="rounded-3xl border-slate-200 p-4 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                Queue
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                Urutan editorial
              </h2>
            </div>
            <Badge variant="outline" className="rounded-full">
              {filtered.length} tenant
            </Badge>
          </div>
          <div className="space-y-3">
            {filtered.map((tenant, index) => {
              const active = tenant.id === selectedId;
              return (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => selectTenant(tenant)}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-[#050505] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">
                        #{index + 1} priority {tenant.discovery_priority || 0}
                      </div>
                      <div className="mt-1 text-sm font-semibold">
                        {tenant.name}
                      </div>
                      <div className="mt-1 text-xs opacity-70">
                        {tenant.slug} • {tenant.owner_email || "-"}
                      </div>
                      <div className="mt-2 text-[11px] opacity-70">
                        {Number(tenant.discovery_clicks_30d || 0).toLocaleString("id-ID")} klik •{" "}
                        {Number(tenant.discovery_impressions_30d || 0).toLocaleString("id-ID")} impresi •{" "}
                        {Number(tenant.discovery_ctr_30d || 0).toLocaleString("id-ID", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}% CTR
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {tenant.discovery_featured ? (
                        <Badge className="rounded-full border-none bg-amber-500 text-white">
                          featured
                        </Badge>
                      ) : null}
                      {tenant.discovery_promoted ? (
                        <Badge className="rounded-full border-none bg-blue-600 text-white">
                          promoted
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 line-clamp-2 text-xs opacity-80">
                    {tenant.discovery_headline || tenant.name}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
          {selectedTenant && draft ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                    Selected tenant
                  </div>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
                    {selectedTenant.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedTenant.slug} • {selectedTenant.owner_email || "-"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full uppercase">
                    {selectedTenant.status || "unknown"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full uppercase">
                    {selectedTenant.plan || "-"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full uppercase">
                    {Number(selectedTenant.discovery_ctr_30d || 0).toLocaleString("id-ID", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}% ctr
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <MetricChip
                  label="Impresi 30 hari"
                  value={Number(selectedTenant.discovery_impressions_30d || 0).toLocaleString("id-ID")}
                />
                <MetricChip
                  label="Klik 30 hari"
                  value={Number(selectedTenant.discovery_clicks_30d || 0).toLocaleString("id-ID")}
                />
                <MetricChip
                  label="CTR 30 hari"
                  value={`${Number(selectedTenant.discovery_ctr_30d || 0).toLocaleString("id-ID", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}%`}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ToggleField
                  label="Featured feed"
                  checked={draft.discovery_featured}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, discovery_featured: checked })
                  }
                />
                <ToggleField
                  label="Promoted promo"
                  checked={draft.discovery_promoted}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, discovery_promoted: checked })
                  }
                />
              </div>

              <Field label="Priority score">
                <Input
                  type="number"
                  min="0"
                  value={draft.discovery_priority}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      discovery_priority: Math.max(0, Number(event.target.value || 0)),
                    })
                  }
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Discovery headline">
                  <Input
                    value={draft.discovery_headline}
                    onChange={(event) =>
                      setDraft({ ...draft, discovery_headline: event.target.value })
                    }
                  />
                </Field>
                <Field label="Promo label">
                  <Input
                    value={draft.promo_label}
                    onChange={(event) =>
                      setDraft({ ...draft, promo_label: event.target.value })
                    }
                  />
                </Field>
              </div>

              <Field label="Discovery subheadline">
                <Textarea
                  value={draft.discovery_subheadline}
                  onChange={(event) =>
                    setDraft({ ...draft, discovery_subheadline: event.target.value })
                  }
                  className="min-h-24"
                />
              </Field>

              <Field label="Highlight copy">
                <Textarea
                  value={draft.highlight_copy}
                  onChange={(event) =>
                    setDraft({ ...draft, highlight_copy: event.target.value })
                  }
                  className="min-h-24"
                />
              </Field>

              <Field label="Featured image URL">
                <Input
                  value={draft.featured_image_url}
                  onChange={(event) =>
                    setDraft({ ...draft, featured_image_url: event.target.value })
                  }
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Discovery tags">
                  <Input
                    value={draft.discovery_tags}
                    onChange={(event) =>
                      setDraft({ ...draft, discovery_tags: event.target.value })
                    }
                    placeholder="Pisahkan dengan koma"
                  />
                </Field>
                <Field label="Discovery badges">
                  <Input
                    value={draft.discovery_badges}
                    onChange={(event) =>
                      setDraft({ ...draft, discovery_badges: event.target.value })
                    }
                    placeholder="Pisahkan dengan koma"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Promo mulai">
                  <Input
                    type="datetime-local"
                    value={draft.promo_starts_at}
                    onChange={(event) =>
                      setDraft({ ...draft, promo_starts_at: event.target.value })
                    }
                  />
                </Field>
                <Field label="Promo berakhir">
                  <Input
                    type="datetime-local"
                    value={draft.promo_ends_at}
                    onChange={(event) =>
                      setDraft({ ...draft, promo_ends_at: event.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => setDraft(toDraft(selectedTenant))}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? "Menyimpan..." : "Simpan override"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">
              Pilih tenant dulu untuk mengedit discovery override.
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center gap-3">
        <Sparkles className="h-4 w-4 text-slate-400" />
        <div className="text-sm font-semibold text-slate-950 dark:text-white">{label}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function toDraft(tenant: PlatformTenant): DiscoveryDraft {
  return {
    discovery_headline: tenant.discovery_headline || "",
    discovery_subheadline: tenant.discovery_subheadline || "",
    promo_label: tenant.promo_label || "",
    featured_image_url: tenant.featured_image_url || "",
    highlight_copy: tenant.highlight_copy || "",
    discovery_tags: (tenant.discovery_tags || []).join(", "),
    discovery_badges: (tenant.discovery_badges || []).join(", "),
    discovery_featured: tenant.discovery_featured || false,
    discovery_promoted: tenant.discovery_promoted || false,
    discovery_priority: tenant.discovery_priority || 0,
    promo_starts_at: toDateTimeLocal(tenant.promo_starts_at),
    promo_ends_at: toDateTimeLocal(tenant.promo_ends_at),
  };
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function sortDiscoveryTenants(left: PlatformTenant, right: PlatformTenant) {
  const leftScore = (left.discovery_priority || 0) + (left.discovery_featured ? 1000 : 0);
  const rightScore = (right.discovery_priority || 0) + (right.discovery_featured ? 1000 : 0);
  if (leftScore !== rightScore) return rightScore - leftScore;
  return (left.name || "").localeCompare(right.name || "");
}

function averageCtr(tenants: PlatformTenant[]) {
  if (tenants.length === 0) return 0;
  return (
    tenants.reduce((sum, tenant) => sum + Number(tenant.discovery_ctr_30d || 0), 0) /
    tenants.length
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

function BreakdownRow({
  label,
  impressions,
  clicks,
  ctr,
}: {
  label: string;
  impressions: number;
  clicks: number;
  ctr: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div>
        <div className="text-sm font-semibold text-slate-950 dark:text-white">{label}</div>
        <div className="mt-1 text-xs text-slate-500">
          {Number(clicks || 0).toLocaleString("id-ID")} klik •{" "}
          {Number(impressions || 0).toLocaleString("id-ID")} impresi
        </div>
      </div>
      <div className="text-sm font-black text-slate-950 dark:text-white">
        {Number(ctr || 0).toLocaleString("id-ID", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}%
      </div>
    </div>
  );
}

function SpotlightCard({
  eyebrow,
  title,
  tone,
  item,
}: {
  eyebrow: string;
  title: string;
  tone: "emerald" | "amber";
  item?: {
    tenant_name?: string;
    tenant_slug?: string;
    discovery_priority?: number;
    impressions_30d?: number;
    clicks_30d?: number;
    ctr_30d?: number;
  };
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
      <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${toneClasses}`}>
        {eyebrow}
      </div>
      <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
      {item?.tenant_name ? (
        <div className="mt-4 space-y-2">
          <div className="text-base font-semibold text-slate-950 dark:text-white">
            {item.tenant_name}
          </div>
          <div className="text-sm text-slate-500">{item.tenant_slug}</div>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricChip
              label="CTR 30 hari"
              value={`${Number(item.ctr_30d || 0).toLocaleString("id-ID", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}%`}
            />
            <MetricChip
              label="Klik"
              value={Number(item.clicks_30d || 0).toLocaleString("id-ID")}
            />
            <MetricChip
              label="Impresi"
              value={Number(item.impressions_30d || 0).toLocaleString("id-ID")}
            />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Belum ada cukup data event untuk menampilkan spotlight ini.
        </p>
      )}
    </Card>
  );
}
