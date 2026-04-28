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
  menuItems: FnBMenuItem[];
  onConfirmOrder: (cart: FnBCartItem[]) => Promise<void>;
}

export type FnBMenuItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
  is_available?: boolean;
};

export type FnBCartItem = FnBMenuItem & {
  quantity: number;
};

export function FnBCatalogDialog({
  open,
  onOpenChange,
  menuItems,
  onConfirmOrder,
}: FnBCatalogDialogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<Record<string, FnBCartItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  const addToCart = (item: FnBMenuItem) => {
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
      setReviewOpen(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-[96vw] flex-col overflow-hidden rounded-3xl border bg-slate-50 p-0 shadow-2xl md:h-[96vh] md:max-w-[96vw] md:flex-row dark:bg-slate-950">
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle>Katalog Menu F&B</DialogTitle>
          </DialogHeader>
        </VisuallyHidden.Root>

        {/* --- KIRI: KATALOG MENU --- */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b bg-white md:h-full md:border-b-0 md:border-r dark:border-white/10 dark:bg-slate-900">
          <div className="shrink-0 bg-slate-950 p-4 text-white md:p-6 lg:p-8">
            <div className="mb-4 flex flex-col justify-between gap-4 lg:mb-6 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 md:h-12 md:w-12">
                  <Utensils className="h-5 w-5 text-white md:h-6 md:w-6" />
                </div>
                <div>
                  <h2 className="pr-2 text-lg font-semibold leading-tight md:text-2xl">
                    Menu Katalog
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-400">
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
                      "flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 pr-3 text-[11px] font-semibold transition-all",
                      category === cat.id
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-white/10 bg-white/5 text-slate-400 hover:text-white",
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
                className="h-11 rounded-xl border-none bg-white/5 pl-12 text-sm font-medium text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-600 md:h-14 md:rounded-2xl"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 bg-slate-50/50 dark:bg-slate-900">
            <div className="grid grid-cols-2 gap-3 p-4 pb-8 sm:grid-cols-3 md:grid-cols-4 md:p-6 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={cn(
                    "group relative flex flex-col rounded-2xl border p-4 text-left transition-all md:p-5",
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

        <div className="flex shrink-0 items-center gap-3 border-t bg-white p-3 md:hidden dark:border-white/10 dark:bg-slate-900">
          <Button
            variant="outline"
            disabled={cartItems.length === 0}
            onClick={() => setReviewOpen(true)}
            className="h-12 flex-1 rounded-xl justify-between px-4"
          >
            <span className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-4 w-4" />
              {cartItems.length} item
            </span>
            <span className="font-semibold text-blue-600">
              Rp{formatIDR(cartTotal)}
            </span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-12 w-12 rounded-xl"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* --- KANAN: REVIEW PESANAN (FIXED/STICKY PANEL) --- */}
        <div
          className={cn(
            "fixed inset-x-3 bottom-3 top-auto z-50 hidden max-h-[78vh] flex-col overflow-hidden rounded-3xl bg-slate-100 shadow-2xl md:relative md:inset-auto md:z-auto md:flex md:h-full md:w-[420px] md:rounded-none md:shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:bg-slate-950",
            reviewOpen && "flex md:flex",
          )}
        >
          {/* Header Review dengan Tombol Close */}
          <div className="z-20 shrink-0 border-b bg-white p-4 md:p-6 dark:border-white/10 dark:bg-slate-900">
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
                onClick={() =>
                  reviewOpen ? setReviewOpen(false) : onOpenChange(false)
                }
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
                  cartItems.map((item) => (
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
          <div className="z-20 shrink-0 space-y-3 border-t border-slate-200 bg-white p-4 shadow-[0_-15px_30px_rgba(0,0,0,0.05)] md:p-6 dark:border-white/10 dark:bg-slate-900">
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
              className="h-12 w-full rounded-xl bg-blue-600 pr-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700 md:h-14 md:rounded-2xl"
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
