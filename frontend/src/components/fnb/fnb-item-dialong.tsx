"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, ImagePlus, PackageCheck } from "lucide-react";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FnbItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: FnbItem | null;
  onSuccess: () => void;
}

export type FnbItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string | null;
  is_available: boolean;
};

export function FnbItemDialog({
  open,
  onOpenChange,
  editingItem,
  onSuccess,
}: FnbItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Food");
  const [imageUrl, setImageUrl] = useState("");

  // Sync data saat mode EDIT
  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || "");
      setDescription(editingItem.description || "");
      setPrice(editingItem.price?.toString() || "");
      setCategory(editingItem.category || "Food");
      setImageUrl(editingItem.image_url || "");
    } else {
      resetForm();
    }
  }, [editingItem, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setCategory("Food");
    setImageUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return toast.error("Nama menu dan harga wajib diisi");

    setIsSubmitting(true);
    const payload = {
      name: name.toUpperCase(),
      description,
      price: parseInt(price.replace(/\D/g, "")),
      category,
      image_url: imageUrl || null,
      is_available: editingItem ? editingItem.is_available : true,
    };

    try {
      if (editingItem) {
        await api.put(`/fnb/${editingItem.id}`, payload);
        toast.success("Menu berhasil diperbarui");
      } else {
        await api.post("/fnb", payload);
        toast.success("Menu baru tersimpan");
      }
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Gagal menyimpan menu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-2xl dark:bg-slate-950 sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[92dvh] sm:w-[calc(100vw-1rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-slate-200 dark:sm:border-white/10 md:overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-4 py-4 pr-14 text-left dark:border-white/10 dark:bg-slate-950 sm:px-5">
          <DialogTitle className="text-lg font-semibold text-slate-950 dark:text-white">
            {editingItem ? "Edit menu" : "Tambah menu"}
          </DialogTitle>
          <p className="text-xs leading-5 text-slate-500">
            Atur foto, harga, kategori, dan catatan operasional.
          </p>
        </DialogHeader>

        <div className="flex h-[calc(100dvh-73px)] w-full flex-col overflow-y-auto sm:h-auto md:max-h-[calc(92dvh-73px)] md:flex-row md:overflow-hidden">
          <div className="flex w-full flex-col justify-start border-b border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-slate-900/50 md:w-5/12 md:border-b-0 md:border-r md:p-6">
            <div className="mx-auto grid w-full max-w-[420px] grid-cols-[116px_minmax(0,1fr)] items-center gap-4 md:block md:max-w-[340px] md:space-y-4">
              <div className="text-center md:text-left">
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white md:mb-3">
                  <ImagePlus className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white md:text-xl">
                  Foto menu
                </h2>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                  Foto 1:1 bikin kartu katalog rapi.
                </p>
              </div>

              <SingleImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                endpoint="/fnb/upload"
                label=""
                emptyTitle="Upload"
                emptyHint="PNG/JPG"
                className="order-first mx-auto w-full [&_label]:px-2 [&_label]:py-3 [&_p]:text-[11px] md:order-none md:w-full md:[&_label]:px-6 md:[&_label]:py-8 md:[&_p]:text-sm"
              />
            </div>
          </div>

          <div className="w-full bg-white p-4 dark:bg-slate-950 md:w-7/12 md:overflow-y-auto md:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 pb-4 md:space-y-5 md:pb-0">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-950">
                  <PackageCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {editingItem ? "Edit item katalog" : "Tambah item katalog"}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Dipakai untuk POS, transaksi menu, dan lampiran booking.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="ml-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Nama menu
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Ayam goreng"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-semibold uppercase focus-visible:ring-4 focus-visible:ring-blue-600/10 dark:border-white/10 dark:bg-slate-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                  <div className="space-y-2">
                    <Label className="ml-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Harga jual
                    </Label>
                    <Input
                      value={price}
                      onChange={(e) =>
                        setPrice(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="0"
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-semibold text-blue-600 focus-visible:ring-4 focus-visible:ring-blue-600/10 dark:border-white/10 dark:bg-slate-900 dark:text-blue-400"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="ml-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Kategori
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 w-full rounded-xl border-slate-200 bg-slate-50 px-4 text-xs font-semibold uppercase focus:ring-4 focus:ring-blue-600/10 dark:border-white/10 dark:bg-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="rounded-xl font-semibold uppercase dark:bg-slate-800">
                        <SelectItem value="Food">Makanan</SelectItem>
                        <SelectItem value="Drink">Minuman</SelectItem>
                        <SelectItem value="Snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="ml-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Catatan menu
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-20 rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-medium focus-visible:ring-4 focus-visible:ring-blue-600/10 dark:border-white/10 dark:bg-slate-900 md:min-h-24"
                    placeholder="Opsional: ukuran, varian, bahan, atau catatan kasir."
                  />
                </div>
              </div>

              <div className="sticky bottom-0 -mx-4 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      {editingItem ? "Simpan perubahan" : "Simpan ke katalog"}
                      <ChevronRight size={18} strokeWidth={4} />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg
    className={cn("animate-spin h-5 w-5", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);
