"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Star,
  MapPin,
  Clock,
  Package,
  Gamepad2,
  Trophy,
  Camera,
  Briefcase,
  Loader2,
  Save,
  Sparkles,
  Settings2,
  LayoutDashboard,
  CheckCircle2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { ManageItemDialog } from "@/components/resources/manage-item-dialog";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import { BulkImageUpload } from "@/components/upload/bulk-image-upload";
import ResourceDetailLoading from "./loading";

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [resource, setResource] = useState<any>(null);
  const [businessCategory, setBusinessCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // UI States
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdatingResource, setIsUpdatingResource] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form States
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);

  /**
   * CORE LOGIC: Fetch with Caching Strategy
   */
  const fetchData = useCallback(
    async (useCache = true) => {
      try {
        // 1. Coba ambil dari Cache (localStorage) untuk Instant UI
        if (useCache) {
          const cachedData = localStorage.getItem("cache_resources_all");
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const found = parsed.resources?.find(
              (r: any) => r.id === params.id,
            );
            if (found) {
              setResource(found);
              setBusinessCategory(parsed.business_category || "");
              setDescription(found.description || "");
              setImageUrl(found.image_url || "");
              setGallery(found.gallery || []);
              setLoading(false); // Stop loading jika data cache ditemukan
            }
          }
        }

        // 2. Background Fetch / Fallback Fetch (Selalu ambil data terbaru dari server)
        const res = await api.get(`/resources-all`);
        const allData = res.data;

        // Update Cache terbaru
        localStorage.setItem("cache_resources_all", JSON.stringify(allData));

        const currentRes = allData.resources?.find(
          (r: any) => r.id === params.id,
        );

        if (currentRes) {
          setResource(currentRes);
          setBusinessCategory(allData.business_category || "");
          setDescription(currentRes.description || "");
          setImageUrl(currentRes.image_url || "");
          setGallery(currentRes.gallery || []);
        } else {
          toast.error("Unit tidak ditemukan");
          router.push("/admin/resources");
        }
      } catch (err) {
        console.error("Sync Error:", err);
        if (loading) toast.error("Gagal sinkronisasi data server");
      } finally {
        setLoading(false);
      }
    },
    [params.id, router],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * MEMOIZED ITEMS: Memisahkan Main vs Addons dari array terpadu
   */
  const { mainItems, addonItems } = useMemo(() => {
    const allItems = resource?.items || [];
    return {
      mainItems: allItems
        .filter((i: any) =>
          ["main_option", "main", "console_option"].includes(i.item_type),
        )
        .sort((a: any, b: any) => (b.is_default ? 1 : -1)),
      addonItems: allItems.filter((i: any) =>
        ["add_on", "addon"].includes(i.item_type),
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
      toast.success("Marketing Content Updated!");
      setIsEditMode(false);
      fetchData(false); // Refresh tanpa cache setelah update
    } catch (err) {
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setIsUpdatingResource(false);
    }
  };

  const handleSetDefault = async (item: any) => {
    try {
      await api.put(`/resources-all/items/${item.id}`, {
        ...item,
        is_default: true,
      });
      toast.success("Paket Utama Diperbarui");
      fetchData(false);
    } catch (err) {
      toast.error("Gagal update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item ini secara permanen?")) return;
    try {
      await api.delete(`/resources-all/items/${id}`);
      toast.success("Item Dihapus");
      fetchData(false);
    } catch (err) {
      toast.error("Gagal menghapus");
    }
  };

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  // Kebutuhan Label Dinamis
  const configMeta = {
    gaming_hub: {
      label: "Konfigurasi Unit",
      icon: <Gamepad2 className="h-6 w-6 text-blue-500" />,
    },
    creative_space: {
      label: "Paket Ruangan",
      icon: <Camera className="h-6 w-6 text-rose-500" />,
    },
    sport_center: {
      label: "Opsi Fasilitas",
      icon: <Trophy className="h-6 w-6 text-emerald-500" />,
    },
    social_space: {
      label: "Tipe Ruang",
      icon: <Briefcase className="h-6 w-6 text-indigo-500" />,
    },
  }[businessCategory] || {
    label: "Pilihan Utama",
    icon: <Clock className="h-6 w-6 text-slate-500" />,
  };

  if (loading && !resource) return <ResourceDetailLoading />;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 animate-in fade-in duration-700 px-4 font-plus-jakarta mt-10">
      {/* --- HEADER --- */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b-2 border-slate-100 dark:border-white/5 pb-10">
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/resources")}
            className="h-8 px-0 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest italic flex items-center gap-2"
          >
            <ArrowLeft className="h-3 w-3 stroke-[4]" /> KEMBALI KE LIST
          </Button>
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none pr-4">
              {resource?.name}
            </h1>
            <Badge
              variant="secondary"
              className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none font-black italic text-[10px] px-3 py-1 rounded-lg uppercase pr-2"
            >
              Category: {resource?.category || "Umum"}
            </Badge>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null);
            setDialogOpen(true);
          }}
          className="h-14 px-8 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all border-b-4 border-blue-800"
        >
          <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Tambah Konfigurasi
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* --- LEFT: SHOWCASE --- */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="rounded-[3rem] border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-100 dark:ring-white/5 p-8 relative">
            <div className="absolute top-6 right-6 z-20">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="rounded-full font-black text-[9px] uppercase tracking-widest shadow-xl h-9 px-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur"
              >
                {isEditMode ? (
                  <>
                    <X className="mr-1.5 h-3.5 w-3.5 text-red-500" /> Batal
                  </>
                ) : (
                  <>
                    <Settings2 className="mr-1.5 h-3.5 w-3.5 text-blue-600" />{" "}
                    Edit Visual
                  </>
                )}
              </Button>
            </div>

            {isEditMode ? (
              <div className="space-y-8 animate-in slide-in-from-top-4">
                <SingleImageUpload
                  label="Banner Utama"
                  value={imageUrl}
                  onChange={setImageUrl}
                  endpoint="/resources-all/upload-cover"
                />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[160px] rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border-none p-6 text-sm"
                  placeholder="Deskripsi unit..."
                />
                <BulkImageUpload
                  values={gallery}
                  onChange={setGallery}
                  endpoint="/resources-all/upload-gallery"
                />
                <Button
                  onClick={handleUpdateMarketing}
                  disabled={isUpdatingResource}
                  className="w-full h-16 rounded-[2rem] bg-slate-950 dark:bg-blue-600 text-white font-black uppercase text-[11px] tracking-[0.3em] border-b-8 border-slate-800 dark:border-blue-800"
                >
                  {isUpdatingResource ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Simpan Perubahan"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in">
                <div className="aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-100 dark:bg-slate-800">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      className="w-full h-full object-cover"
                      alt="Cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full opacity-10">
                      <ImageIcon size={64} />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white pr-2 leading-none">
                    Deskripsi Unit
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 italic leading-relaxed border-l-4 border-blue-500 pl-6 pr-4">
                    {description || "Belum ada deskripsi."}
                  </p>
                </div>
                {gallery.length > 0 && (
                  <div className="grid grid-cols-4 gap-3">
                    {gallery.slice(0, 4).map((img, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
                      >
                        <img
                          src={img}
                          className="w-full h-full object-cover"
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

        {/* --- RIGHT: OPERATIONS --- */}
        <div className="lg:col-span-7 space-y-16">
          <section className="space-y-8">
            <div className="flex items-center gap-4 px-2">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 shadow-xl font-black italic">
                1.0
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                  {configMeta.label}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic mt-1">
                  Tarif & Paket Sewa
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mainItems.map((item: any) => (
                <Card
                  key={item.id}
                  className={cn(
                    "group rounded-[2.5rem] border-none p-8 transition-all bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5",
                    item.is_default &&
                      "ring-4 ring-blue-600/20 shadow-2xl scale-[1.02]",
                  )}
                >
                  <div className="flex justify-between items-start mb-8">
                    <div
                      className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner",
                        item.is_default
                          ? "bg-blue-600 text-white"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-400",
                      )}
                    >
                      {item.is_default ? (
                        <CheckCircle2 className="h-7 w-7" />
                      ) : (
                        configMeta.icon
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {!item.is_default && (
                        <Button
                          onClick={() => handleSetDefault(item)}
                          variant="ghost"
                          className="h-9 w-9 p-0 bg-slate-50 dark:bg-slate-800 rounded-xl"
                        >
                          <Star size={16} />
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setEditingItem(item);
                          setDialogOpen(true);
                        }}
                        variant="ghost"
                        className="h-9 w-9 p-0 bg-slate-50 dark:bg-slate-800 rounded-xl"
                      >
                        <Edit3 size={16} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(item.id)}
                        variant="ghost"
                        className="h-9 w-9 p-0 bg-slate-50 dark:bg-slate-800 text-red-500 rounded-xl"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <h4 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none mb-2">
                    {item.name}
                  </h4>
                  <p className="text-2xl font-black text-blue-600 italic leading-none">
                    Rp {formatIDR(item.price)}{" "}
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest not-italic">
                      / {item.price_unit}
                    </span>
                  </p>
                  {item.unit_duration > 0 && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-4">
                      <Clock className="inline h-3 w-3 mr-1" />{" "}
                      {item.unit_duration} MENIT
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex items-center gap-4 px-2">
              <div className="h-12 w-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-xl font-black italic">
                2.0
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                Layanan Tambahan (Add-ons)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addonItems.map((item: any) => (
                <div
                  key={item.id}
                  className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center group border border-transparent hover:border-blue-500/20 transition-all"
                >
                  <div>
                    <h5 className="font-black uppercase italic text-sm pr-2 dark:text-white">
                      {item.name}
                    </h5>
                    <p className="text-blue-600 font-black text-xs italic">
                      Rp {formatIDR(item.price)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => {
                        setEditingItem(item);
                        setDialogOpen(true);
                      }}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-400 hover:text-blue-600"
                    >
                      <Edit3 size={14} />
                    </Button>
                    <Button
                      onClick={() => handleDelete(item.id)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
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
