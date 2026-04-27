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
  X,
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
      <DialogContent className="max-w-[98vw] lg:max-w-[96vw] h-[96vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-3xl bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle>Katalog Menu F&B</DialogTitle>
          </DialogHeader>
        </VisuallyHidden.Root>

        {/* --- KIRI: KATALOG MENU --- */}
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden border-r dark:border-white/5">
          <div className="p-6 lg:p-8 bg-slate-950 text-white shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Utensils className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none pr-2">
                    Menu <span className="text-blue-500">Katalog</span>
                  </h2>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 pr-1">
                    Tap menu untuk tambah ke keranjang
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
                      "flex items-center gap-2 px-5 h-11 rounded-xl text-[9px] font-black uppercase italic transition-all border-2 shrink-0 pr-3",
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
                placeholder="Cari Menu (Kopi, Mie Goreng, dll)..."
                className="h-14 pl-12 rounded-2xl bg-white/5 border-none text-white font-bold italic text-xs focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-600"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 bg-slate-50/50 dark:bg-slate-900">
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-24">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={cn(
                    "flex flex-col text-left p-5 rounded-[2rem] transition-all group relative border-2",
                    cart[item.id]
                      ? "bg-white dark:bg-slate-800 border-blue-600 shadow-xl scale-[1.02]"
                      : "bg-white dark:bg-slate-800/40 border-transparent dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 shadow-sm",
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[7px] font-black uppercase opacity-40 dark:text-white/60">
                      {item.category}
                    </span>
                    {cart[item.id] && (
                      <Badge className="bg-blue-600 text-white h-5 w-5 flex items-center justify-center p-0 rounded-full font-black animate-in zoom-in border-none">
                        {cart[item.id].quantity}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] font-black italic uppercase leading-tight line-clamp-2 mb-3 min-h-[30px] pr-1 dark:text-white">
                    {item.name}
                  </span>
                  <span className="mt-auto text-xs font-black tracking-tighter text-blue-600 dark:text-blue-400">
                    Rp{formatIDR(item.price)}
                  </span>
                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors rounded-[2rem] flex items-center justify-center">
                    <Plus className="w-8 h-8 text-blue-600 opacity-0 group-hover:opacity-20 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* --- KANAN: REVIEW PESANAN (FIXED/STICKY PANEL) --- */}
        <div className="w-full md:w-[420px] bg-slate-100 dark:bg-slate-950 flex flex-col h-full overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.05)] relative">
          {/* Header Review dengan Tombol Close */}
          <div className="p-6 bg-white dark:bg-slate-900 border-b dark:border-white/5 shrink-0 z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-black uppercase italic tracking-widest dark:text-white pr-2">
                  Review Order
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-all shadow-sm"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Area Item (Inner Scroll) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2 pb-10">
                {cartItems.length > 0 ? (
                  cartItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border dark:border-white/5 animate-in slide-in-from-right-4 transition-all"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black uppercase italic leading-tight block pr-2 dark:text-white truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-black italic text-slate-950 dark:text-blue-400 shrink-0 pr-1">
                          Rp{formatIDR(item.price * item.quantity)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          @ Rp{formatIDR(item.price)}
                        </span>

                        <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl border dark:border-white/5 p-0.5 ml-auto">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors text-slate-400"
                          >
                            <Minus className="w-3 h-3 stroke-[3]" />
                          </button>
                          <span className="w-8 text-center text-[10px] font-black italic dark:text-white pr-0.5">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors text-slate-400"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-32 text-center space-y-4 opacity-20 dark:opacity-10">
                    <ShoppingCart className="w-12 h-12 text-slate-400 dark:text-white mx-auto" />
                    <p className="text-[10px] font-black uppercase italic tracking-[0.2em] dark:text-white pr-2">
                      Keranjang Kosong
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Footer Sticky (Tetap di Bawah) */}
          <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 shrink-0 z-20 space-y-4 shadow-[0_-15px_30px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase italic">
                  Total Bill
                </p>
                <div className="flex items-baseline pr-2">
                  <span className="text-xs text-blue-600 dark:text-blue-400 mr-1 font-bold">
                    Rp
                  </span>
                  <span className="text-3xl font-black italic tracking-tighter dark:text-white">
                    {formatIDR(cartTotal)}
                  </span>
                </div>
              </div>

              {cartItems.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setCart({})}
                  className="text-red-400 hover:text-red-600 dark:hover:bg-red-950/30 uppercase text-[8px] font-black italic h-8 px-2 pr-3 transition-all"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Reset
                </Button>
              )}
            </div>

            <Button
              disabled={cartItems.length === 0 || isSubmitting}
              onClick={handleProcessOrder}
              className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic text-xs shadow-xl gap-3 border-b-4 border-blue-800 dark:border-blue-900 active:border-b-0 active:translate-y-1 transition-all group pr-3"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Kirim Pesanan{" "}
                  <Send className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
            <p className="text-[7px] text-center text-slate-400 dark:text-slate-600 font-bold uppercase italic tracking-tighter leading-none pr-1">
              Data sinkron otomatis ke billing aktif
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
