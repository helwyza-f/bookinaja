"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  UtensilsCrossed,
  Coffee,
  Trash2,
  Edit3,
  Loader2,
  PackageSearch,
  ChevronRight,
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
      toast.error("Gagal mengambil katalog menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // FUNGSI BARU: Quick Toggle untuk ketersediaan stok
  const handleToggleAvailable = async (item: any) => {
    const originalStatus = item.is_available;

    // Optimistic Update (Ubah di UI dulu biar instan)
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_available: !originalStatus } : i,
      ),
    );

    try {
      await api.put(`/fnb/${item.id}`, {
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        image_url: item.image_url,
        is_available: !originalStatus,
      });
      toast.success(
        `${item.name} kini ${!originalStatus ? "Tersedia" : "Habis"}`,
      );
    } catch (err) {
      // Rollback jika gagal
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_available: originalStatus } : i,
        ),
      );
      toast.error("Gagal update status");
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
        toast.success("Menu diperbarui");
      } else {
        await api.post("/fnb", payload);
        toast.success("Menu ditambahkan");
      }
      setOpen(false);
      resetForm();
      fetchMenu();
    } catch (err) {
      toast.error("Gagal menyimpan menu");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus menu ini dari katalog?")) return;
    try {
      await api.delete(`/fnb/${id}`);
      toast.success("Menu dihapus");
      fetchMenu();
    } catch (err) {
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
    <div className="max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-700 font-plus-jakarta px-4 mt-8">
      {/* COMPACT HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 uppercase italic">
            Menu <span className="text-blue-600">Library</span>
          </h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest italic">
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
            <Button className="h-12 px-6 rounded-xl bg-slate-900 shadow-lg hover:scale-105 transition-all">
              <Plus className="mr-2 h-4 w-4 text-blue-400 stroke-[3]" />
              <span className="font-black uppercase tracking-widest text-[10px] italic text-white">
                Add New Item
              </span>
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden border-none bg-white rounded-[2rem] shadow-2xl">
            <div className="flex flex-col md:flex-row w-full max-h-[90vh]">
              <div className="w-full md:w-5/12 bg-slate-50/50 p-8 flex flex-col border-b md:border-b-0 md:border-r border-slate-100">
                <div className="space-y-6">
                  <DialogHeader className="text-left">
                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                      {editingId ? "Modify" : "Register"}{" "}
                      <span className="text-blue-600">Product</span>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-md ring-4 ring-white bg-white">
                    <SingleImageUpload
                      value={imageUrl}
                      onChange={setImageUrl}
                      endpoint="/fnb/upload"
                      label=""
                    />
                  </div>
                </div>
              </div>
              <div className="w-full md:w-7/12 p-8 md:p-10 overflow-y-auto bg-white">
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 italic">
                        Product Name
                      </Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Latte"
                        className="h-12 rounded-xl bg-slate-50 border-none font-bold px-4"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-400 italic">
                          Price
                        </Label>
                        <Input
                          value={price}
                          onChange={(e) =>
                            setPrice(e.target.value.replace(/\D/g, ""))
                          }
                          className="h-12 rounded-xl bg-slate-50 border-none font-black text-blue-600"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-400 italic">
                          Category
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold italic text-xs uppercase">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="font-bold uppercase italic">
                            <SelectItem value="Food">Food</SelectItem>
                            <SelectItem value="Drink">Drink</SelectItem>
                            <SelectItem value="Snack">Snack</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 italic">
                        Description
                      </Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="rounded-xl bg-slate-50 border-none min-h-[80px] text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-14 rounded-xl bg-slate-900 font-black uppercase italic text-[10px] tracking-widest"
                  >
                    <span className="mr-2">
                      {editingId ? "Update" : "Save Product"}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* COMPACT GRID */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="font-black uppercase tracking-widest text-[9px] italic">
            Loading Menu...
          </p>
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
          {items.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "group rounded-2xl border-none shadow-sm hover:shadow-md transition-all bg-white ring-1 ring-slate-100 overflow-hidden flex flex-col",
                !item.is_available && "opacity-75 grayscale-[0.5]", // Visual feedback kalau stok habis
              )}
            >
              <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <PackageSearch className="h-8 w-8 opacity-20" />
                  </div>
                )}

                {/* TOGGLE SWITCH DI ATAS GAMBAR */}
                <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/40 backdrop-blur-md p-1.5 px-2 rounded-lg">
                  <span className="text-[8px] font-black text-white uppercase italic tracking-tighter">
                    {item.is_available ? "Ready" : "Out"}
                  </span>
                  <button
                    onClick={() => handleToggleAvailable(item)}
                    className={cn(
                      "w-8 h-4 rounded-full relative transition-colors duration-200",
                      item.is_available ? "bg-emerald-500" : "bg-slate-400",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200",
                        item.is_available
                          ? "translate-x-4.5"
                          : "translate-x-0.5",
                      )}
                    />
                  </button>
                </div>

                <Badge
                  className={cn(
                    "absolute top-2 left-2 border-none px-2 py-0.5 rounded-md font-black uppercase text-[8px] italic shadow-md",
                    item.is_available
                      ? "bg-emerald-500/90 text-white"
                      : "bg-red-500/90 text-white",
                  )}
                >
                  {item.category}
                </Badge>
              </div>

              <CardContent className="p-4 flex flex-col flex-1 space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-slate-400 text-[10px] leading-tight italic line-clamp-2 h-7">
                    {item.description || "-"}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-auto">
                  <p className="text-base font-black text-slate-900 italic tracking-tighter">
                    <span className="text-blue-600 text-[10px] mr-0.5">Rp</span>
                    {formatIDR(item.price)}
                  </p>
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
                      className="h-8 w-8 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 rounded-lg bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
          <PackageSearch className="w-10 h-10 text-slate-200" />
          <Button
            onClick={() => setOpen(true)}
            className="rounded-xl h-10 px-6 bg-blue-600 font-black uppercase italic text-[9px] tracking-widest"
          >
            Create Item
          </Button>
        </div>
      )}
    </div>
  );
}
