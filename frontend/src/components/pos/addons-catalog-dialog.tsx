"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Package,
  Plus,
  Minus,
  Send,
  Trash2,
  X,
  Layers,
  Loader2,
  Search,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface AddonsCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableAddons: AddonItem[];
  onConfirmAddons: (cart: AddonCartItem[]) => Promise<void>;
}

export type AddonItem = {
  id: string;
  name: string;
  price: number;
};

export type AddonCartItem = AddonItem & {
  quantity: number;
};

export function AddonsCatalogDialog({
  open,
  onOpenChange,
  availableAddons,
  onConfirmAddons,
}: AddonsCatalogDialogProps) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, AddonCartItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  const addToCart = (item: AddonItem) => {
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
  const filteredAddons = useMemo(
    () =>
      (availableAddons || []).filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [availableAddons, search],
  );

  const handleProcessOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirmAddons(cartItems);
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
        className="flex h-[92vh] max-w-[96vw] flex-col overflow-hidden rounded-3xl border bg-white p-0 shadow-2xl md:h-[85vh] md:max-w-5xl md:flex-row md:bg-slate-50 md:dark:bg-slate-950 font-plus-jakarta"
      >
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle>Katalog Add-ons & Layanan</DialogTitle>
          </DialogHeader>
        </VisuallyHidden.Root>

        {/* --- KIRI: KATALOG ADD-ONS --- */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b bg-white md:h-full md:border-b-0 md:border-r md:dark:border-white/10 md:dark:bg-slate-900">
          <div className="shrink-0 border-b border-slate-200 bg-white p-4 text-slate-950 md:border-none md:bg-slate-950 md:p-6 md:text-white lg:p-10 md:dark:border-white/10 md:dark:bg-slate-900 md:dark:text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 md:gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 md:h-12 md:w-12">
                  <Package className="h-5 w-5 text-white md:h-6 md:w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="pr-2 text-lg font-semibold leading-tight md:text-2xl">
                    Add-ons Inventory
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-500 md:text-slate-400">
                    Layanan & Alat Ekstra untuk Unit
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

            <div className="relative mt-4 group md:hidden">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-orange-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari add-on..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 bg-slate-50/30 p-4 md:p-6 lg:p-10 md:dark:bg-slate-900">
            <div className="space-y-4 pb-28 md:pb-8">
              <div className="rounded-[1.25rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900 md:hidden">
                Tambahkan layanan ekstra ke booking ini, lalu review total add-on sebelum disimpan.
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-5">
              {filteredAddons?.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "group relative flex items-center justify-between rounded-xl border p-3.5 text-left transition-all md:rounded-2xl md:p-6",
                    cart[item.id]
                      ? "border-orange-500 bg-orange-50 shadow-sm md:scale-[1.02] md:bg-white md:shadow-xl md:dark:border-orange-400 md:dark:bg-slate-800"
                      : "border-slate-200 bg-white shadow-sm md:border-transparent md:hover:border-slate-200 md:dark:border-white/5 md:dark:bg-slate-800/40 md:dark:hover:border-white/10",
                  )}
                >
                  <div className="space-y-1 pr-4">
                    <span className="block pr-1 text-[12px] font-black italic uppercase leading-tight text-slate-900 md:text-xs md:leading-none md:dark:text-white">
                      {item.name}
                    </span>
                    <span className="text-xs font-bold uppercase text-orange-600 md:text-[10px] md:dark:text-orange-500">
                      Rp{formatIDR(item.price)}
                    </span>
                  </div>

                  <div className="hidden md:block">
                    {cart[item.id] ? (
                      <Badge className="flex h-10 w-10 items-center justify-center rounded-2xl border-none bg-orange-500 p-0 text-base font-black text-white animate-in zoom-in">
                        {cart[item.id].quantity}
                      </Badge>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-300 transition-colors group-hover:bg-orange-50 group-hover:text-orange-500 md:dark:bg-slate-700 md:dark:text-slate-500 md:dark:group-hover:bg-orange-500/20">
                        <Plus className="h-5 w-5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 md:hidden">
                    <Badge className="rounded-full border-none bg-emerald-50 text-emerald-700">
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
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    className="absolute inset-0 hidden rounded-2xl md:block"
                    aria-label={`Tambah ${item.name}`}
                  />
                </div>
              ))}
              {(!filteredAddons || filteredAddons.length === 0) && (
                <div className="col-span-full py-20 text-center opacity-20 italic font-black uppercase text-xs tracking-widest dark:text-white">
                  {search ? "Tidak ada hasil" : "Tidak ada layanan tersedia"}
                </div>
              )}
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
            className="h-12 w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={() => setConfirmOpen(true)}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Review & simpan
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* --- KANAN: REVIEW ADD-ONS (STICKY & COMPACT) --- */}
        <div className="hidden md:relative md:inset-auto md:z-auto md:flex md:h-full md:w-[380px] md:flex-col md:overflow-hidden md:rounded-none md:bg-slate-100 md:shadow-[0_-10px_30px_rgba(0,0,0,0.05)] md:dark:bg-slate-950">
          {/* Header Panel Review */}
          <div className="z-20 flex shrink-0 items-center justify-between border-b bg-white p-4 md:p-6 md:dark:border-white/10 md:dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              <h3 className="pr-2 text-sm font-black uppercase italic tracking-widest text-slate-900 md:dark:text-white">
                Review Items
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm md:dark:bg-slate-800 md:dark:hover:bg-red-950/30"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Area List Pesanan (Inner Scroll) */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2 pb-10">
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
                      <span className="shrink-0 pr-1 text-[11px] font-black italic text-slate-950 md:dark:text-orange-500">
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
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 md:dark:hover:bg-red-900/30"
                        >
                          <Minus className="w-3 h-3 stroke-[3]" />
                        </button>
                        <span className="w-8 pr-0.5 text-center text-[10px] font-black italic text-slate-950 md:dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-orange-50 hover:text-orange-600 md:dark:hover:bg-orange-900/30"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-4 py-32 text-center opacity-20 md:dark:opacity-10">
                  <Package className="mx-auto h-12 w-12 text-slate-400 md:dark:text-white" />
                  <p className="pr-2 text-[10px] font-black uppercase italic tracking-widest text-slate-500 md:dark:text-white">
                    Belum ada add-on
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer Sticky (Sticky Total) */}
          <div className="z-20 shrink-0 space-y-3 border-t border-slate-200 bg-white p-4 shadow-[0_-15px_30px_rgba(0,0,0,0.05)] md:space-y-5 md:p-7 md:dark:border-white/10 md:dark:bg-slate-900">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black uppercase italic text-slate-400 md:dark:text-slate-500">
                  Ekstra Billing
                </p>
                <div className="flex items-baseline pr-2">
                  <span className="text-sm text-orange-600 mr-1 font-bold">
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
                  className="px-2 pr-3 text-[8px] font-black uppercase italic text-red-400 transition-all hover:text-red-600 md:dark:hover:bg-red-950/30"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
            </div>

            <Button
              disabled={cartItems.length === 0 || isSubmitting}
              onClick={handleProcessOrder}
              className="h-12 w-full rounded-xl bg-orange-500 pr-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-orange-600 md:h-16 md:rounded-2xl md:bg-slate-900 md:hover:bg-black md:dark:bg-blue-600 md:dark:hover:bg-blue-700"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Simpan add-on{" "}
                  <Send className="ml-1 h-4 w-4 text-white transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 md:text-orange-500 md:dark:text-white" />
                </>
              )}
            </Button>
            <p className="pr-1 text-center text-[7px] font-bold uppercase italic leading-none tracking-tighter text-slate-400 md:dark:text-slate-600">
              Review dulu, lalu tambahkan ke tagihan sesi
            </p>
          </div>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent showCloseButton={false} className="max-w-sm rounded-[1.75rem] border border-slate-200 bg-white p-0 shadow-2xl">
            <DialogHeader>
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-5">
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-slate-950">
                    Tambahkan add-on
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">
                    {cartCount} item akan ditambahkan ke booking aktif.
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
                  className="h-11 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={handleProcessOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Memproses..." : "Simpan add-on"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
