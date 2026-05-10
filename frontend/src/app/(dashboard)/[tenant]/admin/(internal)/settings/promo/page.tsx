"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Search, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type PromoItem = {
  id: string;
  code: string;
  name: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  valid_weekdays?: number[];
  time_start?: string | null;
  time_end?: string | null;
  resource_ids?: string[];
  is_active: boolean;
  usage_count?: number;
};

const formatIDR = (value?: number | null) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;

export default function PromoSettingsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/settings/promos");
      setItems(res.data?.items || []);
    } catch {
      toast.error("Gagal memuat promo tenant");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const activeCount = useMemo(
    () => items.filter((item) => item.is_active).length,
    [items],
  );

  const usageCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.usage_count || 0), 0),
    [items],
  );

  const scopedCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.valid_weekdays?.length || item.time_start || item.time_end || item.resource_ids?.length,
      ).length,
    [items],
  );

  const filteredItems = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.code.toLowerCase().includes(searchTerm) ||
        item.name.toLowerCase().includes(searchTerm);
      const matchesStatus =
        status === "all" ||
        (status === "active" ? item.is_active : !item.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [items, search, status]);

  const toggleStatus = async (item: PromoItem) => {
    try {
      await api.patch(`/admin/settings/promos/${item.id}/status`, {
        is_active: !item.is_active,
      });
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, is_active: !entry.is_active } : entry,
        ),
      );
      toast.success(item.is_active ? "Promo dinonaktifkan." : "Promo diaktifkan.");
    } catch {
      toast.error("Gagal memperbarui status promo");
    }
  };

  const summaryRule = (item: PromoItem) => {
    const chips: string[] = [];
    chips.push(
      item.discount_type === "percentage"
        ? `${item.discount_value}% off`
        : formatIDR(item.discount_value),
    );
    if (item.valid_weekdays?.length) chips.push(`${item.valid_weekdays.length} hari`);
    if (item.time_start && item.time_end) chips.push(`${item.time_start} - ${item.time_end}`);
    if (item.resource_ids?.length) chips.push(`${item.resource_ids.length} resource`);
    return chips;
  };

  return (
    <div className="space-y-4 p-4 pb-20 sm:space-y-6 sm:p-6">
      <Card className="overflow-hidden rounded-[1.75rem] border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96))] shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(8,15,27,0.96),rgba(12,35,64,0.94))]">
        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                <TicketPercent className="h-3.5 w-3.5" />
                Promo
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Voucher Booking
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Bikin, aktifkan, dan rapikan promo booking dari satu tempat.
              </p>
            </div>

            <Button
              onClick={() => router.push("/admin/settings/promo/new")}
              className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Promo Baru
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="Total" value={String(items.length)} />
            <Metric label="Aktif" value={String(activeCount)} tone="emerald" />
            <Metric label="Dipakai" value={String(usageCount)} tone="amber" />
          </div>
        </div>
      </Card>

      <Card className="rounded-[1.75rem] border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0b0b]">
        <div className="border-b border-slate-100 p-4 dark:border-white/5 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Daftar Promo
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Scan cepat status, aturan, dan pemakaian.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Scoped" value={String(scopedCount)} />
              <MiniStat label="Aktif" value={String(activeCount)} />
              <MiniStat label="Total" value={String(items.length)} />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari kode atau nama promo"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/[0.03]"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:w-auto">
              {[
                { value: "all", label: "Semua" },
                { value: "active", label: "Aktif" },
                { value: "inactive", label: "Off" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value as "all" | "active" | "inactive")}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                    status === option.value
                      ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200"
                      : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              Memuat promo...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              {items.length === 0
                ? "Belum ada promo. Mulai dari promo pertama."
                : "Tidak ada promo yang cocok dengan filter ini."}
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {filteredItems.map((item) => {
                const chips = summaryRule(item);
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/admin/settings/promo/${item.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/admin/settings/promo/${item.id}`);
                      }
                    }}
                    className="rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.9))] p-4 text-left transition hover:border-sky-200 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-950 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white dark:bg-white dark:text-slate-950">
                            {item.code}
                          </span>
                          <Badge
                            className={cn(
                              item.is_active
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200",
                            )}
                          >
                            {item.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                        <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
                          {item.name}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {item.discount_type === "percentage"
                            ? `${item.discount_value}% untuk booking`
                            : `${formatIDR(item.discount_value)} untuk booking`}
                        </p>
                      </div>

                      <Switch
                        checked={item.is_active}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={(checked) => {
                          if (checked !== item.is_active) void toggleStatus(item);
                        }}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {chips.length > 0 ? (
                        chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300"
                          >
                            {chip}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400">
                          Promo global
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Dipakai <span className="font-semibold text-slate-900 dark:text-white">{item.usage_count || 0}x</span>
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-200">
                        Edit
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber";
}) {
  const tones = {
    slate: "bg-white/85 text-slate-900 dark:bg-white/[0.04] dark:text-white",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
  };

  return (
    <div className={cn("rounded-[1.1rem] border border-slate-200 px-3 py-3 shadow-sm dark:border-white/10", tones[tone])}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="mt-1 text-lg font-black tracking-tight">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
