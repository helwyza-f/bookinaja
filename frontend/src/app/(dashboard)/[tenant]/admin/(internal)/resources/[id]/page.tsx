"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Star,
  Clock,
  Gamepad2,
  Trophy,
  Camera,
  Briefcase,
  Loader2,
  Settings2,
  CheckCircle2,
  Image as ImageIcon,
  X,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  ManageItemDialog,
  type ResourceItemConfig,
} from "@/components/resources/manage-item-dialog";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import { BulkImageUpload } from "@/components/upload/bulk-image-upload";
import ResourceDetailLoading from "./loading";

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  type ResourceDetail = {
    id: string;
    name: string;
    category?: string;
    description?: string;
    image_url?: string;
    gallery?: string[];
    items?: ResourceItemConfig[];
    smart_device_summary?: {
      id: string;
      device_id: string;
      device_name: string;
      pairing_status: string;
      connection_status: string;
      is_enabled: boolean;
      last_seen_at?: string | null;
      firmware_version?: string;
    } | null;
  };

  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [businessCategory, setBusinessCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // UI States
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdatingResource, setIsUpdatingResource] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourceItemConfig | null>(
    null,
  );

  // Form States
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);

  const fetchData = useCallback(
    async (useCache = true) => {
      try {
        if (useCache) {
          const cachedAll = localStorage.getItem(
            `cache_resources_all:${tenantSlug}`,
          );
          if (cachedAll) {
            const parsed = JSON.parse(cachedAll);
            const found = parsed.resources?.find(
              (r: ResourceDetail) => r.id === params.id,
            );
            if (found) {
              setResource(found);
              setBusinessCategory(parsed.business_category || "");
              setDescription(found.description || "");
              setImageUrl(found.image_url || "");
              setGallery(found.gallery || []);
              setLoading(false);
            }
          }
        }

        const res = await api.get(`/resources-all/${params.id}`);
        const data = res.data;
        setResource(data);
        setDescription(data.description || "");
        setImageUrl(data.image_url || "");
        setGallery(data.gallery || []);
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          "response" in err &&
          (err as { response?: { status?: number } }).response?.status === 404
        ) {
          toast.error("Resource tidak ditemukan");
          router.push("/admin/resources");
        }
      } finally {
        setLoading(false);
      }
    },
    [params.id, router, tenantSlug],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { mainItems, addonItems } = useMemo(() => {
    const allItems = resource?.items || [];
    return {
      mainItems: allItems
        .filter((i) =>
          ["main_option", "main", "console_option"].includes(
            i.item_type || "",
          ),
        )
        .sort((a, b) => (b.is_default ? 1 : -1)),
      addonItems: allItems.filter((i) =>
        ["add_on", "addon"].includes(i.item_type || ""),
      ),
    };
  }, [resource]);

  const handleUpdateMarketing = async () => {
    setIsUpdatingResource(true);
    try {
      await api.put(`/resources-all/${params.id}`, {
        ...resource,
        description,
        image_url: imageUrl,
        gallery,
      });
      toast.success("Tampilan resource berhasil diperbarui");
      setIsEditMode(false);
      fetchData(false);
    } catch {
      toast.error("Gagal memperbarui tampilan resource");
    } finally {
      setIsUpdatingResource(false);
    }
  };

  const handleSetDefault = async (item: ResourceItemConfig) => {
    try {
      await api.put(`/resources-all/items/${item.id}`, {
        ...item,
        is_default: true,
      });
      toast.success("Paket utama berhasil diperbarui");
      fetchData(false);
    } catch {
      toast.error("Gagal memperbarui paket utama");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item ini secara permanen?")) return;
    try {
      await api.delete(`/resources-all/items/${id}`);
      toast.success("Item berhasil dihapus");
      fetchData(false);
    } catch {
      toast.error("Gagal menghapus item");
    }
  };

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
      case "pcs":
        return "pcs";
      default:
        return unit || "unit";
    }
  };

  const durationLabel = (minutes?: number) => {
    const value = Number(minutes || 0);
    if (!value) return "";
    if (value % 525600 === 0) return `${value / 525600} tahun`;
    if (value % 43200 === 0) return `${value / 43200} bulan`;
    if (value % 10080 === 0) return `${value / 10080} minggu`;
    if (value % 1440 === 0) return `${value / 1440} hari`;
    if (value % 60 === 0) return `${value / 60} jam`;
    return `${value} menit`;
  };

  const configMeta = {
    gaming_hub: {
      label: "Gaming Rates",
      icon: <Gamepad2 size={16} className="text-blue-500" />,
    },
    creative_space: {
      label: "Studio Rates",
      icon: <Camera size={16} className="text-rose-500" />,
    },
    sport_center: {
      label: "Court Rates",
      icon: <Trophy size={16} className="text-emerald-500" />,
    },
    social_space: {
      label: "Flexible Rates",
      icon: <Briefcase size={16} className="text-indigo-500" />,
    },
  }[businessCategory] || {
    label: "Pricing Setup",
    icon: <Clock size={16} />,
  };

  if (loading && !resource) return <ResourceDetailLoading />;

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 pb-20 pt-5 animate-in fade-in duration-500 px-3 md:px-4 font-plus-jakarta">
      {/* 1. ULTRA COMPACT HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b-[0.5px] border-slate-200 dark:border-white/5 pb-4 md:pb-6 gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/resources")}
            className="h-10 w-10 shrink-0 rounded-xl border-[0.5px] border-slate-200 bg-slate-50 p-0 transition-all hover:bg-[var(--bookinaja-600)] hover:text-white dark:border-white/15 dark:bg-slate-900"
          >
            <ArrowLeft size={18} strokeWidth={3} />
          </Button>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-4xl font-[1000] italic uppercase tracking-tighter text-slate-950 dark:text-white leading-none">
                {resource?.name}
              </h1>
              <Badge className="rounded-md bg-[var(--bookinaja-600)] px-2 py-0.5 text-[8px] font-black italic uppercase text-white">
                {resource?.category || "General"}
              </Badge>
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] md:tracking-[0.4em] italic mt-1.5">
              Resource Overview
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingItem(null);
            setDialogOpen(true);
          }}
            className="h-11 w-full rounded-2xl border-b-4 border-[var(--bookinaja-800)] bg-[var(--bookinaja-600)] px-4 text-[9px] font-black uppercase italic text-white shadow-lg transition-all active:scale-95 hover:bg-[var(--bookinaja-700)] md:w-auto md:px-5 gap-2"
        >
          <Plus size={16} strokeWidth={4} /> Tambah Paket
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* LEFT: VISUAL (Fixed Width, Compact) */}
        <div className="lg:col-span-4 space-y-5">
          <Card className="relative rounded-[1.75rem] border-[0.5px] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:rounded-[2.5rem] md:p-6">
            <div className="absolute top-4 right-4 z-20">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="rounded-full font-black text-[8px] uppercase tracking-widest h-8 px-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-sm border-[0.5px]"
              >
                {isEditMode ? (
                  <>
                    <X size={12} className="mr-1 text-red-500" /> Tutup
                  </>
                ) : (
                  <>
                    <Settings2 size={12} className="mr-1 text-[var(--bookinaja-600)]" />{" "}
                    Tampilan
                  </>
                )}
              </Button>
            </div>

            {isEditMode ? (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <SingleImageUpload
                  label="Banner utama"
                  value={imageUrl}
                  onChange={setImageUrl}
                  endpoint="/resources-all/upload-cover"
                />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none p-4 text-[11px] font-medium leading-relaxed"
                  placeholder="Tulis deskripsi singkat resource ini..."
                />
                <BulkImageUpload
                  values={gallery}
                  onChange={setGallery}
                  endpoint="/resources-all/upload-gallery"
                />
                <Button
                  onClick={handleUpdateMarketing}
                  disabled={isUpdatingResource}
                  className="h-12 w-full rounded-2xl border-b-4 border-slate-800 bg-slate-950 text-[10px] font-black uppercase tracking-widest text-white dark:border-[var(--bookinaja-800)] dark:bg-[var(--bookinaja-600)]"
                >
                  {isUpdatingResource ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Simpan Tampilan"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-5 md:space-y-6 animate-in fade-in duration-500">
                <div className="aspect-[16/10] rounded-[2rem] overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-800">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      className="w-full h-full object-cover"
                      alt="Unit"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full opacity-10">
                      <ImageIcon size={48} />
                    </div>
                  )}
                </div>
                <div className="px-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[var(--bookinaja-600)]" />
                    <h3 className="text-xs font-[1000] uppercase italic tracking-widest dark:text-white">
                      Ringkasan Resource
                    </h3>
                  </div>
                  <p className="border-l-[3px] border-[color:rgba(59,130,246,0.28)] pl-4 text-[11px] font-bold leading-relaxed text-slate-500 dark:text-slate-400">
                    {description || "Belum ada deskripsi untuk resource ini."}
                  </p>
                </div>
                {gallery.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-2">
                    {gallery.slice(0, 4).map((img, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-xl overflow-hidden border-[0.5px] border-slate-100 dark:border-white/5"
                      >
                        <img
                          src={img}
                          className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                          alt="gallery"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: CONFIGURATION (High Density Grid) */}
        <div className="lg:col-span-8 space-y-5 md:space-y-6">
          <Card className="rounded-[1.75rem] border-[0.5px] border-[color:rgba(59,130,246,0.18)] bg-[var(--bookinaja-50)] p-4 shadow-sm dark:border-[color:rgba(96,165,250,0.18)] dark:bg-[color:rgba(59,130,246,0.12)] md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                  Smart Point
                </div>
                {resource?.smart_device_summary ? (
                  <>
                    <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                      {resource.smart_device_summary.device_name}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {resource.smart_device_summary.device_id} • {resource.smart_device_summary.connection_status}
                      {resource.smart_device_summary.last_seen_at
                        ? ` • terlihat ${new Date(resource.smart_device_summary.last_seen_at).toLocaleString("id-ID")}`
                        : ""}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Resource ini belum punya Smart Point yang terhubung.
                  </div>
                )}
              </div>
              <Link
                href={
                  resource?.smart_device_summary
                    ? `/admin/devices/${resource.smart_device_summary.id}`
                    : "/admin/devices"
                }
              >
                <Button className="rounded-2xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]">
                  {resource?.smart_device_summary ? "Lihat Smart Point" : "Hubungkan Smart Point"}
                </Button>
              </Link>
            </div>
          </Card>

          {/* MAIN RATES */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white shadow-md dark:bg-[var(--bookinaja-600)]">
                  <LayoutGrid size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-[1000] uppercase italic tracking-widest text-slate-900 dark:text-white leading-none">
                    {configMeta.label}
                  </h2>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
                    Paket Utama
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {mainItems.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "group rounded-2xl border-[0.5px] bg-white p-4 transition-all dark:bg-[#0f0f17]",
                    item.is_default
                      ? "border-blue-600/50 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/10"
                      : "border-slate-200 dark:border-white/5 opacity-80 hover:opacity-100",
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shadow-inner",
                        item.is_default
                          ? "bg-[var(--bookinaja-600)] text-white"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-400",
                      )}
                    >
                      {item.is_default ? (
                        <CheckCircle2 size={16} strokeWidth={3} />
                      ) : (
                        configMeta.icon
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {!item.is_default && (
                        <Button
                          onClick={() => handleSetDefault(item)}
                          variant="ghost"
                          className="h-7 w-7 rounded-lg bg-slate-50 p-0 hover:text-[var(--bookinaja-600)] dark:bg-slate-800"
                        >
                          <Star size={12} />
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setEditingItem(item);
                          setDialogOpen(true);
                        }}
                        variant="ghost"
                        className="h-7 w-7 rounded-lg bg-slate-50 p-0 hover:text-[var(--bookinaja-600)] dark:bg-slate-800"
                      >
                        <Edit3 size={12} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(item.id)}
                        variant="ghost"
                        className="h-7 w-7 p-0 bg-slate-50 dark:bg-slate-800 text-red-300 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                  <h4 className="text-[11px] md:text-sm font-[1000] uppercase italic tracking-tight text-slate-900 dark:text-white leading-none mb-2">
                    {item.name}
                  </h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] font-black italic text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                      Rp
                    </span>
                    <span className="text-lg font-[1000] italic tracking-tighter text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-100)] md:text-xl">
                      {formatIDR(item.price)}
                    </span>
                    <span className="text-[8px] text-slate-400 font-black uppercase ml-1">
                      / {priceUnitLabel(item.price_unit)}
                    </span>
                  </div>
                  {(item.unit_duration || 0) > 0 && (
                    <div className="mt-3 flex items-center gap-1 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      <Clock size={10} className="text-[var(--bookinaja-500)]/70" />{" "}
                      {durationLabel(item.unit_duration)} durasi
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>

          {/* ADD-ONS */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-md">
                <Plus size={16} strokeWidth={4} />
              </div>
              <div>
                <h2 className="text-sm font-[1000] uppercase italic tracking-widest text-slate-900 dark:text-white leading-none">
                  Katalog Tambahan
                </h2>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
                  Layanan tambahan & perlengkapan
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {addonItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-xl border-[0.5px] border-slate-200 bg-slate-50 p-3.5 transition-all hover:border-[color:rgba(59,130,246,0.28)] dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="flex flex-col leading-none">
                    <h5 className="font-[1000] uppercase italic text-[10px] md:text-[11px] text-slate-800 dark:text-slate-200 tracking-tight">
                      {item.name}
                    </h5>
                    <p className="mt-1.5 text-[9px] font-[1000] italic text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)] md:text-[10px]">
                      Rp {formatIDR(item.price)}
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    <Button
                      onClick={() => {
                        setEditingItem(item);
                        setDialogOpen(true);
                      }}
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-400 transition-colors hover:text-[var(--bookinaja-600)]"
                    >
                      <Edit3 size={12} />
                    </Button>
                    <Button
                      onClick={() => handleDelete(item.id)}
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <ManageItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        resourceId={params.id as string}
        resourceName={resource?.name || "Unit"}
        businessCategory={businessCategory}
        onSuccess={() => fetchData(false)}
      />
    </div>
  );
}
