"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  ChevronRight,
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
  const [confirmOpen, setConfirmOpen] = useState(false);

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
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
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
      setConfirmOpen(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[92vh] max-w-[96vw] flex-col overflow-hidden rounded-3xl border bg-white p-0 shadow-2xl md:h-[96vh] md:max-w-[96vw] md:flex-row md:bg-slate-50 md:dark:bg-slate-950"
      >
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle>Katalog Menu F&B</DialogTitle>
          </DialogHeader>
        </VisuallyHidden.Root>

        {/* --- KIRI: KATALOG MENU --- */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b bg-white md:h-full md:border-b-0 md:border-r md:dark:border-white/10 md:dark:bg-slate-900">
          <div className="shrink-0 border-b border-slate-200 bg-white p-4 text-slate-950 md:border-none md:bg-slate-950 md:p-6 md:text-white lg:p-8 md:dark:border-white/10 md:dark:bg-slate-900 md:dark:text-white">
            <div className="mb-4 flex items-start justify-between gap-3 lg:mb-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 md:h-12 md:w-12">
                  <Utensils className="h-5 w-5 text-white md:h-6 md:w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="pr-2 text-lg font-semibold leading-tight md:text-2xl">
                    Menu Katalog
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-500 md:text-slate-400">
                    Tap menu untuk tambah ke keranjang
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-10 w-10 shrink-0 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 md:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
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
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-900 md:border-white/10 md:bg-white/5 md:text-slate-400 md:hover:text-white",
                    )}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
            </div>

            <div className="relative mt-4 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <Input
                placeholder="Cari Menu (Kopi, Mie Goreng, dll)..."
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 pl-12 text-sm font-medium text-slate-950 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 md:h-14 md:rounded-2xl md:border-none md:bg-white/5 md:text-white md:placeholder:text-slate-600"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 bg-slate-50/50 md:dark:bg-slate-900">
            <div className="space-y-4 p-4 pb-28 md:p-6 md:pb-8">
              <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 md:hidden">
                Pilih menu lalu review keranjang. Pesanan akan langsung masuk ke tagihan booking aktif.
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "group relative flex flex-col rounded-xl border p-3.5 text-left transition-all md:rounded-2xl md:p-5",
                    cart[item.id]
                      ? "border-blue-600 bg-blue-50 shadow-sm md:bg-white md:shadow-xl md:scale-[1.02] md:dark:border-blue-500 md:dark:bg-slate-800"
                      : "border-slate-200 bg-white shadow-sm md:border-transparent md:hover:border-slate-200 md:dark:border-white/5 md:dark:bg-slate-800/40 md:dark:hover:border-white/10",
                  )}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <span className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 md:dark:text-white/60">
                      {item.category}
                    </span>
                    {cart[item.id] && (
                      <Badge className="h-5 min-w-5 rounded-full border-none bg-blue-600 px-1.5 text-white animate-in zoom-in">
                        {cart[item.id].quantity}
                      </Badge>
                    )}
                  </div>
                  <span className="pr-1 text-[12px] font-black italic uppercase leading-tight line-clamp-2 text-slate-950 md:mb-3 md:text-[11px] md:dark:text-white">
                    {item.name}
                  </span>
                  <span className="mt-2 text-sm font-black tracking-tight text-blue-600 md:mt-auto md:text-xs md:tracking-tighter md:dark:text-blue-400">
                    Rp{formatIDR(item.price)}
                  </span>
                  <div className="mt-3 flex items-center justify-between md:hidden">
                    <Badge className="rounded-full border-none bg-blue-50 text-blue-700">
                      {cart[item.id]?.quantity || 0} dipilih
                    </Badge>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-1 py-1">
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        disabled={!cart[item.id]}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 disabled:opacity-30"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[20px] text-center text-sm font-semibold text-slate-700">
                        {cart[item.id]?.quantity || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    className="absolute inset-0 hidden rounded-[2rem] md:block"
                    aria-label={`Tambah ${item.name}`}
                  />
                  <div className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-[2rem] bg-blue-600/0 transition-colors group-hover:bg-blue-600/5 md:flex">
                    <Plus className="h-8 w-8 text-blue-600 opacity-0 transition-opacity group-hover:opacity-20" />
                  </div>
                </div>
              ))}
              </div>

            </div>
          </ScrollArea>
        </div>

        <div className="shrink-0 space-y-3 border-t border-slate-200 bg-white p-4 md:hidden">
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{cartCount} item dipilih</span>
              <span className="font-semibold text-slate-950">
                Rp {formatIDR(cartTotal)}
              </span>
            </div>
          </div>
          <Button
            disabled={cartItems.length === 0 || isSubmitting}
            className="h-12 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500"
            onClick={() => setConfirmOpen(true)}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Review & kirim
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* --- KANAN: REVIEW PESANAN (FIXED/STICKY PANEL) --- */}
        <div className="hidden md:relative md:inset-auto md:z-auto md:flex md:h-full md:w-[420px] md:flex-col md:overflow-hidden md:rounded-none md:bg-slate-100 md:shadow-[0_-10px_30px_rgba(0,0,0,0.05)] md:dark:bg-slate-950">
          {/* Header Review dengan Tombol Close */}
          <div className="z-20 shrink-0 border-b bg-white p-4 md:p-6 md:dark:border-white/10 md:dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600 md:dark:text-blue-400" />
                <h3 className="pr-2 text-sm font-black uppercase italic tracking-widest text-slate-950 md:dark:text-white">
                  Review Order
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-10 w-10 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm md:dark:bg-slate-800 md:dark:hover:bg-red-950/30"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Area Item (Inner Scroll) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
            <div className="space-y-2 p-4 pb-10">
                {cartItems.length > 0 ? (
                  cartItems.map((item) => (
                    <div
                      key={item.id}
                    className="animate-in slide-in-from-right-4 rounded-2xl border bg-white px-4 py-3 shadow-sm transition-all md:dark:border-white/5 md:dark:bg-slate-900"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <span className="block truncate pr-2 text-[10px] font-black uppercase italic leading-tight text-slate-950 md:dark:text-white">
                            {item.name}
                          </span>
                        </div>
                        <span className="shrink-0 pr-1 text-[11px] font-black italic text-slate-950 md:dark:text-blue-400">
                          Rp{formatIDR(item.price * item.quantity)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[8px] font-bold uppercase text-slate-400 md:dark:text-slate-500">
                          @ Rp{formatIDR(item.price)}
                        </span>

                        <div className="ml-auto flex items-center rounded-xl border bg-slate-50 p-0.5 md:dark:border-white/5 md:dark:bg-slate-800">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 md:dark:hover:bg-red-950/30"
                          >
                            <Minus className="w-3 h-3 stroke-[3]" />
                          </button>
                          <span className="w-8 pr-0.5 text-center text-[10px] font-black italic text-slate-950 md:dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 md:dark:hover:bg-blue-900/30"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-4 py-32 text-center opacity-20 md:dark:opacity-10">
                    <ShoppingCart className="mx-auto h-12 w-12 text-slate-400 md:dark:text-white" />
                    <p className="pr-2 text-[10px] font-black uppercase italic tracking-[0.2em] text-slate-500 md:dark:text-white">
                      Keranjang Kosong
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Footer Sticky (Tetap di Bawah) */}
          <div className="z-20 shrink-0 space-y-3 border-t border-slate-200 bg-white p-4 shadow-[0_-15px_30px_rgba(0,0,0,0.05)] md:p-6 md:dark:border-white/10 md:dark:bg-slate-900">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black uppercase italic text-slate-400 md:dark:text-slate-500">
                  Total Bill
                </p>
                <div className="flex items-baseline pr-2">
                  <span className="mr-1 text-xs font-bold text-blue-600 md:dark:text-blue-400">
                    Rp
                  </span>
                  <span className="text-3xl font-black italic tracking-tighter text-slate-950 md:dark:text-white">
                    {formatIDR(cartTotal)}
                  </span>
                </div>
              </div>

              {cartItems.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setCart({})}
                  className="h-8 px-2 pr-3 text-[8px] font-black uppercase italic text-red-400 transition-all hover:text-red-600 md:dark:hover:bg-red-950/30"
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
                  Kirim ke booking{" "}
                  <Send className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
            <p className="pr-1 text-center text-[7px] font-bold uppercase italic leading-none tracking-tighter text-slate-400 md:dark:text-slate-600">
              Review dulu, lalu kirim ke billing sesi aktif
            </p>
          </div>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent showCloseButton={false} className="max-w-sm rounded-[1.75rem] border border-slate-200 bg-white p-0 shadow-2xl">
            <DialogHeader>
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-5">
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-slate-950">
                    Kirim pesanan F&B
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">
                    {cartCount} item akan masuk ke booking aktif.
                  </DialogDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-2xl bg-slate-100 text-slate-500"
                  onClick={() => setConfirmOpen(false)}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-4 px-5 py-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{cartCount} item</span>
                <span className="text-xl font-bold tracking-tight text-slate-950">
                  Rp {formatIDR(cartTotal)}
                </span>
              </div>
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3 py-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.quantity}x</p>
                    </div>
                    <span className="shrink-0 font-semibold text-slate-950">
                      Rp {formatIDR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-2xl border-slate-200"
                  onClick={() => setConfirmOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-500"
                  onClick={handleProcessOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Memproses..." : "Kirim pesanan"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
