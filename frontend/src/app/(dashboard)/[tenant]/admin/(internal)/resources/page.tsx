"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Layers,
  Trash2,
  Gamepad2,
  Camera,
  Trophy,
  Briefcase,
  Check,
  Package2,
  ShoppingBag,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { AddResourceDialog } from "@/components/resources/add-resources-dialog";
import { DashboardPanel } from "@/components/dashboard/analytics-kit";
import {
  AdminSurfaceEmpty,
  AdminSurfaceError,
} from "@/components/dashboard/admin-surface-state";
import api from "@/lib/api";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ResourceRow = {
  id: string;
  name: string;
  category?: string;
  status?: string;
  operating_mode?: string;
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

function ResourceSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card
          key={index}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="space-y-3 p-4">
            <Skeleton className="aspect-[16/10] w-full rounded-xl dark:bg-slate-800" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full dark:bg-slate-800" />
              <Skeleton className="h-5 w-16 rounded-full dark:bg-slate-800" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 dark:bg-slate-800" />
              <Skeleton className="h-6 w-3/4 dark:bg-slate-800" />
              <Skeleton className="h-4 w-full dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-14 rounded-xl dark:bg-slate-800" />
              <Skeleton className="h-14 rounded-xl dark:bg-slate-800" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded-xl dark:bg-slate-800" />
              <Skeleton className="h-10 w-12 rounded-xl dark:bg-slate-800" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

type ResourceMetricCardProps = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: "indigo" | "emerald" | "amber" | "slate";
  loading?: boolean;
};

function ResourceMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  loading = false,
}: ResourceMetricCardProps) {
  const toneStyles = {
    indigo: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]",
    },
    emerald: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    amber: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    },
    slate: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
    },
  } as const;

  const colors = toneStyles[tone];

  return (
    <Card className={cn("rounded-xl border p-3", colors.shell)}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 sm:text-[11px]">
            {label}
          </div>
          <div className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-[1.65rem]">
            {loading ? "..." : value}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {hint}
          </div>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            colors.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const { tenantCategory } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResourceRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [modeFilter, setModeFilter] = useState<
    "all" | "timed" | "direct_sale" | "hybrid"
  >("all");

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
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/resources-all/${deleteTarget.id}`);
      toast.success(`${deleteTarget.name} berhasil dihapus`);
      setDeleteTarget(null);
      void fetchResources();
    } catch {
      toast.error("Gagal menghapus resource");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    void fetchResources();
  }, []);

  const businessCategory = tenantCategory || "";
  const labels = (() => {
    switch (businessCategory) {
      case "gaming_hub":
        return { title: "Gaming Resources", icon: <Gamepad2 size={18} /> };
      case "sport_center":
        return { title: "Sports Resources", icon: <Trophy size={18} /> };
      case "creative_space":
        return { title: "Creative Resources", icon: <Camera size={18} /> };
      case "social_space":
        return { title: "Social Resources", icon: <Briefcase size={18} /> };
      default:
        return { title: "Resources", icon: <Layers size={18} /> };
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

  const operatingModeMeta = (mode?: string) => {
    switch (mode) {
      case "direct_sale":
        return {
          label: "Jual langsung",
          hint: "Masuk ke POS tanpa slot waktu",
          className:
            "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
        };
      case "hybrid":
        return {
          label: "Hybrid",
          hint: "Bisa booking dan bisa jual langsung",
          className:
            "bg-violet-500/10 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
        };
      default:
        return {
          label: "Booking",
          hint: "Dipakai untuk jadwal, sesi, dan durasi",
          className:
            "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]",
        };
    }
  };

  const normalizeOperatingMode = (mode?: string) => {
    if (mode === "direct_sale" || mode === "hybrid") return mode;
    return "timed" as const;
  };

  const totalPackages = useMemo(
    () =>
      resources.reduce(
        (sum, resource) => sum + Number(resource.main_option_count || 0),
        0,
      ),
    [resources],
  );

  const availableResources = useMemo(
    () =>
      resources.filter(
        (resource) => String(resource.status || "").toLowerCase() === "available",
      ).length,
    [resources],
  );

  const directSaleCount = useMemo(
    () =>
      resources.filter(
        (resource) => normalizeOperatingMode(resource.operating_mode) === "direct_sale",
      ).length,
    [resources],
  );

  const availableModeFilters = useMemo(
    () =>
      Array.from(
        new Set(
          resources.map((resource) =>
            normalizeOperatingMode(resource.operating_mode),
          ),
        ),
      ),
    [resources],
  );

  const shouldShowModeFilter = availableModeFilters.length > 1;

  const filteredResources = useMemo(
    () =>
      resources.filter((resource) => {
        if (modeFilter === "all") return true;
        return normalizeOperatingMode(resource.operating_mode) === modeFilter;
      }),
    [modeFilter, resources],
  );

  const modeFilterOptions = [
    { value: "all" as const, label: "Semua" },
    { value: "timed" as const, label: "Booking" },
    { value: "direct_sale" as const, label: "Jual langsung" },
    { value: "hybrid" as const, label: "Hybrid" },
  ].filter(
    (option) => option.value === "all" || availableModeFilters.includes(option.value),
  );

  useEffect(() => {
    if (modeFilter !== "all" && !availableModeFilters.includes(modeFilter)) {
      setModeFilter("all");
    }
  }, [availableModeFilters, modeFilter]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-3 pb-20 pt-3 font-plus-jakarta md:px-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]">
                {labels.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Resources
                </div>
                <h1 className="mt-0.5 text-[1.35rem] font-semibold leading-none text-slate-950 dark:text-white sm:text-[1.45rem]">
                  {labels.title}
                </h1>
              </div>
            </div>

            <AddResourceDialog
              category={businessCategory}
              onRefresh={fetchResources}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <ResourceMetricCard
              label="Total unit"
              value={String(resources.length)}
              hint="Semua unit"
              icon={Layers}
              tone="indigo"
              loading={loading}
            />
            <ResourceMetricCard
              label="Siap dipakai"
              value={String(availableResources)}
              hint="Available"
              icon={Check}
              tone="emerald"
              loading={loading}
            />
            <ResourceMetricCard
              label="Paket utama"
              value={String(totalPackages)}
              hint="Harga siap jual"
              icon={Package2}
              tone="amber"
              loading={loading}
            />
            <ResourceMetricCard
              label="Jual langsung"
              value={String(directSaleCount)}
              hint="Masuk POS"
              icon={ShoppingBag}
              tone="slate"
              loading={loading}
            />
          </div>

          {shouldShowModeFilter ? (
            <div className="flex flex-wrap gap-1.5">
              {modeFilterOptions.map((option) => {
                const isActive = modeFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setModeFilter(option.value)}
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors",
                      isActive
                        ? "border-[var(--bookinaja-600)] bg-[var(--bookinaja-600)] text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-[var(--bookinaja-200)] hover:text-[var(--bookinaja-700)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <ResourceSkeleton />
      ) : error ? (
        <AdminSurfaceError
          title="Gagal memuat resource"
          description="Daftar resource tidak berhasil dimuat. Tanpa data awal ini, status unit dan konfigurasi device tidak bisa dipercaya."
          action={
            <Button
              onClick={() => void fetchResources()}
              variant="outline"
              className="rounded-xl"
            >
              Coba lagi
            </Button>
          }
        />
      ) : resources.length > 0 && filteredResources.length > 0 ? (
        <DashboardPanel title="Daftar resource" compact>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
            {filteredResources.map((res) => {
              const mainItemsCount = Number(res.main_option_count || 0);
              const addonCount = Number(res.addon_count || 0);
              const modeMeta = operatingModeMeta(res.operating_mode);
              const isDirectSale =
                normalizeOperatingMode(res.operating_mode) === "direct_sale";
              const cardDescription = isDirectSale
                ? "Jual langsung di POS tanpa jadwal sesi."
                : "Dipakai untuk booking per jam, sesi, atau durasi.";
              const summaryLabel = isDirectSale
                ? `${mainItemsCount} item jual`
                : `${mainItemsCount} paket`;
              const addonLabel =
                addonCount > 0 ? `${addonCount} add-on` : "Tanpa add-on";
              const readinessLabel =
                mainItemsCount > 0 ? "Harga siap" : "Harga belum lengkap";

              return (
                <Card
                  key={res.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-[var(--bookinaja-200)] dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-900">
                    {res.image_url ? (
                      <Image
                        src={res.image_url}
                        alt={res.name}
                        fill
                        unoptimized
                        sizes="(min-width: 1280px) 360px, (min-width: 768px) 50vw, 100vw"
                        className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 dark:from-slate-900 dark:to-slate-800 dark:text-slate-600">
                        {labels.icon}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                    <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm",
                            modeMeta.className,
                          )}
                        >
                          {modeMeta.label}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm",
                          statusTone(res.status),
                        )}
                      >
                        {res.status || "draft"}
                      </span>
                    </div>
                  </div>
                  <CardContent className="relative z-10 flex flex-1 flex-col p-4">
                    <div className="mb-4 space-y-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        {res.category || "General"}
                      </p>
                      <h3 className="truncate text-lg font-semibold text-slate-950 transition-colors group-hover:text-[var(--bookinaja-700)] dark:text-white dark:group-hover:text-[var(--bookinaja-300)]">
                        {res.name}
                      </h3>
                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        {res.description || cardDescription}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {[
                          summaryLabel,
                          addonLabel,
                          readinessLabel,
                        ].map((label) => (
                          <span
                            key={label}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <Link href={`/admin/resources/${res.id}`} className="flex-1">
                        <Button className="h-10 w-full rounded-xl bg-slate-950 text-sm font-semibold text-white hover:bg-[var(--bookinaja-600)] dark:bg-[var(--bookinaja-600)]">
                          Buka detail
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteTarget(res)}
                        className="h-10 rounded-xl border-rose-200 px-3 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 size={14} />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DashboardPanel>
      ) : resources.length > 0 ? (
        <AdminSurfaceEmpty
          title="Tidak ada resource di mode ini"
          description="Filter mode sedang aktif, tapi belum ada resource yang cocok. Ganti filter untuk melihat katalog lain."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => setModeFilter("all")}
              className="rounded-xl"
            >
              Tampilkan semua mode
            </Button>
          }
        />
      ) : (
        <AdminSurfaceEmpty
          title="Belum ada resource"
          description="Tambahkan resource pertama untuk mulai mengelola operasional, pricing, dan pairing device."
          action={
            <AddResourceDialog
              category={businessCategory}
              onRefresh={fetchResources}
            />
          }
          className="min-h-[42vh]"
        />
      )}

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl border-slate-200 bg-white p-0 shadow-xl dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader className="space-y-4 px-6 pb-5 pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <DialogTitle className="text-left text-xl font-semibold text-slate-950 dark:text-white">
                  Hapus resource
                </DialogTitle>
                <DialogDescription className="text-left text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {deleteTarget
                    ? `Resource ${deleteTarget.name} akan dihapus permanen dari katalog dan tidak bisa dikembalikan.`
                    : "Resource akan dihapus permanen dari katalog dan tidak bisa dikembalikan."}
                </DialogDescription>
              </div>
            </div>

            {deleteTarget ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                  Resource
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                  {deleteTarget.name}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {deleteTarget.category || "General"}
                </div>
              </div>
            ) : null}
          </DialogHeader>
          <DialogFooter className="mt-0 flex flex-row gap-3 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
