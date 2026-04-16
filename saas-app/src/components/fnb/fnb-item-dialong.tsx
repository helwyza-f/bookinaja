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
import { ChevronRight, Utensils, X } from "lucide-react";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import api from "@/lib/api";
import { toast } from "sonner";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";

interface FnbItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: any | null;
  onSuccess: () => void;
}

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
    if (!name || !price) return toast.error("Name and Price are required");

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
        toast.success("PRODUCT UPDATED");
      } else {
        await api.post("/fnb", payload);
        toast.success("NEW PRODUCT SAVED");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden border-none bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl">
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle>F&B Item Editor</DialogTitle>
          </DialogHeader>
        </VisuallyHidden.Root>

        <div className="flex flex-col md:flex-row w-full max-h-[90vh]">
          {/* LEFT: MEDIA SIDE */}
          <div className="w-full md:w-5/12 bg-slate-50 dark:bg-slate-900/50 p-8 md:p-10 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-white/5">
            <div className="space-y-6 w-full">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-[1000] uppercase italic tracking-tighter dark:text-white">
                  Product <span className="text-blue-600">Media</span>
                </h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest italic leading-none">
                  Ratio 1:1 Recommended
                </p>
              </div>

              {/* IMAGE UPLOAD CONTAINER */}
              <div className="aspect-square w-full rounded-[2rem] overflow-hidden bg-white dark:bg-slate-800 shadow-2xl ring-4 ring-white dark:ring-slate-900 group/upload relative">
                <SingleImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  endpoint="/fnb/upload"
                />
                {!imageUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                    <Utensils size={48} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: FORM DETAILS */}
          <div className="w-full md:w-7/12 p-8 md:p-12 overflow-y-auto bg-white dark:bg-slate-950">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                {/* NAME */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 italic tracking-widest ml-1">
                    Product Name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="EX: CHICKEN PARMESAN"
                    className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-black italic uppercase px-6 focus-visible:ring-2 focus-visible:ring-blue-600 shadow-inner"
                    required
                  />
                </div>

                {/* PRICE & CATEGORY */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 italic tracking-widest ml-1">
                      Price (IDR)
                    </Label>
                    <Input
                      value={price}
                      onChange={(e) =>
                        setPrice(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="0"
                      className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-black italic text-blue-600 dark:text-blue-400 px-6 shadow-inner focus-visible:ring-2 focus-visible:ring-blue-600"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 italic tracking-widest ml-1">
                      Category
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-black italic text-[11px] uppercase px-6 focus:ring-2 focus:ring-blue-600 shadow-inner">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl font-black uppercase italic dark:bg-slate-800">
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Drink">Drink</SelectItem>
                        <SelectItem value="Snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* DESCRIPTION */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 italic tracking-widest ml-1">
                    Short Description
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-2xl bg-slate-50 dark:bg-slate-900 border-none min-h-[140px] p-6 font-medium text-sm focus-visible:ring-2 focus-visible:ring-blue-600 shadow-inner"
                    placeholder="Describe flavor, size, or ingredients..."
                  />
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-16 rounded-[1.5rem] bg-blue-600 hover:bg-blue-500 text-white font-[1000] uppercase italic text-xs tracking-[0.2em] shadow-2xl border-b-8 border-blue-800 active:border-b-0 gap-3 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    {editingItem ? "Update Item" : "Commit to Catalog"}
                    <ChevronRight size={18} strokeWidth={4} />
                  </>
                )}
              </Button>
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
