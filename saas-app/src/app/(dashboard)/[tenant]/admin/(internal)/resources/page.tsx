"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Layers,
  Settings2,
  Trash2,
  Loader2,
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
} from "lucide-react";
import { AddResourceDialog } from "@/components/resources/add-resources-dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      toast.success(`${name} dihapus!`);
      fetchResources();
    } catch (err) {
      toast.error("Gagal menghapus resource");
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
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500 px-4 selection:bg-blue-600/30 font-plus-jakarta">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-slate-100 pb-8">
        <div className="space-y-2">
          {/* Tambahan pr-6 agar font italic pada kata 'Resources/Gaming' tidak kepotong di ujung h1 */}
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase italic pr-6 leading-[1.1]">
            Manage <span className="text-blue-600">{labels.title}</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] italic">
            {labels.desc}
          </p>
        </div>
        <AddResourceDialog
          category={businessCategory}
          onRefresh={fetchResources}
        />
      </div>

      {loading ? (
        <div className="h-80 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="font-black text-slate-300 uppercase tracking-widest text-[10px] italic">
            Syncing Assets...
          </p>
        </div>
      ) : error ? (
        <div className="py-20 text-center bg-red-50/50 rounded-[2.5rem] border-2 border-dashed border-red-100">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-red-900 font-black uppercase text-base">
            Connection Error
          </h3>
          <Button
            onClick={fetchResources}
            variant="link"
            className="text-red-600 font-bold uppercase text-xs mt-1 underline decoration-2"
          >
            Coba Lagi
          </Button>
        </div>
      ) : resources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => {
            const mainItems =
              res.items?.filter(
                (i: any) =>
                  i.item_type === "console_option" || i.item_type === "main",
              ) || [];
            const addonItems =
              res.items?.filter(
                (i: any) => i.item_type === "add_on" || i.item_type === "addon",
              ) || [];

            return (
              <Card
                key={res.id}
                className="group rounded-[2.5rem] border-none shadow-sm hover:shadow-2xl transition-all duration-500 bg-white ring-1 ring-slate-100 hover:ring-blue-100 flex flex-col overflow-visible"
              >
                <CardContent className="p-7 flex-1 flex flex-col">
                  {/* Status & Icon Row */}
                  <div className="flex justify-between items-center mb-6">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner",
                        res.status === "available"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-slate-50 text-slate-300",
                      )}
                    >
                      {labels.icon}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-4 py-1 rounded-full font-black uppercase text-[9px] tracking-widest border-none shadow-sm shrink-0",
                        res.status === "available"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-orange-100 text-orange-700",
                      )}
                    >
                      {res.status}
                    </Badge>
                  </div>

                  {/* Title & Category Row */}
                  <div className="mb-6 space-y-2">
                    {/* pr-4 dan tracking-tight untuk memberi ruang font italic */}
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic pr-4 leading-tight tracking-tight break-words">
                      {res.name}
                    </h3>
                    <div className="flex">
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-500 font-bold text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-md border-none"
                      >
                        {res.category || `${labels.unitLabel} PREMIUM`}
                      </Badge>
                    </div>
                  </div>

                  {/* INVENTORY OVERVIEW */}
                  <div className="flex-1 space-y-5 mb-8">
                    <div className="space-y-3">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                        <Zap className="h-3 w-3" /> Konfigurasi Utama
                      </p>
                      <div className="space-y-2">
                        {mainItems.length > 0 ? (
                          mainItems.map((item: any) => (
                            <div
                              key={item.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all",
                                item.is_default
                                  ? "bg-blue-50/50 border-blue-100 ring-1 ring-blue-100"
                                  : "bg-white border-slate-50 opacity-60",
                              )}
                            >
                              <div className="flex items-center gap-2 overflow-hidden pr-2">
                                <div
                                  className={cn(
                                    "h-4 w-4 rounded-full flex items-center justify-center shrink-0",
                                    item.is_default
                                      ? "bg-blue-600"
                                      : "bg-slate-200",
                                  )}
                                >
                                  <Check className="h-2.5 w-2.5 text-white stroke-[4]" />
                                </div>
                                {/* Italic name inside item list juga diberi pr-1 */}
                                <span className="text-[10px] font-black text-slate-700 uppercase italic truncate pr-1">
                                  {item.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-black text-blue-600 italic whitespace-nowrap shrink-0">
                                Rp{formatIDR(item.price_per_hour)}
                                <span className="text-[7px] text-slate-400 ml-0.5 font-bold">
                                  /{item.price_unit?.toUpperCase() || "JAM"}
                                </span>
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                            <span className="text-[9px] font-bold text-slate-400 italic">
                              Opsi belum diatur
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                        <Package className="h-3 w-3" /> Tambahan
                      </p>
                      <div className="flex flex-wrap gap-1.5 px-1">
                        {addonItems.length > 0 ? (
                          addonItems.slice(0, 5).map((item: any) => (
                            <Badge
                              key={item.id}
                              variant="secondary"
                              className="bg-slate-50 border border-slate-100 text-[8px] font-black py-1 px-2 rounded-lg text-slate-500 uppercase tracking-tighter italic pr-2"
                            >
                              + {item.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[9px] font-bold text-slate-300 italic">
                            Tidak ada tambahan
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex gap-3 pt-6 border-t border-slate-50 mt-auto">
                    <Link
                      href={`/admin/resources/${res.id}`}
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border-slate-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm group italic pr-4"
                      >
                        <Settings2 className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform non-italic" />
                        Atur Unit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(res.id, res.name)}
                      className="h-12 w-12 p-0 rounded-2xl text-red-300 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all shrink-0"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="py-32 text-center bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100">
          <div className="relative h-24 w-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl ring-1 ring-slate-100">
            <Inbox className="h-12 w-12 text-slate-200" />
            <div className="absolute -top-1 -right-1 h-8 w-8 bg-blue-500 rounded-full border-4 border-white animate-bounce flex items-center justify-center shadow-lg">
              <Plus className="text-white h-4 w-4 stroke-[4]" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic pr-4 mb-2">
            Daftar {labels.unitLabel} Kosong
          </h3>
          <p className="text-slate-400 font-bold text-xs mb-10 uppercase tracking-widest italic pr-2">
            Ayo tambahkan {labels.unitLabel.toLowerCase()} pertama untuk bisnis
            Anda.
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
