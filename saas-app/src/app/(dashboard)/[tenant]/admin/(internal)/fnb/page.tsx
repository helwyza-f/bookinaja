"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  UtensilsCrossed,
  Coffee,
  IceCream,
  Trash2,
  Edit3,
  Loader2,
  PackageSearch,
  MoreVertical,
  Check,
  X,
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
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Food");
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
      price: parseInt(price.replace(/\D/g, "")),
      category,
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
    setPrice("");
    setCategory("Food");
    setAvailable(true);
  };

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500 font-plus-jakarta px-4">
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
          <DialogContent className="rounded-[2.5rem] p-10 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                {editingId ? "Update" : "Register"}{" "}
                <span className="text-blue-600">Menu</span>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Nama Produk
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="MISAL: INDOMIE JUMBO"
                  className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-lg focus:ring-blue-600"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    </SelectContent>
                  </Select>
                </div>
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
                  Menu Tersedia untuk Dipesan
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-16 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-[0.2em] italic text-xs shadow-2xl border-b-8 border-slate-800 active:scale-95 transition-all"
              >
                {editingId ? "Update Menu" : "Simpan Menu"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="font-black text-slate-300 uppercase tracking-widest text-xs italic">
            Menghubungkan ke Dapur...
          </p>
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card
              key={item.id}
              className="group rounded-[2.5rem] border-none shadow-sm hover:shadow-2xl transition-all duration-500 bg-white ring-1 ring-slate-100 overflow-visible"
            >
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div
                    className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:rotate-6",
                      item.category === "Drink"
                        ? "bg-cyan-50 text-cyan-600"
                        : item.category === "Food"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-purple-50 text-purple-600",
                    )}
                  >
                    {item.category === "Drink" ? (
                      <Coffee className="h-7 w-7" />
                    ) : (
                      <UtensilsCrossed className="h-7 w-7" />
                    )}
                  </div>
                  <Badge
                    className={cn(
                      "border-none px-4 py-1.5 rounded-full font-black uppercase text-[9px] tracking-widest italic shadow-sm",
                      item.is_available
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700",
                    )}
                  >
                    {item.is_available ? "READY" : "OUT OF STOCK"}
                  </Badge>
                </div>

                <div className="space-y-1 mb-8">
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic pr-4 tracking-tighter leading-tight break-words">
                    {item.name}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 text-slate-400 font-bold text-[8px] uppercase tracking-widest px-2 py-0.5 border-none"
                  >
                    {item.category}
                  </Badge>
                </div>

                <div className="flex items-end justify-between border-t border-slate-50 pt-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Price / Item
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
                        setPrice(item.price.toString());
                        setCategory(item.category);
                        setAvailable(item.is_available);
                        setOpen(true);
                      }}
                      className="h-11 w-11 p-0 rounded-xl bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent"
                    >
                      <Edit3 className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      className="h-11 w-11 p-0 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent"
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
          <div className="relative h-24 w-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl ring-1 ring-slate-100">
            <PackageSearch className="h-12 w-12 text-slate-200" />
            <div className="absolute -top-1 -right-1 h-8 w-8 bg-blue-500 rounded-full border-4 border-white animate-bounce flex items-center justify-center shadow-lg">
              <Plus className="text-white h-4 w-4 stroke-[4]" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic pr-4 mb-2">
            Katalog Masih Kosong
          </h3>
          <p className="text-slate-400 font-bold text-xs mb-10 uppercase tracking-widest italic pr-2">
            Ayo tambahkan menu makanan/minuman pertama Anda.
          </p>
          <Button
            onClick={() => setOpen(true)}
            className="h-16 px-10 rounded-[2rem] bg-blue-600 font-black uppercase tracking-[0.2em] italic text-xs shadow-xl"
          >
            Buka Dapur Sekarang
          </Button>
        </div>
      )}
    </div>
  );
}
