"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea"; // Pastikan sudah install shadcn textarea
import {
  Plus,
  UtensilsCrossed,
  Coffee,
  Trash2,
  Edit3,
  Loader2,
  PackageSearch,
  Upload,
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
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500 font-plus-jakarta px-4 mt-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-slate-100 pb-8">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase italic pr-6">
            Katalog <span className="text-blue-600">F&B</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] italic">
            Manajemen makanan & minuman untuk upsell booking
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
            <Button className="h-14 px-8 rounded-2xl bg-blue-600 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-200 hover:scale-105 transition-all italic">
              <Plus className="mr-2 h-5 w-5 stroke-[3]" /> Tambah Menu
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-10 border-none shadow-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                {editingId ? "Update" : "Register"}{" "}
                <span className="text-blue-600">Menu</span>
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleSave}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4"
            >
              {/* Kolom Kiri: Upload Image */}
              <div className="space-y-4">
                <SingleImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  endpoint="/fnb/upload" // Menggunakan endpoint baru yang kita buat tadi
                  label="Foto Produk"
                />

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">
                    Kategori
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-bold uppercase italic text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl font-bold uppercase italic">
                      <SelectItem value="Food">Food</SelectItem>
                      <SelectItem value="Drink">Drink</SelectItem>
                      <SelectItem value="Snack">Snack</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Kolom Kanan: Detail Data */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Nama Produk
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="MISAL: KOPI GULA AREN"
                    className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-lg focus:ring-blue-600"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Harga (Rp)
                  </Label>
                  <Input
                    value={price}
                    onChange={(e) =>
                      setPrice(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="15000"
                    className="h-14 rounded-2xl bg-slate-50 border-none font-black text-blue-600 text-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Deskripsi Singkat
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Misal: Kurang manis, level 5, dll"
                    className="rounded-2xl bg-slate-50 border-none font-medium min-h-[100px] resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed bg-blue-50/30 border-blue-100">
                  <input
                    type="checkbox"
                    id="avail"
                    checked={available}
                    onChange={(e) => setAvailable(e.target.checked)}
                    className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                  />
                  <Label
                    htmlFor="avail"
                    className="text-xs font-black uppercase italic text-slate-700 cursor-pointer"
                  >
                    Menu Tersedia
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-16 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-[0.2em] italic text-xs shadow-2xl border-b-8 border-slate-800 active:scale-95 transition-all"
                >
                  {editingId ? "Update Menu" : "Simpan Menu"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="font-black text-slate-300 uppercase tracking-widest text-xs italic text-center px-10">
            Menghubungkan ke Dapur...
          </p>
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => (
            <Card
              key={item.id}
              className="group rounded-[3rem] border-none shadow-sm hover:shadow-2xl transition-all duration-500 bg-white ring-1 ring-slate-100 overflow-hidden"
            >
              {/* IMAGE PREVIEW IN CARD */}
              <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <PackageSearch className="h-12 w-12 opacity-20" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <Badge
                    className={cn(
                      "border-none px-4 py-1.5 rounded-full font-black uppercase text-[9px] tracking-widest italic shadow-lg",
                      item.is_available
                        ? "bg-emerald-500 text-white"
                        : "bg-red-500 text-white",
                    )}
                  >
                    {item.is_available ? "READY" : "OUT"}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1 flex-1">
                    <Badge
                      variant="secondary"
                      className="bg-blue-50 text-blue-600 font-bold text-[8px] uppercase tracking-widest px-2 py-0.5 border-none mb-1"
                    >
                      {item.category}
                    </Badge>
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic pr-4 tracking-tighter leading-tight break-words">
                      {item.name}
                    </h3>
                  </div>
                  <div
                    className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner shrink-0",
                      item.category === "Drink"
                        ? "bg-cyan-50 text-cyan-600"
                        : "bg-orange-50 text-orange-600",
                    )}
                  >
                    {item.category === "Drink" ? (
                      <Coffee className="h-6 w-6" />
                    ) : (
                      <UtensilsCrossed className="h-6 w-6" />
                    )}
                  </div>
                </div>

                <p className="text-slate-400 text-xs font-medium italic mb-6 line-clamp-2 min-h-[2rem]">
                  {item.description || "Tidak ada deskripsi produk."}
                </p>

                <div className="flex items-end justify-between border-t border-slate-50 pt-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Price
                    </p>
                    <p className="text-2xl font-black text-blue-600 italic tracking-tighter">
                      Rp{formatIDR(item.price)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
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
                      className="h-11 w-11 p-0 rounded-xl bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Edit3 className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      className="h-11 w-11 p-0 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100">
          {/* ... Bagian Empty State Tetap Sama ... */}
        </div>
      )}
    </div>
  );
}
