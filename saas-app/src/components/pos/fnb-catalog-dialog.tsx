"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  Minus,
  Utensils,
  ShoppingCart,
  Send,
  Trash2,
  Pizza,
  Coffee,
  IceCream,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface FnBCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItems: any[];
  onConfirmOrder: (cart: any[]) => Promise<void>;
}

export function FnBCatalogDialog({
  open,
  onOpenChange,
  menuItems,
  onConfirmOrder,
}: FnBCatalogDialogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  // --- LOGIKA KERANJANG ---
  const addToCart = (item: any) => {
    setCart((prev) => ({
      ...prev,
      [item.id]: {
        ...item,
        quantity: (prev[item.id]?.quantity || 0) + 1,
      },
    }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[id].quantity > 1) {
        newCart[id].quantity -= 1;
      } else {
        delete newCart[id];
      }
      return newCart;
    });
  };

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  const filtered = useMemo(() => {
    return menuItems.filter((m) => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        category === "all" ||
        m.category?.toLowerCase() === category.toLowerCase();
      return matchSearch && matchCat && m.is_available;
    });
  }, [menuItems, search, category]);

  const handleProcessOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirmOrder(cartItems);
      setCart({});
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] lg:max-w-[96vw] h-[96vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-3xl bg-slate-50 flex flex-col md:flex-row">
        {/* Aksesibilitas: Judul Tersembunyi */}
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle>Katalog Menu F&B</DialogTitle>
          </DialogHeader>
        </VisuallyHidden.Root>

        {/* --- KIRI: KATALOG MENU (WIDE & COMPACT) --- */}
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
          {/* HEADER COMPACT */}
          <div className="p-5 lg:p-8 bg-slate-950 text-white shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Utensils className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">
                    Menu <span className="text-blue-500">Catalog</span>
                  </h2>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    Pilih menu untuk ditambahkan ke keranjang
                  </p>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {[
                  {
                    id: "all",
                    label: "SEMUA",
                    icon: <Utensils className="w-3 h-3" />,
                  },
                  {
                    id: "food",
                    label: "MAKANAN",
                    icon: <Pizza className="w-3 h-3" />,
                  },
                  {
                    id: "drink",
                    label: "MINUMAN",
                    icon: <Coffee className="w-3 h-3" />,
                  },
                  {
                    id: "snack",
                    label: "CEMILAN",
                    icon: <IceCream className="w-3 h-3" />,
                  },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-2 px-5 h-11 rounded-xl text-[9px] font-black uppercase italic transition-all border-2 shrink-0",
                      category === cat.id
                        ? "bg-blue-600 border-blue-600 text-white shadow-xl"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white",
                    )}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <Input
                placeholder="Cari Menu (Contoh: Kopi, Mie Goreng)..."
                className="h-14 pl-12 rounded-2xl bg-white/5 border-none text-white font-bold italic text-xs focus:ring-2 focus:ring-blue-600 transition-all"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* GRID MENU COMPACT */}
          <ScrollArea className="flex-1 bg-slate-50/50">
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 pb-20">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={cn(
                    "flex flex-col text-left p-4 rounded-[2rem] transition-all group relative border-2",
                    cart[item.id]
                      ? "bg-white border-blue-600 shadow-xl scale-[1.02]"
                      : "bg-white border-transparent hover:border-slate-200 shadow-sm",
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[7px] font-black uppercase opacity-40">
                      {item.category}
                    </span>
                    {cart[item.id] && (
                      <Badge className="bg-blue-600 text-white h-5 w-5 flex items-center justify-center p-0 rounded-full font-black animate-in zoom-in">
                        {cart[item.id].quantity}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] font-black italic uppercase leading-tight line-clamp-2 mb-3 min-h-[30px]">
                    {item.name}
                  </span>
                  <span className="mt-auto text-xs font-black tracking-tighter text-blue-600">
                    Rp{formatIDR(item.price)}
                  </span>

                  {/* Overlay Indikator Plus saat Hover */}
                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors rounded-[2rem] flex items-center justify-center">
                    <Plus className="w-8 h-8 text-blue-600 opacity-0 group-hover:opacity-20 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* --- KANAN: REVIEW PESANAN (FIXED PANEL) --- */}
        <div className="w-full md:w-[400px] bg-slate-100 border-l border-slate-200 flex flex-col h-full overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.05)]">
          <div className="p-6 bg-white border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-black uppercase italic tracking-widest">
                Order Review
              </h3>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase italic">
              Review pesanan sebelum diproses
            </p>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {cartItems.length > 0 ? (
                cartItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-3xl bg-white shadow-sm flex flex-col gap-4 animate-in slide-in-from-right-4"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1 flex-1">
                        <span className="text-[10px] font-black uppercase italic leading-tight block">
                          {item.name}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">
                          Rp{formatIDR(item.price)} / unit
                        </span>
                      </div>
                      <span className="text-xs font-black italic text-slate-900">
                        Rp{formatIDR(item.price * item.quantity)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-1.5 border border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Minus className="w-3 h-3 stroke-[3]" />
                      </Button>
                      <span className="text-sm font-black italic">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addToCart(item)}
                        className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center space-y-4 opacity-20">
                  <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto">
                    <ShoppingCart className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-[10px] font-black uppercase italic tracking-[0.2em]">
                    Keranjang Kosong
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* TOTAL & KONFIRMASI AKHIR */}
          <div className="p-8 bg-white border-t border-slate-200 shrink-0 space-y-5 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase italic">
                  Subtotal Pesanan
                </p>
                <p className="text-4xl font-black italic tracking-tighter leading-none flex items-start">
                  <span className="text-lg text-blue-600 mr-1 mt-1">Rp</span>
                  {formatIDR(cartTotal)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCart({})}
                className={cn(
                  "text-red-400 hover:text-red-600 uppercase text-[9px] font-black italic transition-all",
                  cartItems.length === 0 && "hidden",
                )}
              >
                <Trash2 className="w-3 h-3 mr-1.5" /> Reset
              </Button>
            </div>

            <Button
              disabled={cartItems.length === 0 || isSubmitting}
              onClick={handleProcessOrder}
              className="w-full h-20 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic text-sm shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] gap-3 border-b-8 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  CONFIRM ORDER <Send className="w-5 h-5 ml-1" />
                </>
              )}
            </Button>
            <p className="text-[8px] text-center text-slate-400 font-bold uppercase italic leading-relaxed">
              Data akan langsung tercatat dalam billing sesi aktif <br /> dan
              bersifat final.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
