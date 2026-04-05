"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  Edit3,
  PackageSearch,
  ChevronRight,
  Utensils,
  Camera,
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

// --- KOMPONEN SKELETON ---
function FnbSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <Card
          key={i}
          className="rounded-3xl border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-white/5 overflow-hidden"
        >
          <Skeleton className="aspect-video w-full dark:bg-slate-800" />
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4 dark:bg-slate-800" />
              <Skeleton className="h-3 w-full dark:bg-slate-800" />
            </div>
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-6 w-20 dark:bg-slate-800" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-lg dark:bg-slate-800" />
                <Skeleton className="h-8 w-8 rounded-lg dark:bg-slate-800" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function FnbManagementPage() {
  const [items, setItems] = useState<any[]>([]);
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
    } catch (err) {
      toast.error("GAGAL MEMUAT KATALOG");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleToggleAvailable = async (item: any) => {
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
      toast.success(
        `${item.name} KINI ${!originalStatus ? "TERSEDIA" : "HABIS"}`,
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_available: originalStatus } : i,
        ),
      );
      toast.error("GAGAL UPDATE STATUS");
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
        toast.success("MENU DIPERBARUI");
      } else {
        await api.post("/fnb", payload);
        toast.success("MENU BARU DITAMBAHKAN");
      }
      setOpen(false);
      resetForm();
      fetchMenu();
    } catch (err) {
      toast.error("GAGAL MENYIMPAN");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item ini dari katalog?")) return;
    try {
      await api.delete(`/fnb/${id}`);
      toast.success("ITEM DIHAPUS");
      fetchMenu();
    } catch (err) {
      toast.error("GAGAL MENGHAPUS");
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
    <div className="max-w-7xl mx-auto space-y-10 pb-32 animate-in fade-in duration-700 font-plus-jakarta px-4 mt-10 text-slate-900 dark:text-slate-100">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-slate-100 dark:border-white/5 pb-10">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic pr-6 leading-none">
            Menu <span className="text-blue-600">Library</span>
          </h1>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] italic pr-2">
            {items.length} Total Items in Catalog
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="h-14 px-8 rounded-2xl bg-slate-950 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 shadow-xl transition-all active:scale-95 gap-3 border-b-4 border-slate-800 dark:border-blue-800">
              <Plus className="h-5 w-5 text-blue-400 dark:text-white stroke-[3]" />
              <span className="font-black uppercase tracking-widest text-[11px] italic text-white pr-1">
                Add New Item
              </span>
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden border-none bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex flex-col md:flex-row w-full max-h-[90vh]">
              {/* Left Side: Image Upload */}
              <div className="w-full md:w-5/12 bg-slate-50 dark:bg-slate-900/50 p-10 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 dark:border-white/5">
                <div className="space-y-8">
                  <DialogHeader className="text-left">
                    <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter leading-none dark:text-white">
                      {editingId ? "Modify" : "Register"}{" "}
                      <span className="text-blue-600">Product</span>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="relative aspect-square w-full rounded-[2rem] overflow-hidden shadow-2xl ring-4 ring-white dark:ring-slate-800 bg-white dark:bg-slate-900">
                    <SingleImageUpload
                      value={imageUrl}
                      onChange={setImageUrl}
                      endpoint="/fnb/upload"
                      label=""
                    />
                    {!imageUrl && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                        <Camera size={48} className="mb-2" />
                        <span className="text-[10px] font-black uppercase italic">
                          Upload Thumbnail
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Form */}
              <div className="w-full md:w-7/12 p-10 overflow-y-auto bg-white dark:bg-slate-950">
                <form onSubmit={handleSave} className="space-y-8">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 italic tracking-widest ml-1">
                        Product Name
                      </Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="EX: ICED AMERICANO"
                        className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-black italic uppercase px-6 focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-white"
                        required
                      />
                    </div>
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
                          className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-black italic text-blue-600 dark:text-blue-400 px-6 focus-visible:ring-2 focus-visible:ring-blue-600"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 italic tracking-widest ml-1">
                          Category
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-black italic text-[11px] uppercase px-6 focus:ring-2 focus:ring-blue-600 dark:text-white">
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
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 italic tracking-widest ml-1">
                        Description
                      </Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="rounded-2xl bg-slate-50 dark:bg-slate-900 border-none min-h-[100px] p-6 font-medium text-sm focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-white"
                        placeholder="Optional product details..."
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-16 rounded-[1.5rem] bg-slate-950 dark:bg-blue-600 hover:bg-slate-900 dark:hover:bg-blue-500 font-black uppercase italic text-[12px] tracking-[0.2em] shadow-2xl border-b-4 border-slate-800 dark:border-blue-800 gap-3"
                  >
                    {editingId ? "Update Item" : "Save to Catalog"}
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* GRID AREA */}
      {loading ? (
        <FnbSkeleton />
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "group rounded-[2rem] border-none shadow-sm hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-500 bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5 overflow-hidden flex flex-col relative",
                !item.is_available && "opacity-70 grayscale-[0.4]",
              )}
            >
              <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200 dark:text-slate-700">
                    <Utensils className="h-12 w-12 opacity-20" />
                  </div>
                )}

                {/* Stock Toggle Overlay */}
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md p-2 px-3 rounded-xl shadow-2xl border border-white/10">
                  <span className="text-[9px] font-black text-white uppercase italic tracking-tighter pr-1">
                    {item.is_available ? "Ready" : "Sold Out"}
                  </span>
                  <button
                    onClick={() => handleToggleAvailable(item)}
                    className={cn(
                      "w-9 h-5 rounded-full relative transition-all duration-300 shadow-inner",
                      item.is_available ? "bg-emerald-500" : "bg-slate-500",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm",
                        item.is_available ? "translate-x-5" : "translate-x-1",
                      )}
                    />
                  </button>
                </div>

                <Badge
                  className={cn(
                    "absolute top-4 left-4 border-none px-4 py-1 rounded-lg font-black uppercase text-[9px] italic shadow-xl pr-3",
                    item.is_available
                      ? "bg-emerald-500/90 text-white"
                      : "bg-red-500/90 text-white",
                  )}
                >
                  {item.category}
                </Badge>
              </div>

              <CardContent className="p-6 flex flex-col flex-1 space-y-4">
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight pr-4 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-slate-400 dark:text-slate-500 text-[11px] leading-relaxed italic line-clamp-2 min-h-[2.5rem] pr-2">
                    {item.description || "-"}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase italic leading-none mb-1">
                      Price Unit
                    </span>
                    <p className="text-xl font-black text-slate-950 dark:text-blue-400 italic tracking-tighter leading-none pr-1">
                      <span className="text-[10px] mr-0.5 text-blue-600 dark:text-blue-500">
                        Rp
                      </span>
                      {formatIDR(item.price)}
                    </p>
                  </div>
                  <div className="flex gap-2">
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
                      className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="py-32 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-700">
          <div className="relative h-24 w-24 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl ring-1 ring-slate-100 dark:ring-white/10">
            <PackageSearch className="h-12 w-12 text-slate-200 dark:text-slate-700" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic pr-6 mb-3">
            Menu Catalog Empty
          </h3>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mb-10 uppercase tracking-widest italic pr-4 max-w-sm mx-auto leading-relaxed">
            Start adding products to your digital library to begin selling at
            the terminal.
          </p>
          <Button
            onClick={() => setOpen(true)}
            className="h-12 px-10 rounded-xl bg-blue-600 font-black uppercase italic text-[11px] tracking-widest shadow-lg shadow-blue-500/20"
          >
            Create First Item
          </Button>
        </div>
      )}
    </div>
  );
}
