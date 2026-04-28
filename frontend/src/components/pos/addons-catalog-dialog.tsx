"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
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
  const [cart, setCart] = useState<Record<string, AddonCartItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

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
  const cartTotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  const handleProcessOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirmAddons(cartItems);
      setCart({});
      setReviewOpen(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-[96vw] flex-col overflow-hidden rounded-3xl border bg-slate-50 p-0 shadow-2xl md:h-[85vh] md:max-w-5xl md:flex-row dark:bg-slate-950 font-plus-jakarta">
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle>Katalog Add-ons & Layanan</DialogTitle>
          </DialogHeader>
        </VisuallyHidden.Root>

        {/* --- KIRI: KATALOG ADD-ONS --- */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b bg-white md:h-full md:border-b-0 md:border-r dark:border-white/10 dark:bg-slate-900">
          <div className="shrink-0 bg-slate-950 p-4 text-white md:p-6 lg:p-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 md:h-12 md:w-12">
                  <Package className="h-5 w-5 text-white md:h-6 md:w-6" />
                </div>
                <div>
                  <h2 className="pr-2 text-lg font-semibold leading-tight md:text-2xl">
                    Add-ons Inventory
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Layanan & Alat Ekstra untuk Unit
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-slate-50/30 p-4 md:p-6 lg:p-10 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-3 pb-8 sm:grid-cols-2 md:gap-5">
              {availableAddons?.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={cn(
                    "group relative flex items-center justify-between rounded-2xl border p-4 text-left transition-all md:p-6",
                    cart[item.id]
                      ? "bg-white dark:bg-slate-800 border-orange-500 shadow-xl scale-[1.02]"
                      : "bg-white dark:bg-slate-800/40 border-transparent dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 shadow-sm",
                  )}
                >
                  <div className="space-y-1 pr-4">
                    <span className="text-xs font-black italic uppercase leading-none text-slate-900 dark:text-white block pr-1">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-500 uppercase">
                      Rp{formatIDR(item.price)}
                    </span>
                  </div>

                  {cart[item.id] ? (
                    <Badge className="bg-orange-500 text-white h-10 w-10 flex items-center justify-center p-0 rounded-2xl font-black text-base border-none animate-in zoom-in">
                      {cart[item.id].quantity}
                    </Badge>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-500 group-hover:bg-orange-50 dark:group-hover:bg-orange-500/20 group-hover:text-orange-500 transition-colors">
                      <Plus className="w-5 h-5 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
              {(!availableAddons || availableAddons.length === 0) && (
                <div className="col-span-full py-20 text-center opacity-20 italic font-black uppercase text-xs tracking-widest dark:text-white">
                  Tidak ada layanan tersedia
                </div>
              )}
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
              <Layers className="h-4 w-4" />
              {cartItems.length} item
            </span>
            <span className="font-semibold text-orange-600">
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

        {/* --- KANAN: REVIEW ADD-ONS (STICKY & COMPACT) --- */}
        <div
          className={cn(
            "fixed inset-x-3 bottom-3 top-auto z-50 hidden max-h-[78vh] flex-col overflow-hidden rounded-3xl bg-slate-100 shadow-2xl md:relative md:inset-auto md:z-auto md:flex md:h-full md:w-[380px] md:rounded-none md:shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:bg-slate-950",
            reviewOpen && "flex md:flex",
          )}
        >
          {/* Header Panel Review */}
          <div className="z-20 flex shrink-0 items-center justify-between border-b bg-white p-4 md:p-6 dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-900 dark:text-white pr-2">
                Review Items
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                reviewOpen ? setReviewOpen(false) : onOpenChange(false)
              }
              className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-all shadow-sm"
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
                    className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border dark:border-white/5 animate-in slide-in-from-right-4 transition-all"
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black uppercase italic leading-tight block pr-2 dark:text-white truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-black italic text-slate-950 dark:text-orange-500 shrink-0 pr-1">
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
                          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors text-slate-400"
                        >
                          <Minus className="w-3 h-3 stroke-[3]" />
                        </button>
                        <span className="w-8 text-center text-[10px] font-black italic dark:text-white pr-0.5">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600 transition-colors text-slate-400"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-32 text-center space-y-4 opacity-20 dark:opacity-10">
                  <Package className="w-12 h-12 mx-auto text-slate-400 dark:text-white" />
                  <p className="text-[10px] font-black uppercase italic tracking-widest dark:text-white pr-2">
                    Belum ada add-on
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer Sticky (Sticky Total) */}
          <div className="z-20 shrink-0 space-y-3 border-t border-slate-200 bg-white p-4 shadow-[0_-15px_30px_rgba(0,0,0,0.05)] md:space-y-5 md:p-7 dark:border-white/10 dark:bg-slate-900">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase italic">
                  Ekstra Billing
                </p>
                <div className="flex items-baseline pr-2">
                  <span className="text-sm text-orange-600 mr-1 font-bold">
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
                  className="text-red-400 hover:text-red-600 dark:hover:bg-red-950/30 uppercase text-[8px] font-black italic transition-all px-2 pr-3"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
            </div>

            <Button
              disabled={cartItems.length === 0 || isSubmitting}
              onClick={handleProcessOrder}
              className="h-12 w-full rounded-xl bg-slate-900 pr-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-black md:h-16 md:rounded-2xl dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Confirm Add-ons{" "}
                  <Send className="w-4 h-4 ml-1 text-orange-500 dark:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </Button>
            <p className="text-[7px] text-center text-slate-400 dark:text-slate-600 font-bold uppercase italic tracking-tighter leading-none pr-1">
              Add-ons akan langsung ditambahkan ke tagihan sesi
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
