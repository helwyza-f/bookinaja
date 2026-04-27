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

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 md:space-y-6 pb-20 animate-in fade-in duration-500 px-3 md:px-4 mt-4 md:mt-6 font-plus-jakarta">
      {/* 1. COMPACT HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-[0.5px] border-slate-200 dark:border-white/5 pb-5 md:pb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-950 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-950 shadow-xl">
            {labels.icon}
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-4xl font-[1000] italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
              {labels.title} <span className="text-blue-600">Assets.</span>
            </h1>
            <p className="hidden sm:block text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] italic mt-1.5">
              Inventory Master & Rate Control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end leading-none mr-2 hidden md:flex text-right">
            <span className="text-[8px] font-black text-slate-400 uppercase italic mb-1">
              Stock Level
            </span>
            <span className="text-xs font-[1000] italic text-slate-900 dark:text-white uppercase leading-none">
              {resources.length} {labels.unit}S
            </span>
          </div>
          <AddResourceDialog
            category={businessCategory}
            onRefresh={fetchResources}
          />
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
                className="group rounded-[1.5rem] md:rounded-[2rem] border-[0.5px] border-slate-200 dark:border-white/5 transition-all duration-300 bg-white dark:bg-slate-900 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/5 flex flex-col relative overflow-hidden"
              >
                <CardContent className="p-3 md:p-6 flex-1 flex flex-col relative z-10">
                  {/* Header Actions */}
                  <div className="flex items-start justify-between gap-3 mb-4 md:mb-6">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base md:text-xl font-[1000] text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none truncate group-hover:text-blue-600 transition-colors">
                        {res.name}
                      </h3>
                      <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 opacity-70">
                        {res.category || labels.unit}
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

                  {/* Main Configurations - Compact List */}
                  <div className="flex-1 space-y-2 mb-5 md:mb-8">
                    {mainItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between p-2.5 md:p-3 rounded-xl border-[0.5px] transition-all",
                          item.is_default
                            ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/30"
                            : "bg-slate-50/30 dark:bg-slate-800/20 border-transparent opacity-60",
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
                          <span className="text-[8px] md:text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase italic truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black text-blue-600 italic whitespace-nowrap ml-2">
                          Rp{formatIDR(item.price)}
                        </span>
                      </div>
                    ))}
                    {mainItems.length > 3 && (
                      <p className="text-[8px] font-bold text-slate-400 italic text-center">
                        +{mainItems.length - 3} other rates
                      </p>
                    )}
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

