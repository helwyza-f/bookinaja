"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Info, LayoutGrid, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { Badge } from "../ui/badge";

type ResourceFormValues = {
  name: string;
  category: string;
  operating_mode: string;
};

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

  const { register, handleSubmit, reset, setValue } =
    useForm<ResourceFormValues>({
    defaultValues: {
      name: "",
      category: "",
      operating_mode: "timed",
    },
  });

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

  const onSubmit = async (data: ResourceFormValues) => {
    setLoading(true);
    const payload = {
      name: data.name.toUpperCase(),
      category: data.category ? data.category.toUpperCase() : "",
      operating_mode: data.operating_mode || "timed",
    };

    try {
      await api.post("/resources-all", payload);
      toast.success("UNIT BERHASIL DITAMBAHKAN!");
      setOpen(false);
      reset();
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
        <DialogContent className="z-[9999] w-[94vw] overflow-hidden rounded-2xl border border-slate-200 bg-background p-5 shadow-2xl sm:max-w-[480px] sm:p-6 dark:border-white/10">
          <DialogHeader className="space-y-3 relative z-10">
            <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Tambah Unit Baru
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-500">
              Daftarkan unit fisik baru untuk mulai menerima reservasi
              pelanggan.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5 pt-4 relative z-10"
          >
            <input type="hidden" {...register("operating_mode")} />
            {/* INPUT NAMA */}
            <div className="space-y-3">
              <Label className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {labels.label}
              </Label>
              <Input
                {...register("name", { required: true })}
                placeholder={labels.name}
                onChange={(e) => setValue("name", e.target.value.toUpperCase())}
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
                  DEFAULT TIMED
                </Badge>
              </div>
              <Select
                defaultValue="timed"
                onValueChange={(value) => setValue("operating_mode", value)}
              >
                <SelectTrigger className="h-12 w-full rounded-xl border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-blue-600/10 dark:border-white/10 dark:bg-white/5 dark:text-white">
                  <SelectValue placeholder="Pilih mode operasional" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="timed">Timed - pakai jadwal dan slot</SelectItem>
                  <SelectItem value="direct_sale">Direct sale - POS tanpa slot</SelectItem>
                  <SelectItem value="hybrid">Hybrid - bisa keduanya</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-start gap-2 px-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                <p className="text-xs leading-relaxed text-slate-500">
                  Timed cocok untuk lapangan atau room booking. Direct sale cocok
                  untuk cafe, barber, atau counter tanpa slot waktu.
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
                {...register("category")}
                placeholder="MISAL: LANTAI 2 / VIP / SMOKING"
                onChange={(e) =>
                  setValue("category", e.target.value.toUpperCase())
                }
                className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-blue-600/10 dark:border-white/10 dark:bg-white/5 dark:text-white"
                autoComplete="off"
              />
              <div className="flex items-start gap-2 px-2">
                <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-slate-500">
                  Kategori memudahkan pelanggan saat memfilter unit di halaman
                  booking.
                </p>
              </div>
            </div>

            <div className="pt-2">
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
