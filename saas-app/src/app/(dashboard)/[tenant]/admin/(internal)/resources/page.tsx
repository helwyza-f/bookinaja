"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers,
  Settings2,
  Trash2,
  Inbox,
  AlertCircle,
  Zap,
  Package,
  Gamepad2,
  Camera,
  Trophy,
  Briefcase,
  Plus,
  Check,
  Clock,
} from "lucide-react";
import { AddResourceDialog } from "@/components/resources/add-resources-dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- KOMPONEN SKELETON ---
function ResourceSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card
          key={i}
          className="rounded-[2.5rem] border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-white/5 p-7 space-y-6"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-12 w-12 rounded-2xl dark:bg-slate-800" />
            <Skeleton className="h-6 w-20 rounded-full dark:bg-slate-800" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4 dark:bg-slate-800" />
            <Skeleton className="h-4 w-1/4 dark:bg-slate-800" />
          </div>
          <div className="space-y-4 py-4">
            <Skeleton className="h-12 w-full rounded-xl dark:bg-slate-800" />
            <Skeleton className="h-12 w-full rounded-xl dark:bg-slate-800" />
          </div>
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-12 flex-1 rounded-2xl dark:bg-slate-800" />
            <Skeleton className="h-12 w-12 rounded-2xl dark:bg-slate-800" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
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

        // --- PENTING: SIMPAN KE CACHE UNTUK DETAIL PAGE ---
        // Dengan menyimpan di sini, Detail Page bisa render INSTAN tanpa skeleton
        localStorage.setItem("cache_resources_all", JSON.stringify(res.data));
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus ${name} secara permanen?`)) return;
    try {
      await api.delete(`/resources-all/${id}`);
      toast.success(`${name.toUpperCase()} BERHASIL DIHAPUS`);
      fetchResources();
    } catch (err) {
      toast.error("GAGAL MENGHAPUS RESOURCE");
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  const getContextualLabel = () => {
    switch (businessCategory) {
      case "gaming_hub":
        return {
          title: "Unit Gaming",
          desc: "Monitor ketersediaan PC & Console",
          icon: <Gamepad2 className="h-6 w-6 stroke-[2.5]" />,
          unitLabel: "UNIT",
        };
      case "sport_center":
        return {
          title: "Daftar Lapangan",
          desc: "Monitor ketersediaan lapangan olahraga",
          icon: <Trophy className="h-6 w-6 stroke-[2.5]" />,
          unitLabel: "LAPANGAN",
        };
      case "creative_space":
        return {
          title: "Studio & Ruangan",
          desc: "Monitor jadwal sewa ruangan kreatif",
          icon: <Camera className="h-6 w-6 stroke-[2.5]" />,
          unitLabel: "STUDIO",
        };
      case "social_space":
        return {
          title: "Ruang & Meja",
          desc: "Monitor reservasi meeting room",
          icon: <Briefcase className="h-6 w-6 stroke-[2.5]" />,
          unitLabel: "RUANGAN",
        };
      default:
        return {
          title: "Resources",
          desc: "Monitor ketersediaan & unit bisnis",
          icon: <Layers className="h-6 w-6 stroke-[2.5]" />,
          unitLabel: "UNIT",
        };
    }
  };

  const labels = getContextualLabel();

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700 px-4 font-plus-jakarta text-slate-900 dark:text-slate-100">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-slate-100 dark:border-white/5 pb-10 mt-10">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic pr-6 leading-none">
            Manage <span className="text-blue-600">{labels.title}</span>
          </h1>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] italic pr-2">
            {labels.desc}
          </p>
        </div>
        <AddResourceDialog
          category={businessCategory}
          onRefresh={fetchResources}
        />
      </div>

      {loading ? (
        <ResourceSkeleton />
      ) : error ? (
        <div className="py-24 text-center bg-red-50/50 dark:bg-red-950/10 rounded-[3rem] border-2 border-dashed border-red-100 dark:border-red-900/20">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-6 opacity-50" />
          <h3 className="text-red-900 dark:text-red-400 font-black uppercase text-xl italic pr-2">
            Connection Error
          </h3>
          <p className="text-red-600/60 dark:text-red-400/40 text-[10px] font-bold uppercase tracking-widest mt-2 mb-8 pr-2">
            Gagal menyambung ke server
          </p>
          <Button
            onClick={fetchResources}
            variant="outline"
            className="rounded-xl border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-black uppercase italic text-xs px-8"
          >
            COBA LAGI
          </Button>
        </div>
      ) : resources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {resources.map((res) => {
            const mainItems =
              res.items?.filter((i: any) =>
                ["main_option", "main", "console_option"].includes(i.item_type),
              ) || [];
            const addonItems =
              res.items?.filter((i: any) =>
                ["add_on", "addon"].includes(i.item_type),
              ) || [];

            return (
              <Card
                key={res.id}
                className="group rounded-[3rem] border-none shadow-sm hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] transition-all duration-700 bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5 hover:ring-blue-100 dark:hover:ring-blue-900/30 flex flex-col relative overflow-hidden"
              >
                {/* Background Decor */}
                <div className="absolute -right-4 -top-4 opacity-[0.02] dark:opacity-[0.05] group-hover:scale-125 transition-transform duration-700 pointer-events-none">
                  {labels.icon && (
                    <div className="scale-[4]">{labels.icon}</div>
                  )}
                </div>

                <CardContent className="p-8 flex-1 flex flex-col relative z-10">
                  {/* Status & Icon Row */}
                  <div className="flex justify-between items-start mb-8">
                    <div
                      className={cn(
                        "h-14 w-14 rounded-[1.2rem] flex items-center justify-center transition-all duration-500 shadow-inner",
                        res.status === "available"
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600",
                      )}
                    >
                      {labels.icon}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-5 py-1.5 rounded-full font-black uppercase text-[10px] tracking-tighter border-none shadow-sm pr-2",
                        res.status === "available"
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                          : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
                      )}
                    >
                      {res.status}
                    </Badge>
                  </div>

                  {/* Title & Category Row */}
                  <div className="mb-8 space-y-2">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic pr-6 leading-none tracking-tight break-words group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {res.name}
                    </h3>
                    <div className="flex">
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg border-none pr-2"
                      >
                        {res.category || `${labels.unitLabel} PREMIUM`}
                      </Badge>
                    </div>
                  </div>

                  {/* INVENTORY OVERVIEW */}
                  <div className="flex-1 space-y-6 mb-10">
                    <div className="space-y-4">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2 px-1 italic pr-2">
                        <Zap className="h-3 w-3 fill-current" /> Paket
                        Konfigurasi
                      </p>
                      <div className="space-y-2.5">
                        {mainItems.length > 0 ? (
                          mainItems.map((item: any) => (
                            <div
                              key={item.id}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                item.is_default
                                  ? "bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 ring-1 ring-blue-100 dark:ring-blue-900/20"
                                  : "bg-white dark:bg-slate-900/50 border-slate-50 dark:border-white/5 opacity-60",
                              )}
                            >
                              <div className="flex items-center gap-3 overflow-hidden pr-2">
                                <div
                                  className={cn(
                                    "h-5 w-5 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                    item.is_default
                                      ? "bg-blue-600"
                                      : "bg-slate-200 dark:bg-slate-800",
                                  )}
                                >
                                  <Check className="h-3 w-3 text-white stroke-[4]" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase italic truncate pr-2">
                                    {item.name}
                                  </span>
                                  {item.unit_duration > 0 && (
                                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 uppercase italic pr-1">
                                      <Clock className="h-2.5 w-2.5" />{" "}
                                      {item.unit_duration} MENIT
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 italic whitespace-nowrap shrink-0 pr-1">
                                Rp{formatIDR(item.price || 0)}
                                <span className="text-[8px] text-slate-400 dark:text-slate-600 ml-1 font-bold not-italic">
                                  /{item.price_unit?.toUpperCase() || "JAM"}
                                </span>
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-white/5 text-center">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 italic uppercase tracking-widest pr-2">
                              Opsi Harga Belum Diatur
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2 px-1 italic pr-2">
                        <Package className="h-3 w-3" /> Add-ons Opsional
                      </p>
                      <div className="flex flex-wrap gap-2 px-1">
                        {addonItems.length > 0 ? (
                          addonItems.slice(0, 6).map((item: any) => (
                            <Badge
                              key={item.id}
                              variant="secondary"
                              className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 text-[9px] font-black py-1.5 px-3 rounded-xl text-slate-500 dark:text-slate-400 uppercase tracking-tighter italic pr-3 shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-colors"
                            >
                              + {item.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 dark:text-slate-700 italic px-1 pr-2">
                            TIDAK ADA LAYANAN TAMBAHAN
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex gap-4 pt-8 border-t border-slate-50 dark:border-white/5 mt-auto">
                    <Link
                      href={`/admin/resources/${res.id}`}
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        className="w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] border-slate-200 dark:border-white/10 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all shadow-sm group italic pr-4"
                      >
                        <Settings2 className="mr-3 h-5 w-5 group-hover:rotate-90 transition-transform non-italic" />
                        Atur Unit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(res.id, res.name)}
                      className="h-14 w-14 p-0 rounded-2xl text-red-300 hover:text-red-600 dark:text-red-900 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/20 transition-all shrink-0"
                    >
                      <Trash2 className="h-6 w-6" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="py-40 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-700">
          <div className="relative h-28 w-28 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl ring-1 ring-slate-100 dark:ring-white/10">
            <Inbox className="h-14 w-14 text-slate-200 dark:text-slate-700" />
            <div className="absolute -top-2 -right-2 h-10 w-10 bg-blue-500 rounded-2xl border-4 border-white dark:border-slate-800 animate-bounce flex items-center justify-center shadow-lg">
              <Plus className="text-white h-5 w-5 stroke-[4]" />
            </div>
          </div>
          <h3 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic pr-6 mb-3">
            Daftar {labels.unitLabel} Kosong
          </h3>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mb-12 uppercase tracking-[0.3em] italic pr-4 max-w-md mx-auto leading-relaxed">
            Ayo tambahkan {labels.unitLabel.toLowerCase()} pertama untuk memulai
            operasional bisnis digital Anda.
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
