"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Loader2,
  Info,
  LayoutGrid,
  ChevronRight,
  Clock3,
  ShoppingBag,
} from "lucide-react";
import api from "@/lib/api";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

interface AddResourceDialogProps {
  onRefresh: () => void;
  category?: string; // ID kategori bisnis: gaming_hub, creative_space, sport_center, social_space
}

export function AddResourceDialog({
  onRefresh,
  category,
}: AddResourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [categoryValue, setCategoryValue] = useState("");
  const [operatingMode, setOperatingMode] = useState<"timed" | "direct_sale">("timed");

  // Helper untuk menyesuaikan Copywriting berdasarkan Sektor Bisnis
  const getPlaceholder = () => {
    switch (category) {
      case "gaming_hub":
        return {
          name: "CONTOH: MEJA 01 / PC 10 / VIP 02",
          label: "NAMA MEJA / UNIT",
        };
      case "creative_space":
        return {
          name: "CONTOH: STUDIO A / GREEN SCREEN ROOM",
          label: "NAMA STUDIO",
        };
      case "sport_center":
        return {
          name: "CONTOH: LAPANGAN A / COURT 01",
          label: "NAMA LAPANGAN",
        };
      case "social_space":
        return {
          name: "CONTOH: MEETING ROOM / COWORKING DESK 05",
          label: "NAMA RUANGAN",
        };
      default:
        return {
          name: "CONTOH: UNIT 01 / RESOURCE A",
          label: "NAMA UNIT / RUANGAN",
        };
    }
  };

  const labels = getPlaceholder();

  const modeMeta =
    operatingMode === "direct_sale"
      ? {
          badge: "DIRECT SALE",
          helper: "Cocok untuk kasir atau katalog jual langsung.",
          nameLabel:
            category === "sport_center" ? "NAMA COUNTER / PRODUK" : "NAMA RESOURCE JUAL",
          categoryPlaceholder: "MISAL: MINUMAN / MAKANAN / REGULER",
        }
      : {
            badge: "DEFAULT TIMED",
            helper: "Cocok untuk unit yang pakai jadwal dan slot.",
            nameLabel: labels.label,
            categoryPlaceholder: "MISAL: LANTAI 2 / VIP / SMOKING",
          };

  const operatingModeOptions: Array<{
    value: "timed" | "direct_sale";
    label: string;
    description: string;
    icon: typeof Clock3;
  }> = [
    {
      value: "timed",
      label: "Timed",
      description: "Pakai jadwal dan slot.",
      icon: Clock3,
    },
    {
      value: "direct_sale",
      label: "Direct sale",
      description: "POS tanpa slot waktu.",
      icon: ShoppingBag,
    },
  ];

  const resetForm = () => {
    setName("");
    setCategoryValue("");
    setOperatingMode("timed");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const payload = {
      name: name.trim().toUpperCase(),
      category: categoryValue.trim().toUpperCase(),
      operating_mode: operatingMode,
    };

    try {
      await api.post("/resources-all", payload);
      toast.success("UNIT BERHASIL DITAMBAHKAN!");
      setOpen(false);
      resetForm();
      onRefresh();
    } catch {
      toast.error("GAGAL MENAMBAHKAN UNIT");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95">
          <Plus className="mr-2 h-4 w-4" />
          Tambah{" "}
          {category === "gaming_hub"
            ? "Unit"
            : category === "sport_center"
              ? "Lapangan"
              : "Aset"}
        </Button>
      </DialogTrigger>

      <DialogPortal>
        <DialogOverlay className="z-[9998] bg-slate-950/30 backdrop-blur-sm" />
        <DialogContent className="z-[9999] w-[94vw] overflow-hidden rounded-2xl border border-slate-200 bg-background p-4 shadow-2xl sm:max-w-[480px] sm:p-5 dark:border-white/10">
          <DialogHeader className="relative z-10 space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <LayoutGrid className="h-4.5 w-4.5" />
            </div>
            <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[1.75rem]">
              Tambah Unit Baru
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-500">
              Daftarkan unit baru untuk operasional dan reservasi.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={onSubmit}
            className="relative z-10 space-y-4 pt-3"
          >
            {/* INPUT NAMA */}
            <div className="space-y-3">
              <Label className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {modeMeta.nameLabel}
              </Label>
              <Input
                value={name}
                placeholder={labels.name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-blue-600/10 dark:border-white/10 dark:bg-white/5 dark:text-white"
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  MODE OPERASIONAL
                </Label>
                <Badge
                  variant="secondary"
                  className="border-none bg-blue-50 px-2 py-0 text-[10px] font-semibold text-blue-600"
                >
                  {modeMeta.badge}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {operatingModeOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = operatingMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setOperatingMode(option.value)}
                      className={cn(
                        "flex items-start gap-2.5 rounded-2xl border p-2.5 text-left transition-all",
                        isActive
                          ? "border-blue-500 bg-blue-50 shadow-[0_0_0_1px_rgba(37,99,235,0.08)]"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          isActive
                            ? "bg-blue-600 text-white"
                            : "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-[13px] font-semibold",
                              isActive
                                ? "text-blue-700 dark:text-blue-200"
                                : "text-slate-900 dark:text-white",
                            )}
                          >
                            {option.label}
                          </span>
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full border",
                              isActive
                                ? "border-blue-600 bg-blue-600"
                                : "border-slate-300 bg-transparent dark:border-slate-600",
                            )}
                          />
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-start gap-2 px-1">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                <p className="text-[11px] leading-relaxed text-slate-500">
                  {modeMeta.helper}
                </p>
              </div>
            </div>

            {/* INPUT KATEGORI - OPTIONAL */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  AREA / LANTAI / TIPE
                </Label>
                <Badge
                  variant="secondary"
                  className="border-none bg-slate-100 px-2 py-0 text-[10px] font-semibold text-slate-500"
                >
                  OPSIONAL
                </Badge>
              </div>
              <Input
                value={categoryValue}
                placeholder={modeMeta.categoryPlaceholder}
                onChange={(e) => setCategoryValue(e.target.value.toUpperCase())}
                className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-blue-600/10 dark:border-white/10 dark:bg-white/5 dark:text-white"
                autoComplete="off"
              />
              <div className="flex items-start gap-2 px-1">
                <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Bantu pengelompokan unit di halaman booking.
                </p>
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm transition-all hover:bg-black active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <span>Tambah Unit</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
