"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, TicketPercent } from "lucide-react";
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
    chips.push(item.valid_weekdays?.length ? `${item.valid_weekdays.length} hari` : "Semua hari");
    chips.push(item.time_start && item.time_end ? `${item.time_start} - ${item.time_end}` : "Sepanjang hari");
    chips.push(item.resource_ids?.length ? `${item.resource_ids.length} resource` : "Semua resource");
    return chips;
  };

  return (
    <div className="space-y-4 p-4 pb-20 sm:space-y-6 sm:p-6">
      <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0b0b]">
        <div className="border-b border-slate-100 p-5 dark:border-white/5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                <TicketPercent className="h-3.5 w-3.5" />
                Promo Customer
              </div>
              <div>
                <h1 className="text-2xl font-[950] tracking-tight text-slate-950 dark:text-white">
                  Voucher booking tenant
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Halaman ini hanya untuk melihat dan mengelola promo. Isi form ada di halaman terpisah supaya lebih aman.
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/admin/settings/promo/new")}
              className="rounded-2xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Promo
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Total promo" value={String(items.length)} />
            <Metric label="Aktif" value={String(activeCount)} tone="emerald" />
            <Metric
              label="Dengan rule"
              value={String(
                items.filter((item) => item.valid_weekdays?.length || item.time_start || item.resource_ids?.length).length,
              )}
              tone="sky"
            />
            <Metric
              label="Dipakai"
              value={String(items.reduce((sum, item) => sum + Number(item.usage_count || 0), 0))}
              tone="amber"
            />
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari kode atau nama promo"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/[0.03]"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:w-auto">
              {[
                { value: "all", label: "Semua" },
                { value: "active", label: "Aktif" },
                { value: "inactive", label: "Nonaktif" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value as "all" | "active" | "inactive")}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-xs font-semibold transition",
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
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              Memuat promo tenant...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              {items.length === 0
                ? "Belum ada promo. Klik `Tambah Promo` untuk mulai bikin voucher pertama."
                : "Tidak ada promo yang cocok dengan filter sekarang."}
            </div>
          ) : (
            filteredItems.map((item) => (
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
                className="w-full rounded-[1.4rem] border border-slate-200 bg-slate-50/60 p-4 text-left transition-all hover:border-sky-200 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-950">
                        {item.code}
                      </span>
                      <Badge className={cn(item.is_active ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200")}>
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
                      {item.name}
                    </h2>
                  </div>
                  <Switch
                    checked={item.is_active}
                    onClick={(event) => event.stopPropagation()}
                    onCheckedChange={(checked) => {
                      if (checked !== item.is_active) {
                        void toggleStatus(item);
                      }
                    }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {summaryRule(item).map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                  Dipakai {item.usage_count || 0}x
                </div>
              </div>
            ))
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
  tone?: "slate" | "emerald" | "sky" | "amber";
}) {
  const tones = {
    slate: "from-slate-100 to-white text-slate-800 dark:from-white/5 dark:to-transparent dark:text-slate-100",
    emerald: "from-emerald-100 to-white text-emerald-700 dark:from-emerald-500/10 dark:to-transparent dark:text-emerald-200",
    sky: "from-sky-100 to-white text-sky-700 dark:from-sky-500/10 dark:to-transparent dark:text-sky-200",
    amber: "from-amber-100 to-white text-amber-700 dark:from-amber-500/10 dark:to-transparent dark:text-amber-200",
  };
  return (
    <div className={cn("rounded-[1.3rem] border border-slate-200 bg-gradient-to-br p-4 dark:border-white/10", tones[tone])}>
      <div className="text-[11px] font-black uppercase tracking-[0.24em] opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-[950] tracking-tight">{value}</div>
    </div>
  );
}
