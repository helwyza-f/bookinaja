"use client";

import { useEffect, useState } from "react";
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
  Monitor,
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
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdatingResource, setIsUpdatingResource] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const resItems = await api.get(`/resources-all/${params.id}/items`);
      setItems(resItems.data || []);

      const resDetail = await api.get(`/resources-all`);
      const currentRes = resDetail.data?.resources?.find(
        (r: any) => r.id === params.id,
      );

      if (currentRes) {
        setResource(currentRes);
        setBusinessCategory(resDetail.data?.business_category || "");
        setDescription(currentRes.description || "");
        setImageUrl(currentRes.image_url || "");
        setGallery(currentRes.gallery || []);
      }
    } catch (err) {
      toast.error("Gagal sinkronisasi data unit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const handleUpdateMarketing = async () => {
    setIsUpdatingResource(true);
    try {
      await api.put(`/resources-all/${params.id}`, {
        ...resource,
        description,
        image_url: imageUrl,
        gallery,
      });
      toast.success("Visual marketing berhasil diperbarui!");
      setIsEditMode(false);
      fetchData();
    } catch (err) {
      toast.error("Gagal menyimpan data marketing");
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
      toast.success("Paket utama diperbarui");
      fetchData();
    } catch (err) {
      toast.error("Gagal update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item ini secara permanen?")) return;
    try {
      await api.delete(`/resources-all/items/${id}`);
      toast.success("Item berhasil dihapus");
      fetchData();
    } catch (err) {
      toast.error("Gagal menghapus");
    }
  };

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      hour: "/ JAM",
      session: "/ SESI",
      day: "/ HARI",
      pcs: "/ PCS",
    };
    return labels[unit] || "/ UNIT";
  };

  const getContextConfig = () => {
    const configs: Record<string, any> = {
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
    };
    return (
      configs[businessCategory] || {
        label: "Pilihan Utama",
        icon: <Clock className="h-6 w-6 text-slate-500" />,
      }
    );
  };

  const config = getContextConfig();

  // Memastikan sinkronisasi dengan item_type baru (main_option & add_on)
  const mainItems = items.filter(
    (i) =>
      i.item_type === "main_option" ||
      i.item_type === "main" ||
      i.item_type === "console_option",
  );
  const addonItems = items.filter(
    (i) => i.item_type === "add_on" || i.item_type === "addon",
  );

  if (loading) return <ResourceDetailLoading />;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 animate-in fade-in duration-700 px-4 font-plus-jakarta">
      {/* --- HEADER --- */}
      <header className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="group -ml-2 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] hover:bg-transparent hover:text-blue-600 transition-all italic"
        >
          <ArrowLeft className="mr-2 h-4 w-4 stroke-[3] group-hover:-translate-x-1 transition-transform" />
          KEMBALI KE INVENTORI
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-1 w-8 bg-blue-600 rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600/60 italic">
                Pusat Konfigurasi
              </p>
            </div>
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-[0.9]">
              {resource?.name}
            </h1>
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2 italic">
              <MapPin className="h-3 w-3 text-blue-500" /> Kategori:{" "}
              {resource?.category || "Umum"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setEditingItem(null);
                setDialogOpen(true);
              }}
              className="h-14 px-8 rounded-2xl bg-blue-600 font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-blue-500/20 text-white hover:bg-blue-700 transition-all active:scale-95 border-b-4 border-blue-800"
            >
              <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Tambah Opsi Baru
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* --- LEFT: SHOWCASE & BRANDING --- */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="rounded-[3rem] border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800 relative">
            <div className="absolute top-6 right-6 z-20">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="rounded-full font-black text-[9px] uppercase tracking-widest shadow-xl border-none h-9 px-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur"
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

            <div className="p-8 pt-10 space-y-10">
              {isEditMode ? (
                <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                  <div className="space-y-1">
                    <h2 className="text-lg font-black uppercase italic tracking-widest text-slate-900 dark:text-white">
                      Aset Pemasaran
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                      Visual untuk menarik minat calon pelanggan
                    </p>
                  </div>

                  <SingleImageUpload
                    label="Banner Utama"
                    value={imageUrl}
                    onChange={setImageUrl}
                    endpoint="/resources-all/upload-cover"
                  />

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic px-1">
                      Deskripsi & Keunggulan
                    </Label>
                    <Textarea
                      placeholder="Jelaskan vibe, fasilitas, atau keunikan unit ini..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[160px] rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border-none text-sm p-6 focus-visible:ring-2 focus-visible:ring-blue-500 font-medium leading-relaxed shadow-inner"
                    />
                  </div>

                  <BulkImageUpload
                    values={gallery}
                    onChange={setGallery}
                    endpoint="/resources-all/upload-gallery"
                  />

                  <Button
                    onClick={handleUpdateMarketing}
                    disabled={isUpdatingResource}
                    className="w-full h-16 rounded-[2rem] bg-slate-900 dark:bg-blue-600 text-white font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:bg-black transition-all border-b-8 border-slate-800 dark:border-blue-800"
                  >
                    {isUpdatingResource ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" /> Simpan Data Visual
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-10 animate-in fade-in duration-700">
                  <div className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-100 dark:bg-slate-800 ring-4 ring-slate-50 dark:ring-slate-800">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <ImageIcon className="h-16 w-16 mb-2 opacity-10" />
                        <span className="text-[10px] font-black uppercase italic tracking-[0.4em] opacity-40">
                          Tanpa Banner
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                        <Sparkles className="h-5 w-5 fill-current" />
                      </div>
                      <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                        Vibe & Suasana
                      </h3>
                    </div>
                    <p className="text-base font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic border-l-4 border-slate-100 dark:border-slate-800 pl-6 pr-4">
                      {description ||
                        "Belum ada deskripsi pemasaran. Gunakan fitur 'Edit Visual' untuk menambahkan narasi yang menarik."}
                    </p>
                  </div>

                  {gallery.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4 text-blue-600" />{" "}
                          Galeri Foto
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black italic px-2 py-0"
                        >
                          {gallery.length} Foto
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {gallery.slice(0, 4).map((img, i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-slate-800 group hover:ring-2 ring-blue-500 transition-all"
                          >
                            <img
                              src={img}
                              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all cursor-zoom-in group-hover:scale-110"
                              alt="gallery"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* --- RIGHT: OPERATIONS & INVENTORY --- */}
        <div className="lg:col-span-7 space-y-16">
          {/* Main Configurations */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 px-2">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 shadow-xl font-black italic">
                1.0
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                  {config.label}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                  Tarif Utama & Opsi Layanan
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mainItems.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "group rounded-[2.5rem] border-none p-8 transition-all duration-500 bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800",
                    item.is_default
                      ? "ring-4 ring-blue-600/20 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] scale-[1.02]"
                      : "hover:shadow-2xl hover:ring-blue-500/20",
                  )}
                >
                  <div className="flex items-start justify-between mb-8">
                    <div
                      className={cn(
                        "h-14 w-14 rounded-[1.25rem] flex items-center justify-center shadow-inner transition-all",
                        item.is_default
                          ? "bg-blue-600 text-white"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600",
                      )}
                    >
                      {item.is_default ? (
                        <CheckCircle2 className="h-7 w-7 stroke-[2.5]" />
                      ) : (
                        config.icon
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      {!item.is_default && (
                        <Button
                          onClick={() => handleSetDefault(item)}
                          variant="ghost"
                          className="h-10 w-10 p-0 text-slate-300 hover:text-yellow-500 bg-slate-50 dark:bg-slate-800 rounded-xl"
                        >
                          <Star className="h-5 w-5" />
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setEditingItem(item);
                          setDialogOpen(true);
                        }}
                        variant="ghost"
                        className="h-10 w-10 p-0 text-slate-300 hover:text-blue-600 bg-slate-50 dark:bg-slate-800 rounded-xl"
                      >
                        <Edit3 className="h-5 w-5" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(item.id)}
                        variant="ghost"
                        className="h-10 w-10 p-0 text-slate-300 hover:text-red-500 bg-slate-50 dark:bg-slate-800 rounded-xl"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                        {item.name}
                      </h4>
                      {item.is_default && (
                        <Badge className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md tracking-tighter">
                          DEFAULT
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xl font-black text-blue-600 italic tracking-tight leading-none">
                      Rp {formatIDR(item.price)}{" "}
                      <span className="text-[11px] text-slate-400 uppercase font-black non-italic tracking-widest">
                        {getUnitLabel(item.price_unit)}
                      </span>
                    </p>
                    {item.unit_duration > 0 && (
                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase italic bg-slate-50 dark:bg-slate-800 w-fit px-3 py-1.5 rounded-xl">
                        <Clock className="h-3.5 w-3.5 text-blue-500" /> Durasi:{" "}
                        {item.unit_duration} Menit
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Upsell Add-ons */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 px-2">
              <div className="h-12 w-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-xl font-black italic">
                2.0
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                  Layanan Tambahan
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                  Alat pendukung atau fasilitas ekstra
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {addonItems.map((item) => (
                <Card
                  key={item.id}
                  className="group rounded-[2.5rem] border-none p-8 transition-all duration-500 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-2xl ring-1 ring-transparent hover:ring-orange-500/20"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 text-slate-400 group-hover:text-orange-500 group-hover:shadow-lg group-hover:shadow-orange-500/10 transition-all shadow-inner flex items-center justify-center">
                      <Package className="h-6 w-6 stroke-[2.5]" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setEditingItem(item);
                          setDialogOpen(true);
                        }}
                        variant="ghost"
                        className="h-9 w-9 p-0 text-slate-300 hover:text-blue-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm"
                      >
                        <Edit3 className="h-4.5 w-4.5" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(item.id)}
                        variant="ghost"
                        className="h-9 w-9 p-0 text-slate-300 hover:text-red-500 bg-white dark:bg-slate-800 rounded-xl shadow-sm"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                      {item.name}
                    </h4>
                    <p className="text-lg font-black text-orange-600 italic leading-none">
                      Rp {formatIDR(item.price)}{" "}
                      <span className="text-[10px] text-slate-400 uppercase font-black non-italic ml-1.5 tracking-widest">
                        / UNIT
                      </span>
                    </p>
                  </div>
                </Card>
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
        onSuccess={fetchData}
      />
    </div>
  );
}
