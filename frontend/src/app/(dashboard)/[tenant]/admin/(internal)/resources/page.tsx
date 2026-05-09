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
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ResourceRow = {
  id: string;
  name: string;
  category?: string;
  status?: string;
  description?: string;
  image_url?: string;
  main_option_count?: number;
  addon_count?: number;
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
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-8 rounded-lg dark:bg-slate-800" />
            <Skeleton className="h-4 w-14 rounded-full dark:bg-slate-800" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4 dark:bg-slate-800" />
            <Skeleton className="h-3 w-1/3 dark:bg-slate-800" />
          </div>
          <Skeleton className="h-16 w-full rounded-lg dark:bg-slate-800" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-lg dark:bg-slate-800" />
            <Skeleton className="h-9 w-9 rounded-lg dark:bg-slate-800" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const { tenantCategory } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    setError(false);
    try {
      const [resourceRes, deviceMapRes] = await Promise.all([
        api.get("/admin/resources/list"),
        api.get("/admin/resources/device-map"),
      ]);

      const resourceItems = Array.isArray(resourceRes.data?.items)
        ? resourceRes.data.items
        : [];
      const deviceItems = Array.isArray(deviceMapRes.data?.items)
        ? deviceMapRes.data.items
        : [];

      const deviceByResource = new Map<string, ResourceRow["smart_device_summary"]>();
      for (const device of deviceItems) {
        if (!device?.resource_id || deviceByResource.has(device.resource_id)) continue;
        if (!device.device_uuid) continue;
        deviceByResource.set(device.resource_id, {
          id: device.device_uuid,
          device_id: device.device_id,
          device_name: device.device_name,
          pairing_status: device.pairing_status,
          connection_status: device.connection_status,
          is_enabled: Boolean(device.is_enabled),
          last_seen_at: device.last_seen_at || null,
        });
      }

      const merged = resourceItems.map((item: ResourceRow) => ({
        ...item,
        smart_device_summary: deviceByResource.get(item.id) || null,
      }));

      setResources(merged);
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

  const businessCategory = tenantCategory || "";
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
    return sum + Number(resource.main_option_count || 0);
  }, 0);
  const availableResources = resources.filter(
    (resource) => String(resource.status || "").toLowerCase() === "available",
  ).length;
  const smartDeviceCount = resources.filter(
    (resource) => resource.smart_device_summary,
  ).length;

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-3 pb-20 pt-4 font-plus-jakarta md:px-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]">
              {labels.icon}
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Resources
              </div>
              <h1 className="text-xl font-semibold text-slate-950 dark:text-white sm:text-2xl">
                {labels.title}
              </h1>
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
          label="Total"
          value={`${resources.length} ${labels.unit}`}
          hint="Terdaftar"
          icon={Layers}
          tone="indigo"
          loading={loading}
        />
        <DashboardMetricCard
          label="Available"
          value={String(availableResources)}
          hint="Siap"
          icon={Check}
          tone="emerald"
          loading={loading}
        />
        <DashboardMetricCard
          label="Paket Aktif"
          value={String(totalPackages)}
          hint="Aktif"
          icon={Settings2}
          tone="amber"
          loading={loading}
        />
        <DashboardMetricCard
          label="Smart Device"
          value={String(smartDeviceCount)}
          hint="Terhubung"
          icon={Gamepad2}
          tone="slate"
          loading={loading}
        />
      </div>

      {/* 2. GRID CONTENT */}
      {loading ? (
        <ResourceSkeleton />
      ) : error ? (
        <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-red-100 bg-red-50/30 dark:border-red-900/20 dark:bg-red-950/5">
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
          eyebrow="Catalog"
          title="Daftar resource"
          description="Daftar resource aktif untuk operasional harian."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
          {resources.map((res) => {
            const mainItemsCount = Number(res.main_option_count || 0);

            return (
              <Card
                key={res.id}
                className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors hover:border-[var(--bookinaja-200)] dark:border-slate-800 dark:bg-slate-950"
              >
                <CardContent className="relative z-10 flex flex-1 flex-col p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex rounded-full bg-[var(--bookinaja-50)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]">
                          {res.category || labels.unit}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            statusTone(res.status),
                          )}
                        >
                          {res.status || "draft"}
                        </span>
                      </div>
                      <h3 className="truncate text-base font-semibold text-slate-950 transition-colors group-hover:text-[var(--bookinaja-700)] dark:text-white dark:group-hover:text-[var(--bookinaja-300)]">
                        {res.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {mainItemsCount > 0
                          ? `${mainItemsCount} konfigurasi harga tersimpan`
                          : "Belum ada konfigurasi harga aktif"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/admin/resources/${res.id}`} className="w-full">
                        <Button
                          variant="outline"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border-slate-200 bg-slate-950 p-0 text-white transition-colors hover:bg-[var(--bookinaja-600)] hover:text-white dark:border-slate-700 dark:bg-slate-900"
                        >
                          <Settings2 size={12} />
                          <span className="sr-only">Manage</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(res.id, res.name)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 p-0 text-white transition-colors hover:bg-red-600"
                      >
                        <Trash2 size={12} />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/30">
                      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Paket Aktif
                      </div>
                      <div className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                        {mainItemsCount}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/30">
                      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Smart Point
                      </div>
                      <div className="mt-1 text-sm font-medium text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                        {res.smart_device_summary
                          ? res.smart_device_summary.connection_status
                          : "belum aktif"}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex-1 space-y-2">
                    {res.smart_device_summary && (
                      <div className="rounded-lg border border-[color:rgba(59,130,246,0.18)] bg-[var(--bookinaja-50)] px-3 py-2.5 text-xs font-medium text-[var(--bookinaja-700)] dark:border-[color:rgba(96,165,250,0.2)] dark:bg-[color:rgba(59,130,246,0.12)] dark:text-[var(--bookinaja-100)]">
                        {res.smart_device_summary.device_name} · {res.smart_device_summary.device_id}
                      </div>
                    )}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/30">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Check className="h-3 w-3 shrink-0 text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]" strokeWidth={4} />
                          <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            Paket harga utama
                          </span>
                        </div>
                        <span className="ml-2 whitespace-nowrap text-[11px] font-medium text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                          {mainItemsCount} paket
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/30">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          Add-on tersimpan
                        </span>
                        <span className="ml-2 whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-300">
                          {Number(res.addon_count || 0)} item
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                    <Link
                      href={`/admin/resources/${res.id}`}
                      className="text-[11px] font-medium text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]"
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
        <div className="flex h-[42vh] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900">
            <Inbox size={32} className="text-slate-200" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Belum ada resource
          </h3>
          <p className="mb-6 mt-2 max-w-sm text-sm text-slate-500">
            Tambahkan resource pertama untuk mulai mengelola operasional.
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
