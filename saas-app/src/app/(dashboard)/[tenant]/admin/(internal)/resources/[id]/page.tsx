"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { ManageItemDialog } from "@/components/resources/manage-item-dialog";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import { BulkImageUpload } from "@/components/upload/bulk-image-upload";
import ResourceDetailLoading from "./loading";

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

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
              (r: any) => r.id === params.id,
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
      } catch (err: any) {
        if (err.response?.status === 404) {
          toast.error("Unit not found");
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
      toast.success("Visual Data Updated");
      setIsEditMode(false);
      fetchData(false);
    } catch (err) {
      toast.error("Update failed");
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
      toast.success("Main package updated");
      fetchData(false);
    } catch (err) {
      toast.error("Status update failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item permanently?")) return;
    try {
      await api.delete(`/resources-all/items/${id}`);
      toast.success("Item deleted");
      fetchData(false);
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

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
      label: "Room Rates",
      icon: <Briefcase size={16} className="text-indigo-500" />,
    },
  }[businessCategory] || {
    label: "Rates Configuration",
    icon: <Clock size={16} />,
  };

  if (loading && !resource) return <ResourceDetailLoading />;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20 animate-in fade-in duration-500 px-4 mt-6 font-plus-jakarta">
      {/* 1. ULTRA COMPACT HEADER */}
      <header className="flex flex-row items-center justify-between border-b-[0.5px] border-slate-200 dark:border-white/5 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/resources")}
            className="h-10 w-10 p-0 rounded-xl bg-slate-50 dark:bg-slate-900 border-[0.5px] border-slate-200 dark:border-white/10 hover:bg-blue-600 hover:text-white transition-all"
          >
            <ArrowLeft size={18} strokeWidth={3} />
          </Button>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-4xl font-[1000] italic uppercase tracking-tighter text-slate-950 dark:text-white leading-none">
                {resource?.name}
              </h1>
              <Badge className="bg-blue-600 text-white font-black italic text-[8px] px-2 py-0.5 rounded-md uppercase">
                {resource?.category || "General"}
              </Badge>
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] italic mt-1.5">
              Asset & Configuration Hub
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingItem(null);
            setDialogOpen(true);
          }}
          className="h-12 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic text-[10px] shadow-lg border-b-4 border-blue-800 gap-2 transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={4} /> New Config
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: VISUAL (Fixed Width, Compact) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-[2.5rem] border-[0.5px] border-slate-200 dark:border-white/5 shadow-sm p-6 bg-white dark:bg-slate-900 relative">
            <div className="absolute top-4 right-4 z-20">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="rounded-full font-black text-[8px] uppercase tracking-widest h-8 px-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-sm border-[0.5px]"
              >
                {isEditMode ? (
                  <>
                    <X size={12} className="mr-1 text-red-500" /> Cancel
                  </>
                ) : (
                  <>
                    <Settings2 size={12} className="mr-1 text-blue-600" />{" "}
                    Visuals
                  </>
                )}
              </Button>
            </div>

            {isEditMode ? (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <SingleImageUpload
                  label="Banner"
                  value={imageUrl}
                  onChange={setImageUrl}
                  endpoint="/resources-all/upload-cover"
                />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none p-4 text-[11px] font-medium leading-relaxed"
                  placeholder="Unit description..."
                />
                <BulkImageUpload
                  values={gallery}
                  onChange={setGallery}
                  endpoint="/resources-all/upload-gallery"
                />
                <Button
                  onClick={handleUpdateMarketing}
                  disabled={isUpdatingResource}
                  className="w-full h-12 rounded-2xl bg-slate-950 dark:bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest border-b-4 border-slate-800 dark:border-blue-800"
                >
                  {isUpdatingResource ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Save Visuals"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
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
                    <Sparkles size={14} className="text-blue-500" />
                    <h3 className="text-xs font-[1000] uppercase italic tracking-widest dark:text-white">
                      Marketing Copy
                    </h3>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed border-l-[3px] border-blue-500/30 pl-4">
                    {description || "No description set for this asset."}
                  </p>
                </div>
                {gallery.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 px-2">
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
        <div className="lg:col-span-8 space-y-6">
          {/* MAIN RATES */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-950 dark:bg-blue-600 flex items-center justify-center text-white shadow-md">
                  <LayoutGrid size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-[1000] uppercase italic tracking-widest text-slate-900 dark:text-white leading-none">
                    {configMeta.label}
                  </h2>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
                    Primary Rental Packages
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {mainItems.map((item: any) => (
                <Card
                  key={item.id}
                  className={cn(
                    "group rounded-2xl border-[0.5px] p-5 transition-all bg-white dark:bg-slate-900",
                    item.is_default
                      ? "border-blue-600/50 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/10"
                      : "border-slate-200 dark:border-white/5 opacity-80 hover:opacity-100",
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shadow-inner",
                        item.is_default
                          ? "bg-blue-600 text-white"
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
                          className="h-7 w-7 p-0 bg-slate-50 dark:bg-slate-800 hover:text-blue-600 rounded-lg"
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
                        className="h-7 w-7 p-0 bg-slate-50 dark:bg-slate-800 hover:text-blue-600 rounded-lg"
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
                  <h4 className="text-sm font-[1000] uppercase italic tracking-tight text-slate-900 dark:text-white leading-none mb-2">
                    {item.name}
                  </h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] font-black text-blue-600 italic">
                      Rp
                    </span>
                    <span className="text-xl font-[1000] text-blue-600 italic tracking-tighter">
                      {formatIDR(item.price)}
                    </span>
                    <span className="text-[8px] text-slate-400 font-black uppercase ml-1">
                      / {item.price_unit}
                    </span>
                  </div>
                  {item.unit_duration > 0 && (
                    <div className="mt-3 flex items-center gap-1 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      <Clock size={10} className="text-blue-500/50" />{" "}
                      {item.unit_duration} MINS DURATION
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
                  Add-ons Catalog
                </h2>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
                  Optional Extras & Gear
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {addonItems.map((item: any) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border-[0.5px] border-slate-200 dark:border-white/5 flex justify-between items-center group hover:border-blue-500/30 transition-all"
                >
                  <div className="flex flex-col leading-none">
                    <h5 className="font-[1000] uppercase italic text-[11px] text-slate-800 dark:text-slate-200 tracking-tight">
                      {item.name}
                    </h5>
                    <p className="text-blue-600 font-[1000] text-[10px] italic mt-1.5">
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
                      className="h-7 w-7 text-slate-400 hover:text-blue-600 transition-colors"
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
