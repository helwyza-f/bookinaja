"use client";

import { useState, useMemo } from "react";
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
  ShoppingCart,
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
  availableAddons: any[];
  onConfirmAddons: (cart: any[]) => Promise<void>;
}

export function AddonsCatalogDialog({
  open,
  onOpenChange,
  availableAddons,
  onConfirmAddons,
}: AddonsCatalogDialogProps) {
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

  const handleProcessOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirmAddons(cartItems);
      setCart({});
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* UKURAN SLIGHTLY SMALLER (max-w-5xl) dibanding F&B */}
      <DialogContent className="max-w-[95vw] lg:max-w-5xl h-[80vh] p-0 overflow-hidden rounded-[3rem] border-none shadow-3xl bg-slate-50 flex flex-col md:flex-row">
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle>Katalog Add-ons & Layanan</DialogTitle>
          </DialogHeader>
        </VisuallyHidden.Root>

        {/* --- KIRI: KATALOG ADD-ONS --- */}
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
          <div className="p-6 lg:p-10 bg-slate-950 text-white shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">
                  Add-ons <span className="text-orange-500">Inventory</span>
                </h2>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 italic">
                  Layanan & Alat Ekstra untuk Unit ini
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-slate-500 hover:text-white h-10 w-10 p-0 lg:hidden"
            >
              <X />
            </Button>
          </div>

          <ScrollArea className="flex-1 bg-slate-50/30 p-6 lg:p-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 pb-10">
              {availableAddons?.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={cn(
                    "flex justify-between items-center p-6 rounded-[2rem] transition-all group border-4 text-left",
                    cart[item.id]
                      ? "bg-white border-orange-500 shadow-xl scale-[1.02]"
                      : "bg-white border-transparent hover:border-slate-200 shadow-sm",
                  )}
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-black italic uppercase leading-none text-slate-900 block">
                      {item.name}
                    </span>
                    <span className="text-[9px] font-bold text-orange-600 uppercase">
                      Rp{formatIDR(item.price)}
                    </span>
                  </div>

                  {cart[item.id] ? (
                    <Badge className="bg-orange-500 text-white h-8 w-8 flex items-center justify-center p-0 rounded-xl font-black text-sm">
                      {cart[item.id].quantity}
                    </Badge>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                      <Plus className="w-5 h-5 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
              {(!availableAddons || availableAddons.length === 0) && (
                <div className="col-span-full py-20 text-center opacity-20 italic font-black uppercase text-xs tracking-widest">
                  Tidak ada layanan tambahan tersedia
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* --- KANAN: REVIEW ADD-ONS --- */}
        <div className="w-full md:w-[360px] bg-slate-100 border-l border-slate-200 flex flex-col h-full overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.05)]">
          <div className="p-8 bg-white border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-900">
                Review Items
              </h3>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase italic">
              Tambahan alat & layanan
            </p>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-3">
              {cartItems.length > 0 ? (
                cartItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-3xl bg-white shadow-sm flex flex-col gap-4 animate-in slide-in-from-right-4"
                  >
                    <div className="flex justify-between items-start gap-4 text-[10px] font-black uppercase italic">
                      <span className="flex-1 leading-tight">{item.name}</span>
                      <span className="text-orange-600">
                        Rp{formatIDR(item.price * item.quantity)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-1 border border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        className="h-8 w-8 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Minus className="w-3 h-3 stroke-[3]" />
                      </Button>
                      <span className="text-xs font-black italic">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addToCart(item)}
                        className="h-8 w-8 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center space-y-4 opacity-20">
                  <Package className="w-12 h-12 mx-auto text-slate-400" />
                  <p className="text-[9px] font-black uppercase italic">
                    Pilih Add-on
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-8 bg-white border-t border-slate-200 shrink-0 space-y-5 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase italic">
                  Ekstra Tagihan
                </p>
                <p className="text-3xl font-black italic tracking-tighter leading-none flex items-start">
                  <span className="text-lg text-orange-500 mr-1 mt-1">Rp</span>
                  {formatIDR(cartTotal)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCart({})}
                className={cn(
                  "text-red-400 hover:text-red-600 uppercase text-[9px] font-black italic",
                  cartItems.length === 0 && "hidden",
                )}
              >
                <Trash2 className="w-3 h-3 mr-1" />
              </Button>
            </div>

            <Button
              disabled={cartItems.length === 0 || isSubmitting}
              onClick={handleProcessOrder}
              className="w-full h-16 rounded-[1.8rem] bg-slate-900 hover:bg-black text-white font-black uppercase italic text-xs shadow-2xl gap-3 border-b-8 border-slate-800 active:border-b-0 active:translate-y-1 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  CONFIRM ADD-ONS{" "}
                  <Send className="w-4 h-4 ml-1 text-orange-500" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
