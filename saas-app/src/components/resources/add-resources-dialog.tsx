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
import { Plus, Loader2, Info, LayoutGrid, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { Badge } from "../ui/badge";

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

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      name: "",
      category: "",
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

  const onSubmit = async (data: any) => {
    setLoading(true);
    const payload = {
      name: data.name.toUpperCase(),
      category: data.category ? data.category.toUpperCase() : "",
    };

    try {
      await api.post("/resources-all", payload);
      toast.success("UNIT BERHASIL DITAMBAHKAN!");
      setOpen(false);
      reset();
      onRefresh();
    } catch (err) {
      toast.error("GAGAL MENAMBAHKAN UNIT");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-2xl h-12 bg-blue-600 font-black px-8 shadow-xl shadow-blue-600/20 transition-all hover:scale-105 active:scale-95 uppercase italic tracking-widest text-[11px] group">
          <Plus className="mr-2 h-4 w-4 stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
          Tambah{" "}
          {category === "gaming_hub"
            ? "Unit"
            : category === "sport_center"
              ? "Lapangan"
              : "Aset"}
        </Button>
      </DialogTrigger>

      <DialogPortal>
        <DialogOverlay className="z-[9998] bg-slate-950/40 backdrop-blur-sm" />
        <DialogContent className="z-[9999] rounded-[2.5rem] sm:max-w-[480px] border-none p-10 shadow-3xl bg-background overflow-hidden">
          {/* Decorative Glow */}
          <div className="absolute -top-20 -right-20 h-40 w-40 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />

          <DialogHeader className="space-y-3 relative z-10">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
              <LayoutGrid className="h-7 w-7 stroke-[2.5]" />
            </div>
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter leading-none text-slate-900">
              REGISTER <span className="text-blue-600">NEW UNIT</span>
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-relaxed">
              Daftarkan unit fisik baru untuk mulai menerima reservasi
              pelanggan.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-8 pt-8 relative z-10"
          >
            {/* INPUT NAMA */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 italic">
                {labels.label}
              </Label>
              <Input
                {...register("name", { required: true })}
                placeholder={labels.name}
                onChange={(e) => setValue("name", e.target.value.toUpperCase())}
                className="h-16 rounded-2xl bg-slate-50 border-2 border-transparent font-black text-slate-900 px-6 focus:bg-white focus:border-blue-600/20 focus:ring-4 focus:ring-blue-600/5 text-lg tracking-tight transition-all placeholder:text-slate-300 placeholder:font-bold"
                required
                autoComplete="off"
              />
            </div>

            {/* INPUT KATEGORI - OPTIONAL */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                  AREA / LANTAI / TIPE
                </Label>
                <Badge
                  variant="secondary"
                  className="text-[8px] font-black uppercase bg-slate-100 text-slate-400 px-2 py-0 border-none"
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
                className="h-16 rounded-2xl bg-slate-50 border-2 border-transparent font-black text-slate-900 px-6 focus:bg-white focus:border-blue-600/20 focus:ring-4 focus:ring-blue-600/5 text-lg tracking-tight transition-all placeholder:text-slate-300 placeholder:font-bold"
                autoComplete="off"
              />
              <div className="flex items-start gap-2 px-2">
                <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-slate-400 font-bold leading-normal uppercase tracking-tighter">
                  Kategori memudahkan pelanggan saat memfilter unit di halaman
                  booking.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-20 rounded-[2rem] bg-slate-900 hover:bg-black text-white font-black tracking-[0.2em] uppercase italic text-xs shadow-2xl transition-all active:scale-95 border-b-[10px] border-slate-700 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    <span>PROVISIONING...</span>
                  </>
                ) : (
                  <>
                    <span>REGISTER UNIT</span>
                    <ChevronRight className="h-4 w-4 stroke-[4]" />
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
