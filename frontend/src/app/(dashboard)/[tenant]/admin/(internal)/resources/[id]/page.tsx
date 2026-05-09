"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type ResourceDetail = {
  id: string;
  name: string;
  category?: string;
  operating_mode?: string;
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

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;
  const resourceId = params.id as string;

  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [businessCategory, setBusinessCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdatingResource, setIsUpdatingResource] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourceItemConfig | null>(null);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [operatingMode, setOperatingMode] = useState("timed");

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
              (item: ResourceDetail) => item.id === resourceId,
            );
            if (found) {
              setResource(found);
              setBusinessCategory(parsed.business_category || "");
              setDescription(found.description || "");
              setImageUrl(found.image_url || "");
              setGallery(found.gallery || []);
              setOperatingMode(found.operating_mode || "timed");
              setLoading(false);
            }
          }
        }

        const res = await api.get(`/resources-all/${resourceId}`);
        const data = res.data;
        setResource(data);
        setDescription(data.description || "");
        setImageUrl(data.image_url || "");
        setGallery(data.gallery || []);
        setOperatingMode(data.operating_mode || "timed");
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
    [resourceId, router, tenantSlug],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const { mainItems, addonItems } = useMemo(() => {
    const allItems = resource?.items || [];
    return {
      mainItems: allItems
        .filter((item) =>
          ["main_option", "main", "console_option"].includes(
            item.item_type || "",
          ),
        )
        .sort((a, b) => (b.is_default ? 1 : -1)),
      addonItems: allItems.filter((item) =>
        ["add_on", "addon"].includes(item.item_type || ""),
      ),
    };
  }, [resource]);

  const handleUpdateMarketing = async () => {
    setIsUpdatingResource(true);
    try {
      await api.put(`/resources-all/${resourceId}`, {
        ...resource,
        description,
        image_url: imageUrl,
        gallery,
        operating_mode: operatingMode,
      });
      toast.success("Tampilan resource berhasil diperbarui");
      setIsEditMode(false);
      void fetchData(false);
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
      void fetchData(false);
    } catch {
      toast.error("Gagal memperbarui paket utama");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item ini secara permanen?")) return;
    try {
      await api.delete(`/resources-all/items/${id}`);
      toast.success("Item berhasil dihapus");
      void fetchData(false);
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

  const configMeta =
    {
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

  const operatingModeMeta = (() => {
    switch (operatingMode) {
      case "direct_sale":
        return {
          label: "Direct sale",
          description: "Resource ini dijual langsung lewat POS tanpa slot waktu.",
        };
      case "hybrid":
        return {
          label: "Hybrid",
          description: "Resource ini bisa dipakai sebagai booking berbasis waktu dan direct sale.",
        };
      default:
        return {
          label: "Timed",
          description: "Resource ini memakai jadwal, sesi, dan lifecycle waktu.",
        };
    }
  })();

  if (loading && !resource) return <ResourceDetailLoading />;

  return (
    <div className="mx-auto max-w-[1600px] animate-in space-y-4 px-3 pb-20 pt-5 font-plus-jakarta fade-in duration-500 md:px-4 md:space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-white/10 md:flex-row md:items-center md:justify-between md:pb-5">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/resources")}
            className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0 hover:bg-[var(--bookinaja-600)] hover:text-white dark:border-white/15 dark:bg-slate-900"
          >
            <ArrowLeft size={18} strokeWidth={3} />
          </Button>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-2xl">
                {resource?.name}
              </h1>
              <Badge className="rounded-md bg-[var(--bookinaja-600)] px-2 py-0.5 text-[10px] font-medium text-white">
                {resource?.category || "General"}
              </Badge>
              <Badge className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {operatingModeMeta.label}
              </Badge>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Pengaturan detail resource, paket harga, dan tampilan publik.
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingItem(null);
            setDialogOpen(true);
          }}
          className="h-10 w-full gap-2 rounded-lg bg-[var(--bookinaja-600)] px-4 text-sm font-semibold text-white hover:bg-[var(--bookinaja-700)] md:w-auto"
        >
          <Plus size={16} strokeWidth={4} /> Tambah Paket
        </Button>
      </header>

      <div className="grid grid-cols-1 items-start gap-4 md:gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-4">
          <Card className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] md:p-5">
            <div className="absolute right-4 top-4 z-20">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium shadow-sm dark:border-white/10 dark:bg-slate-800/90"
              >
                {isEditMode ? (
                  <>
                    <X size={12} className="mr-1 text-red-500" /> Tutup
                  </>
                ) : (
                  <>
                    <Settings2 size={12} className="mr-1 text-[var(--bookinaja-600)]" />
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
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Mode operasional
                  </div>
                  <Select value={operatingMode} onValueChange={setOperatingMode}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 px-4 text-sm font-semibold dark:border-white/10 dark:bg-slate-900/50">
                      <SelectValue placeholder="Pilih mode operasional" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="timed">Timed - pakai slot dan jadwal</SelectItem>
                      <SelectItem value="direct_sale">Direct sale - jual langsung di POS</SelectItem>
                      <SelectItem value="hybrid">Hybrid - bisa timed dan direct sale</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {operatingModeMeta.description}
                  </p>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] rounded-lg border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed dark:border-white/10 dark:bg-slate-800/50"
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
                  className="h-10 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white dark:bg-[var(--bookinaja-600)]"
                >
                  {isUpdatingResource ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Simpan Tampilan"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-5 md:space-y-6">
                <div className="aspect-[16/10] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      className="h-full w-full object-cover"
                      alt="Unit"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center opacity-10">
                      <ImageIcon size={48} />
                    </div>
                  )}
                </div>
                <div className="space-y-3 px-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[var(--bookinaja-600)]" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Ringkasan resource
                    </h3>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-900/30 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {operatingModeMeta.label}
                    </span>{" "}
                    · {operatingModeMeta.description}
                  </div>
                  <p className="border-l-2 border-[color:rgba(59,130,246,0.28)] pl-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {description || "Belum ada deskripsi untuk resource ini."}
                  </p>
                </div>
                {gallery.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 px-2 md:grid-cols-4">
                    {gallery.slice(0, 4).map((img, index) => (
                      <div
                        key={index}
                        className="aspect-square overflow-hidden rounded-lg border border-slate-100 dark:border-white/5"
                      >
                        <img
                          src={img}
                          className="h-full w-full object-cover opacity-80 transition-opacity hover:opacity-100"
                          alt="gallery"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5 md:space-y-6 lg:col-span-8">
          <Card className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03] md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                  Smart Point
                </div>
                {resource?.smart_device_summary ? (
                  <>
                    <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                      {resource.smart_device_summary.device_name}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {resource.smart_device_summary.device_id} |{" "}
                      {resource.smart_device_summary.connection_status}
                      {resource.smart_device_summary.last_seen_at
                        ? ` | terlihat ${new Date(resource.smart_device_summary.last_seen_at).toLocaleString("id-ID")}`
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
                <Button className="rounded-lg bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]">
                  {resource?.smart_device_summary
                    ? "Lihat Smart Point"
                    : "Hubungkan Smart Point"}
                </Button>
              </Link>
            </div>
          </Card>

          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-[var(--bookinaja-600)]">
                  <LayoutGrid size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {configMeta.label}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">Paket utama</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mainItems.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "group rounded-xl border bg-white p-4 transition-colors dark:bg-[#0f0f17]",
                    item.is_default
                      ? "border-blue-200 bg-blue-50/40 dark:border-blue-500/20 dark:bg-blue-500/5"
                      : "border-slate-200 dark:border-white/10",
                  )}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        item.is_default
                          ? "bg-[var(--bookinaja-600)] text-white"
                          : "bg-slate-50 text-slate-400 dark:bg-slate-800",
                      )}
                    >
                      {item.is_default ? (
                        <CheckCircle2 size={16} strokeWidth={3} />
                      ) : (
                        configMeta.icon
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {!item.is_default ? (
                        <Button
                          onClick={() => handleSetDefault(item)}
                          variant="ghost"
                          className="h-7 w-7 rounded-md bg-slate-50 p-0 hover:text-[var(--bookinaja-600)] dark:bg-slate-800"
                        >
                          <Star size={12} />
                        </Button>
                      ) : null}
                      <Button
                        onClick={() => {
                          setEditingItem(item);
                          setDialogOpen(true);
                        }}
                        variant="ghost"
                        className="h-7 w-7 rounded-md bg-slate-50 p-0 hover:text-[var(--bookinaja-600)] dark:bg-slate-800"
                      >
                        <Edit3 size={12} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(item.id)}
                        variant="ghost"
                        className="h-7 w-7 rounded-md bg-slate-50 p-0 text-red-300 hover:text-red-500 dark:bg-slate-800"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                  <h4 className="mb-2 text-sm font-semibold leading-none text-slate-900 dark:text-white">
                    {item.name}
                  </h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-medium text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                      Rp
                    </span>
                    <span className="text-lg font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-100)] md:text-xl">
                      {formatIDR(item.price)}
                    </span>
                    <span className="ml-1 text-xs text-slate-400">
                      / {priceUnitLabel(item.price_unit)}
                    </span>
                  </div>
                  {(item.unit_duration || 0) > 0 ? (
                    <div className="mt-3 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Clock size={10} className="text-[var(--bookinaja-500)]/70" />
                      {durationLabel(item.unit_duration)} durasi
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white">
                <Plus size={16} strokeWidth={4} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Katalog Tambahan
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Layanan tambahan dan perlengkapan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {addonItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3.5 transition-colors hover:border-[color:rgba(59,130,246,0.28)] dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="flex flex-col leading-none">
                    <h5 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {item.name}
                    </h5>
                    <p className="mt-1.5 text-xs font-medium text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
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
                      className="h-7 w-7 text-slate-400 transition-colors hover:text-red-500"
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
        resourceId={resourceId}
        resourceName={resource?.name || "Unit"}
        businessCategory={businessCategory}
        operatingMode={operatingMode}
        onSuccess={() => fetchData(false)}
      />
    </div>
  );
}
