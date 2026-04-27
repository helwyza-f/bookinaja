"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  Edit3,
  PackageSearch,
  ChevronRight,
  Utensils,
  Coffee,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string | null;
  is_available: boolean;
};

// --- KOMPONEN SKELETON COMPACT ---
function FnbSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {[...Array(12)].map((_, i) => (
        <Card
          key={i}
          className="rounded-2xl border-none bg-white dark:bg-slate-900 shadow-sm overflow-hidden h-64"
        >
          <Skeleton className="aspect-square w-full dark:bg-slate-800" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4 dark:bg-slate-800" />
            <Skeleton className="h-3 w-1/2 dark:bg-slate-800" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function FnbManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Food");
  const [imageUrl, setImageUrl] = useState("");
  const [available, setAvailable] = useState(true);

  const fetchMenu = async () => {
    try {
      const res = await api.get("/fnb");
      setItems(res.data || []);
    } catch {
      toast.error("Gagal sinkronisasi katalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleToggleAvailable = async (item: MenuItem) => {
    const originalStatus = item.is_available;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_available: !originalStatus } : i,
      ),
    );

    try {
      await api.put(`/fnb/${item.id}`, {
        ...item,
        is_available: !originalStatus,
      });
      toast.success(`${item.name} status updated`);
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_available: originalStatus } : i,
        ),
      );
      toast.error("Gagal update stok");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: name.toUpperCase(),
      description,
      price: parseInt(price.replace(/\D/g, "")),
      category,
      image_url: imageUrl || null,
      is_available: available,
    };

    try {
      if (editingId) {
        await api.put(`/fnb/${editingId}`, payload);
        toast.success("MENU UPDATED");
      } else {
        await api.post("/fnb", payload);
        toast.success("NEW ITEM ADDED");
      }
      setOpen(false);
      resetForm();
      fetchMenu();
    } catch {
      toast.error("Gagal menyimpan data");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item ini selamanya?")) return;
    try {
      await api.delete(`/fnb/${id}`);
      toast.success("Item removed");
      fetchMenu();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategory("Food");
    setImageUrl("");
    setAvailable(true);
  };

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 pb-32 animate-in fade-in duration-500 font-plus-jakarta px-3 md:px-4">
      {/* 1. COMPACT HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-[0.5px] border-slate-200 dark:border-white/5 pb-4 md:pb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Coffee size={18} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-4xl font-[1000] italic uppercase tracking-tighter text-slate-950 dark:text-white leading-none">
              Menu <span className="text-blue-600">Library.</span>
            </h1>
            <p className="hidden sm:block text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] italic mt-1.5">
              {items.length} Products Registered
            </p>
          </div>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="h-11 px-3 md:px-6 rounded-2xl bg-slate-950 dark:bg-blue-600 text-white font-black uppercase italic text-[9px] shadow-lg border-b-4 border-slate-800 dark:border-blue-800 gap-2 transition-all active:scale-95 w-full sm:w-auto">
              <Plus size={16} strokeWidth={4} /> Add Item
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden border-none bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl">
            <VisuallyHidden.Root>
              <DialogHeader>
                <DialogTitle>Menu Editor</DialogTitle>
              </DialogHeader>
            </VisuallyHidden.Root>

            <div className="flex flex-col md:flex-row w-full max-h-[90vh]">
              {/* Left Side: Media Area - FIXED & CLEAN */}
              <div className="w-full md:w-5/12 bg-slate-50 dark:bg-slate-900/50 p-5 md:p-10 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-white/5">
                <div className="space-y-6 w-full max-w-[320px]">
                  <div className="text-center md:text-left">
                    <h2 className="text-2xl font-[1000] uppercase italic tracking-tighter dark:text-white leading-none">
                      Product <span className="text-blue-600">Media</span>
                    </h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 tracking-widest italic">
                      Ratio 1:1 Recommended
                    </p>
                  </div>

                  {/* Kontainer Upload - Bersih Tanpa Inner Padding Berlebih */}
                  <div className="p-4 w-full rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-800 shadow-2xl ring-4 ring-white dark:ring-slate-900 group/upload relative">
                    <SingleImageUpload
                      value={imageUrl}
                      onChange={setImageUrl}
                      endpoint="/fnb/upload"
                    />
                  </div>

                  <p className="text-[9px] text-center text-slate-400 font-bold uppercase italic px-4 leading-relaxed">
                    Click the box above to upload or drag your product photo.
                  </p>
                </div>
              </div>

              {/* Right Side: Form Details */}
              <div className="w-full md:w-7/12 p-5 md:p-12 overflow-y-auto bg-white dark:bg-slate-950">
                <form onSubmit={handleSave} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 italic tracking-widest ml-1">
                        Product Name
                      </Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="EX: CHICKEN PARMESAN"
                        className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-black italic uppercase px-6 focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-white shadow-inner"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                          <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-black italic text-[11px] uppercase px-6 focus:ring-2 focus:ring-blue-600 dark:text-white shadow-inner">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-2xl font-black uppercase italic">
                            <SelectItem value="Food">Food</SelectItem>
                            <SelectItem value="Drink">Drink</SelectItem>
                            <SelectItem value="Snack">Snack</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 italic tracking-widest ml-1">
                        Short Description
                      </Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="rounded-2xl bg-slate-50 dark:bg-slate-900 border-none min-h-[140px] p-6 font-medium text-sm focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-white shadow-inner"
                        placeholder="Explain flavor, size, or ingredients..."
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-16 rounded-[1.5rem] bg-blue-600 hover:bg-blue-500 text-white font-[1000] uppercase italic text-xs tracking-[0.2em] shadow-2xl border-b-8 border-blue-800 active:border-b-0 gap-3 transition-all active:scale-[0.98]"
                  >
                    {editingId ? "Update Product" : "Commit to Catalog"}
                    <ChevronRight size={18} strokeWidth={4} />
                  </Button>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 2. GRID AREA - HIGH DENSITY */}
      {loading ? (
        <FnbSkeleton />
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4 animate-in slide-in-from-bottom-2 duration-500">
          {items.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "group rounded-2xl border-[0.5px] border-slate-200 dark:border-white/5 transition-all duration-300 bg-white dark:bg-slate-900 overflow-hidden flex flex-col relative",
                !item.is_available && "opacity-60 grayscale-[0.5]",
              )}
            >
              <div className="aspect-square w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-10">
                    <Utensils size={40} />
                  </div>
                )}

                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1.5 px-2.5 rounded-lg border border-white/10 shadow-2xl">
                  <span className="text-[7px] font-black text-white uppercase italic tracking-widest">
                    {item.is_available ? "Ready" : "Empty"}
                  </span>
                  <button
                    onClick={() => handleToggleAvailable(item)}
                    className={cn(
                      "w-7 h-4 rounded-full relative transition-all shadow-inner",
                      item.is_available ? "bg-emerald-500" : "bg-slate-500",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm",
                        item.is_available
                          ? "translate-x-3.5"
                          : "translate-x-0.5",
                      )}
                    />
                  </button>
                </div>
              </div>

              <CardContent className="p-2.5 flex flex-col flex-1">
                <div className="flex-1 min-h-[34px] mb-2.5">
                  <h3 className="text-[10px] md:text-[11px] font-[1000] text-slate-900 dark:text-white uppercase italic tracking-tight leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">
                    {item.category}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-50 dark:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-400 uppercase italic mb-0.5">
                      Price
                    </span>
                    <span className="text-[11px] md:text-sm font-[1000] italic text-blue-600 dark:text-blue-400 tracking-tighter">
                      Rp{formatIDR(item.price)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingId(item.id);
                        setName(item.name);
                        setDescription(item.description || "");
                        setPrice(item.price.toString());
                        setCategory(item.category);
                        setImageUrl(item.image_url || "");
                        setAvailable(item.is_available);
                        setOpen(true);
                      }}
                      className="h-7 w-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                    >
                      <Edit3 size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="h-7 w-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all shadow-sm"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="h-[50vh] flex flex-col items-center justify-center bg-white dark:bg-slate-950 rounded-[1.75rem] md:rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10 p-8 md:p-12 text-center">
          <div className="h-20 w-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
            <PackageSearch size={32} className="text-slate-200" />
          </div>
          <h3 className="text-2xl font-[1000] italic uppercase text-slate-900 dark:text-white tracking-tighter">
            Library Empty
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase italic mt-2 mb-8 tracking-widest">
            Register your products for the terminal display
          </p>
          <Button
            onClick={() => setOpen(true)}
            className="h-12 px-8 rounded-2xl bg-blue-600 text-white font-black italic uppercase text-[10px] tracking-widest"
          >
            Register Product
          </Button>
        </div>
      )}
    </div>
  );
}
