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
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ResourceItem = {
  id: string;
  name: string;
  item_type: string;
  price: number;
  is_default?: boolean;
};

type ResourceRow = {
  id: string;
  name: string;
  category?: string;
  status?: string;
  items?: ResourceItem[];
};

// --- KOMPONEN SKELETON COMPACT ---
function ResourceSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Card
          key={i}
          className="rounded-[1.5rem] border-none bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm ring-1 ring-slate-100 dark:ring-white/5"
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
      toast.success(`${name.toUpperCase()} DELETED`);
      fetchResources();
    } catch {
      toast.error("FAILED TO DELETE RESOURCE");
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  const labels = (() => {
    switch (businessCategory) {
      case "gaming_hub":
        return {
          title: "Gaming Units",
          icon: <Gamepad2 size={18} />,
          unit: "STATION",
        };
      case "sport_center":
        return { title: "Courts", icon: <Trophy size={18} />, unit: "FIELD" };
      case "creative_space":
        return { title: "Studios", icon: <Camera size={18} />, unit: "ROOM" };
      case "social_space":
        return {
          title: "Workspaces",
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

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 md:space-y-6 pb-20 animate-in fade-in duration-500 px-3 md:px-4 font-plus-jakarta">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-[2rem] md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f1f4a] via-[#1d4ed8] to-[#60a5fa] text-white shadow-lg shadow-blue-600/20">
            {labels.icon}
          </div>
            <div className="flex flex-col">
              <div className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-600">
                Resource Management
              </div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter text-slate-950 dark:text-white md:text-3xl">
                {labels.title}
              </h1>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 md:text-sm">
                Kelola unit, harga aktif, dan status operasional dalam satu tempat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-2xl bg-slate-50 px-4 py-3 text-right dark:bg-white/5 md:block">
              <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                Total Resource
              </div>
              <div className="mt-1 text-sm font-black italic uppercase text-slate-950 dark:text-white">
                {resources.length} {labels.unit}
              </div>
            </div>
            <AddResourceDialog
              category={businessCategory}
              onRefresh={fetchResources}
            />
          </div>
        </div>
      </div>

      {/* 2. GRID CONTENT */}
      {loading ? (
        <ResourceSkeleton />
      ) : error ? (
        <div className="h-80 flex flex-col items-center justify-center bg-red-50/30 dark:bg-red-950/5 rounded-[2.5rem] border-[0.5px] border-red-100 dark:border-red-900/20">
          <AlertCircle className="h-10 w-10 text-red-400 mb-4 opacity-40" />
          <h3 className="text-sm font-black text-red-900 dark:text-red-400 uppercase italic">
            Sync Failure
          </h3>
          <Button
            onClick={fetchResources}
            variant="ghost"
            className="mt-4 text-[10px] font-black uppercase italic hover:bg-red-100 dark:hover:bg-red-900/20"
          >
            Re-Connect
          </Button>
        </div>
      ) : resources.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
          {resources.map((res) => {
            const mainItems =
              res.items?.filter((i) =>
                ["main_option", "main", "console_option"].includes(i.item_type),
              ) || [];

            return (
              <Card
                key={res.id}
                className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-600/10 dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-[1.9rem]"
              >
                <div className="h-1.5 w-full bg-gradient-to-r from-[#0f1f4a] via-[#1d4ed8] to-[#60a5fa]" />
                <CardContent className="relative z-10 flex flex-1 flex-col p-4 md:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.22em] text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                          {res.category || labels.unit}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.22em]",
                            statusTone(res.status),
                          )}
                        >
                          {res.status || "draft"}
                        </span>
                      </div>
                      <h3 className="truncate text-lg font-black italic uppercase tracking-tighter text-slate-950 transition-colors group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300 md:text-xl">
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
                          className="h-9 w-9 md:h-10 md:w-10 rounded-xl border-slate-200 dark:border-white/10 bg-slate-950 text-white hover:bg-blue-600 hover:text-white transition-all p-0 flex items-center justify-center group/btn"
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
                    <div className="rounded-[1.2rem] bg-slate-50 px-3 py-3 dark:bg-white/5">
                      <div className="text-[8px] font-black uppercase tracking-[0.24em] text-slate-400">
                        Paket Aktif
                      </div>
                      <div className="mt-1 text-lg font-black italic text-slate-950 dark:text-white">
                        {mainItems.length}
                      </div>
                    </div>
                    <div className="rounded-[1.2rem] bg-slate-50 px-3 py-3 dark:bg-white/5">
                      <div className="text-[8px] font-black uppercase tracking-[0.24em] text-slate-400">
                        Harga Dasar
                      </div>
                      <div className="mt-1 text-sm font-black italic text-blue-600 dark:text-blue-300">
                        {mainItems[0] ? `Rp${formatIDR(mainItems[0].price)}` : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mb-5 flex-1 space-y-2">
                    {mainItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between rounded-[1rem] border p-3 transition-all",
                          item.is_default
                            ? "border-blue-200 bg-blue-50/70 dark:border-blue-800/30 dark:bg-blue-900/10"
                            : "border-slate-200 bg-slate-50/70 dark:border-white/5 dark:bg-white/[0.03]",
                        )}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Check
                            className={cn(
                              "h-3 w-3 shrink-0",
                              item.is_default
                                ? "text-blue-600"
                                : "text-slate-300",
                            )}
                            strokeWidth={4}
                          />
                          <span className="truncate text-[9px] font-black uppercase italic text-slate-700 dark:text-slate-300 md:text-[10px]">
                            {item.name}
                          </span>
                        </div>
                        <span className="ml-2 whitespace-nowrap text-[9px] font-black italic text-blue-600 dark:text-blue-300 md:text-[10px]">
                          Rp{formatIDR(item.price)}
                        </span>
                      </div>
                    ))}
                    {mainItems.length > 3 && (
                      <p className="text-center text-[9px] font-bold italic text-slate-400">
                        +{mainItems.length - 3} paket lainnya
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/5">
                    <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Buka detail resource
                    </div>
                    <Link
                      href={`/admin/resources/${res.id}`}
                      className="text-[10px] font-black uppercase italic tracking-widest text-blue-600 dark:text-blue-300"
                    >
                      Kelola
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* 3. EMPTY STATE */
        <div className="h-[50vh] flex flex-col items-center justify-center bg-white dark:bg-slate-950 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10 p-12 text-center">
          <div className="h-20 w-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
            <Inbox size={32} className="text-slate-200" />
          </div>
          <h3 className="text-2xl font-[1000] italic uppercase text-slate-900 dark:text-white tracking-tighter">
            No Assets Found
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase italic mt-2 mb-8 tracking-widest">
            Register your first unit to start digital operation
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

