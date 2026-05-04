"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers,
  Settings2,
  Trash2,
  Inbox,
  AlertCircle,
  Gamepad2,
  Camera,
  Trophy,
  Briefcase,
  Check,
} from "lucide-react";
import { AddResourceDialog } from "@/components/resources/add-resources-dialog";
import {
  DashboardMetricCard,
  DashboardPanel,
} from "@/components/dashboard/analytics-kit";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ResourceItem = {
  id: string;
  name: string;
  item_type: string;
  price: number;
  price_unit?: string;
  unit_duration?: number;
  is_default?: boolean;
};

type ResourceRow = {
  id: string;
  name: string;
  category?: string;
  status?: string;
  items?: ResourceItem[];
  smart_device_summary?: {
    id: string;
    device_id: string;
    device_name: string;
    pairing_status: string;
    connection_status: string;
    is_enabled: boolean;
    last_seen_at?: string | null;
  } | null;
};

// --- KOMPONEN SKELETON COMPACT ---
function ResourceSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Card
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-100/80 dark:border-white/15 dark:bg-[#0f0f17] dark:ring-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] space-y-4"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-10 rounded-xl dark:bg-slate-800" />
            <Skeleton className="h-5 w-16 rounded-full dark:bg-slate-800" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4 dark:bg-slate-800" />
            <Skeleton className="h-3 w-1/3 dark:bg-slate-800" />
          </div>
          <Skeleton className="h-20 w-full rounded-xl dark:bg-slate-800" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-xl dark:bg-slate-800" />
            <Skeleton className="h-10 w-10 rounded-xl dark:bg-slate-800" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [businessCategory, setBusinessCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchResources = async () => {
    setError(false);
    try {
      const res = await api.get("/resources-all");
      if (res.data) {
        setResources(res.data.resources || []);
        setBusinessCategory(res.data.business_category || "");
        localStorage.setItem("cache_resources_all", JSON.stringify(res.data));
      }
    } catch {
      console.error("Fetch Error:");
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus ${name} secara permanen?`)) return;
    try {
      await api.delete(`/resources-all/${id}`);
      toast.success(`${name} berhasil dihapus`);
      fetchResources();
    } catch {
      toast.error("Gagal menghapus resource");
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  const priceUnitLabel = (unit?: string) => {
    switch (unit) {
      case "hour":
        return "jam";
      case "session":
        return "sesi";
      case "day":
        return "hari";
      case "week":
        return "minggu";
      case "month":
        return "bulan";
      case "year":
        return "tahun";
      default:
        return unit || "unit";
    }
  };

  const labels = (() => {
    switch (businessCategory) {
      case "gaming_hub":
        return {
          title: "Gaming Resources",
          icon: <Gamepad2 size={18} />,
          unit: "STATION",
        };
      case "sport_center":
        return { title: "Sports Resources", icon: <Trophy size={18} />, unit: "FIELD" };
      case "creative_space":
        return { title: "Creative Resources", icon: <Camera size={18} />, unit: "ROOM" };
      case "social_space":
        return {
          title: "Social Resources",
          icon: <Briefcase size={18} />,
          unit: "DESK",
        };
      default:
        return { title: "Resources", icon: <Layers size={18} />, unit: "UNIT" };
    }
  })();

  const statusTone = (status?: string) => {
    switch ((status || "").toLowerCase()) {
      case "available":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
      case "occupied":
      case "busy":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
      case "maintenance":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-300";
      default:
      return "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300";
    }
  };

  const totalPackages = resources.reduce((sum, resource) => {
    return (
      sum +
      (resource.items?.filter((item) =>
        ["main_option", "main", "console_option"].includes(item.item_type),
      ).length || 0)
    );
  }, 0);
  const availableResources = resources.filter(
    (resource) => String(resource.status || "").toLowerCase() === "available",
  ).length;
  const smartDeviceCount = resources.filter(
    (resource) => resource.smart_device_summary,
  ).length;

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-3 pb-20 pt-5 font-plus-jakarta md:space-y-6 md:px-4">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.95)_42%,rgba(240,253,244,0.92))] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(12,31,54,0.94)_45%,rgba(20,83,45,0.72))] dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_58%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] dark:bg-white dark:text-slate-950">
              {labels.icon}
            </div>
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                Resource Management
              </div>
              <h1 className="text-3xl font-[950] tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                {labels.title}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Kelola resource, paket harga, dan koneksi smart device dengan struktur yang lebih mudah dipindai oleh tim operasional.
              </p>
            </div>
          </div>

          <AddResourceDialog
            category={businessCategory}
            onRefresh={fetchResources}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          label="Total Resource"
          value={`${resources.length} ${labels.unit}`}
          hint="resource terdaftar di tenant"
          icon={Layers}
          tone="indigo"
          loading={loading}
        />
        <DashboardMetricCard
          label="Status Available"
          value={String(availableResources)}
          hint="resource siap dipakai"
          icon={Check}
          tone="emerald"
          loading={loading}
        />
        <DashboardMetricCard
          label="Paket Aktif"
          value={String(totalPackages)}
          hint="opsi harga utama aktif"
          icon={Settings2}
          tone="amber"
          loading={loading}
        />
        <DashboardMetricCard
          label="Smart Device"
          value={String(smartDeviceCount)}
          hint="resource terhubung perangkat"
          icon={Gamepad2}
          tone="slate"
          loading={loading}
        />
      </div>

      {/* 2. GRID CONTENT */}
      {loading ? (
        <ResourceSkeleton />
      ) : error ? (
        <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/30 dark:border-red-900/20 dark:bg-red-950/5">
          <AlertCircle className="h-10 w-10 text-red-400 mb-4 opacity-40" />
          <h3 className="text-sm font-semibold text-red-900 dark:text-red-400">
            Gagal memuat resource
          </h3>
          <Button
            onClick={fetchResources}
            variant="ghost"
            className="mt-4 text-[10px] font-semibold hover:bg-red-100 dark:hover:bg-red-900/20"
          >
            Coba lagi
          </Button>
        </div>
      ) : resources.length > 0 ? (
        <DashboardPanel
          eyebrow="Resource Catalog"
          title="Kartu resource dengan status dan paket yang konsisten"
          description="Setiap kartu menjaga hierarchy yang sama: status, nama resource, paket aktif, lalu action di bagian bawah."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-5">
          {resources.map((res) => {
            const mainItems =
              res.items?.filter((i) =>
                ["main_option", "main", "console_option"].includes(i.item_type),
              ) || [];

            return (
              <Card
                key={res.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-[var(--bookinaja-200)] dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <CardContent className="relative z-10 flex flex-1 flex-col p-4 md:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex rounded-full bg-[var(--bookinaja-50)] px-2.5 py-1 text-[8px] font-semibold tracking-[0.22em] text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]">
                          {res.category || labels.unit}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[8px] font-semibold tracking-[0.22em]",
                            statusTone(res.status),
                          )}
                        >
                          {res.status || "draft"}
                        </span>
                      </div>
                      <h3 className="truncate text-lg font-semibold text-slate-950 transition-colors group-hover:text-[var(--bookinaja-700)] dark:text-white dark:group-hover:text-[var(--bookinaja-300)] md:text-xl">
                        {res.name}
                      </h3>
                      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {mainItems.length > 0
                          ? `${mainItems.length} konfigurasi harga tersimpan`
                          : "Belum ada konfigurasi harga aktif"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/admin/resources/${res.id}`} className="w-full">
                        <Button
                          variant="outline"
                          className="h-9 w-9 md:h-10 md:w-10 rounded-xl border-slate-200 bg-slate-950 p-0 text-white transition-all hover:bg-[var(--bookinaja-600)] hover:text-white dark:border-white/15 dark:bg-slate-900 flex items-center justify-center group/btn"
                        >
                          <Settings2
                            size={12}
                            className="group-hover/btn:rotate-90 transition-transform"
                          />
                          <span className="sr-only">Manage</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(res.id, res.name)}
                        className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all p-0 flex items-center justify-center"
                      >
                        <Trash2 size={12} />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                      <div className="text-[8px] font-semibold tracking-[0.24em] text-slate-400">
                        Paket Aktif
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                        {mainItems.length}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                      <div className="text-[8px] font-semibold tracking-[0.24em] text-slate-400">
                        Smart Point
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                        {res.smart_device_summary
                          ? res.smart_device_summary.connection_status
                          : "belum aktif"}
                      </div>
                    </div>
                  </div>

                  <div className="mb-5 flex-1 space-y-2">
                    {res.smart_device_summary && (
                      <div className="rounded-xl border border-[color:rgba(59,130,246,0.18)] bg-[var(--bookinaja-50)] px-3 py-3 text-[10px] font-semibold text-[var(--bookinaja-700)] dark:border-[color:rgba(96,165,250,0.2)] dark:bg-[color:rgba(59,130,246,0.12)] dark:text-[var(--bookinaja-100)]">
                        {res.smart_device_summary.device_name} • {res.smart_device_summary.device_id}
                      </div>
                    )}
                    {mainItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-3 transition-all",
                          item.is_default
                            ? "border-[color:rgba(59,130,246,0.22)] bg-[var(--bookinaja-50)] dark:border-[color:rgba(96,165,250,0.18)] dark:bg-[color:rgba(59,130,246,0.12)]"
                            : "border-slate-200 bg-slate-50/70 dark:border-white/5 dark:bg-white/[0.03]",
                        )}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Check
                            className={cn(
                              "h-3 w-3 shrink-0",
                              item.is_default
                                ? "text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]"
                                : "text-slate-300",
                            )}
                            strokeWidth={4}
                          />
                          <span className="truncate text-[9px] font-semibold text-slate-700 dark:text-slate-300 md:text-[10px]">
                            {item.name}
                          </span>
                        </div>
                        <span className="ml-2 whitespace-nowrap text-[9px] font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)] md:text-[10px]">
                          Rp{formatIDR(item.price)}
                          {item.price_unit ? `/${priceUnitLabel(item.price_unit)}` : ""}
                        </span>
                      </div>
                    ))}
                    {mainItems.length > 3 && (
                      <p className="text-center text-[9px] font-bold text-slate-400">
                        +{mainItems.length - 3} paket lainnya
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end border-t border-slate-100 pt-4 dark:border-white/5">
                    <Link
                      href={`/admin/resources/${res.id}`}
                      className="text-[10px] font-semibold tracking-[0.22em] text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]"
                    >
                      Buka Detail
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        </DashboardPanel>
      ) : (
        /* 3. EMPTY STATE */
        <div className="flex h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-white/15 dark:bg-[#0f0f17]">
          <div className="h-20 w-20 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <Inbox size={32} className="text-slate-200" />
          </div>
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Belum ada resource
          </h3>
          <p className="text-xs font-bold text-slate-400 mt-2 mb-8 tracking-widest">
            Tambahkan resource pertama untuk mulai mengelola operasional digital
          </p>
          <AddResourceDialog
            category={businessCategory}
            onRefresh={fetchResources}
          />
        </div>
      )}
    </div>
  );
}
