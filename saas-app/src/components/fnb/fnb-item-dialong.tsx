"use client";

import {
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
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import { PackageSearch, ChevronRight, Info, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

interface FnbItemDialogProps {
  editingId: string | null;
  onSubmit: (e: React.FormEvent) => void;
  formState: {
    name: string;
    setName: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    price: string;
    setPrice: (v: string) => void;
    category: string;
    setCategory: (v: string) => void;
    imageUrl: string;
    setImageUrl: (v: string) => void;
    available: boolean;
    setAvailable: (v: boolean) => void;
  };
}

export function FnbItemDialog({
  editingId,
  onSubmit,
  formState,
}: FnbItemDialogProps) {
  return (
    <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden border-none bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl">
      <div className="flex flex-col md:flex-row min-h-[500px] max-h-[90vh]">
        {/* LEFT SIDE: Media & Tips */}
        <div className="w-full md:w-[350px] bg-slate-50/80 p-8 md:p-10 flex flex-col border-b md:border-b-0 md:border-r border-slate-100">
          <div className="space-y-6">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="border-blue-200 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic"
              >
                {editingId ? "Update Mode" : "New Entry"}
              </Badge>
              <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter leading-none text-slate-900">
                {editingId ? "Modify" : "Register"} <br />
                <span className="text-blue-600">Product</span>
              </DialogTitle>
            </div>

            <div className="relative aspect-square w-full max-w-[250px] mx-auto md:max-w-none rounded-[2rem] overflow-hidden shadow-xl ring-4 ring-white bg-white">
              <SingleImageUpload
                value={formState.imageUrl}
                onChange={formState.setImageUrl}
                endpoint="/fnb/upload"
                label=""
              />
            </div>

            <div className="hidden md:flex p-5 bg-blue-600 rounded-[2rem] text-white flex-col gap-2 shadow-lg shadow-blue-100">
              <div className="flex items-center gap-2 opacity-80">
                <Info className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                  Visual Guide
                </span>
              </div>
              <p className="text-[10px] font-bold leading-relaxed italic">
                Foto yang cerah meningkatkan nafsu makan customer hingga 40%.
                Gunakan rasio 1:1.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Form Inputs */}
        <div className="flex-1 p-8 md:p-12 overflow-y-auto">
          <form onSubmit={onSubmit} className="space-y-8">
            <div className="space-y-6">
              {/* Product Identity */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic">
                  Product Name
                </Label>
                <Input
                  value={formState.name}
                  onChange={(e) => formState.setName(e.target.value)}
                  placeholder="Ex: Salted Caramel Latte"
                  className="h-14 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-600/20 font-bold text-base px-6"
                  required
                />
              </div>

              {/* Price & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic">
                    Price (IDR)
                  </Label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-300 italic text-sm">
                      Rp
                    </div>
                    <Input
                      value={formState.price}
                      onChange={(e) =>
                        formState.setPrice(e.target.value.replace(/\D/g, ""))
                      }
                      className="h-14 rounded-2xl bg-slate-50 border-none pl-12 font-black text-blue-600 text-lg"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic">
                    Category
                  </Label>
                  <Select
                    value={formState.category}
                    onValueChange={formState.setCategory}
                  >
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-bold uppercase italic text-xs px-6">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none p-2 shadow-2xl font-bold uppercase italic">
                      <SelectItem value="Food">Food</SelectItem>
                      <SelectItem value="Drink">Drink</SelectItem>
                      <SelectItem value="Snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Narrative */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic">
                  Description
                </Label>
                <Textarea
                  value={formState.description}
                  onChange={(e) => formState.setDescription(e.target.value)}
                  placeholder="Describe the taste profile..."
                  className="rounded-2xl bg-slate-50 border-none min-h-[100px] p-6 font-medium resize-none"
                />
              </div>

              {/* Availability Switch */}
              <div className="flex items-center justify-between p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      formState.available
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-400",
                    )}
                  >
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase italic tracking-widest text-slate-800">
                      Available
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase italic">
                      Tampilkan di menu
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formState.available}
                  onChange={(e) => formState.setAvailable(e.target.checked)}
                  className="h-6 w-12 rounded-full appearance-none bg-slate-200 checked:bg-blue-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all checked:after:translate-x-6"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-16 rounded-2xl bg-slate-900 text-white hover:bg-blue-600 transition-all shadow-xl"
            >
              <div className="flex items-center gap-2 font-black uppercase italic tracking-widest text-[11px]">
                <span>{editingId ? "Update Product" : "Finalize & Save"}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Button>
          </form>
        </div>
      </div>
    </DialogContent>
  );
}

// Helper Badge internal
function Badge({ children, className, variant }: any) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        className,
      )}
    >
      {children}
    </div>
  );
}
