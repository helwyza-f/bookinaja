"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  X,
  Timer,
  Coffee,
  PlusCircle,
  Search,
  Minus,
  Plus,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";

type CatalogItem = {
  id: string;
  name: string;
  category?: string;
  price?: number;
  unit_price?: number;
  quantity?: number;
};

type BookingLite = {
  unit_duration?: number;
  unit_price?: number;
};

type ApiError = {
  response?: { data?: { error?: string } };
  message?: string;
};

type ControllerProps = {
  active: boolean;
  booking: BookingLite;
  menuItems: CatalogItem[];
  addonItems: CatalogItem[];
  onExtend: (count: number) => Promise<void>;
  onOrderFnb: (cart: CatalogItem[]) => Promise<void>;
  onOrderAddon: (cart: CatalogItem[]) => Promise<void>;
  onComplete?: () => void;
};

function MobileSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-950 rounded-t-[2rem] sm:rounded-[2rem] max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 pb-safe">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-12 bg-slate-200 dark:bg-white/20 rounded-full" />
        </div>
        <div className="p-4 sm:pt-6 border-b dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 italic">
              Customer Live
            </p>
            <h3 className="text-lg font-[1000] uppercase italic tracking-tighter dark:text-white">
              {title}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-slate-100 dark:bg-white/10 shrink-0"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        </div>
        <div className="overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

export function BookingLiveController({
  active,
  booking,
  menuItems,
  addonItems,
  onExtend,
  onOrderFnb,
  onOrderAddon,
  onComplete,
}: ControllerProps) {
  const [extendOpen, setExtendOpen] = useState(false);
  const [fnbOpen, setFnbOpen] = useState(false);
  const [addonOpen, setAddonOpen] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, CatalogItem & { quantity: number }>>({});
  const [selectedExtend, setSelectedExtend] = useState<number>(1);

  useEffect(() => {
    if (!extendError) return;
    toast.error(extendError, {
      description:
        extendError === "MAX SESSION REACHED"
          ? "Sesi booking sudah mencapai batas maksimal pada hari ini."
          : "Coba lagi atau hubungi admin tenant jika masalah berlanjut.",
    });
  }, [extendError]);

  const add = (item: CatalogItem) => {
    setCart((prev) => ({
      ...prev,
      [item.id]: { ...item, quantity: (prev[item.id]?.quantity || 0) + 1 },
    }));
  };

  const remove = (id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (!next[id]) return prev;
      if (next[id].quantity > 1) next[id].quantity -= 1;
      else delete next[id];
      return next;
    });
  };

  const cartItems = Object.values(cart);

  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) =>
      `${item.name} ${item.category || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [menuItems, search]);

  const filteredAddons = useMemo(() => {
    return addonItems.filter((item) =>
      `${item.name}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [addonItems, search]);

  const unitDuration = Number(booking?.unit_duration || 60);
  const extOptions = [1, 2, 3, 4];
  const formatIDR = (value: number) => new Intl.NumberFormat("id-ID").format(Number(value || 0));
  const totalCart = cartItems.reduce((sum, item) => sum + Number(item.price || item.unit_price || 0) * Number(item.quantity || 0), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={!active}
          onClick={() => setExtendOpen(true)}
          variant="outline"
          className="h-12 rounded-xl justify-start gap-2 text-xs font-semibold"
        >
          <Timer size={16} className="text-blue-600" />
          Tambah Jam
        </Button>
        <Button
          disabled={!active}
          onClick={() => setFnbOpen(true)}
          variant="outline"
          className="h-12 rounded-xl justify-start gap-2 text-xs font-semibold"
        >
          <Coffee size={16} className="text-orange-500" />
          Pesan Makan
        </Button>
        <Button
          disabled={!active}
          onClick={() => setAddonOpen(true)}
          variant="outline"
          className="h-12 rounded-xl justify-start gap-2 text-xs font-semibold"
        >
          <PlusCircle size={16} className="text-emerald-500" />
          Add-on
        </Button>
        <Button
          disabled={!active}
          onClick={onComplete}
          className="h-12 rounded-xl justify-start gap-2 bg-slate-950 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <ReceiptText size={16} />
          Akhiri Sesi
        </Button>
      </div>

      <MobileSheet
        open={extendOpen}
        onClose={() => setExtendOpen(false)}
        title="Tambah Jam"
      >
        <div className="p-4 space-y-4">
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm leading-6 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
            Pilih tambahan durasi. Sistem akan menambah billing booking
            customer.
          </div>
          <div className="grid grid-cols-2 gap-3">
            {extOptions.map((count) => {
              const total = (Number(booking?.unit_price || 0) || 0) * count;
              return (
                <button
                  key={count}
                  onClick={() => setSelectedExtend(count)}
                  className={cn(
                    "p-4 rounded-xl border text-left",
                    selectedExtend === count
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20"
                      : "border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900",
                  )}
                >
                  <p className="text-xs font-semibold text-slate-500">
                    +{count} {unitDuration === 60 ? "Jam" : "Sesi"}
                  </p>
                  <p className="mt-2 text-base font-semibold dark:text-white">
                    Rp {formatIDR(total)}
                  </p>
                </button>
              );
            })}
          </div>
          <Button
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            onClick={async () => {
              try {
                await onExtend(selectedExtend);
                setExtendError(null);
                setExtendOpen(false);
              } catch (error) {
                const err = error as ApiError;
                const message = String(
                  err?.response?.data?.error || err?.message || "",
                );
                if (message.toLowerCase().includes("max extension")) {
                  setExtendError("MAX SESSION REACHED");
                } else {
                  setExtendError("EXTEND GAGAL");
                }
              }
            }}
          >
            Konfirmasi Tambah Jam
          </Button>
        </div>
      </MobileSheet>

      <MobileSheet
        open={fnbOpen}
        onClose={() => setFnbOpen(false)}
        title="Pesan Makan"
      >
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari menu..."
              className="pl-11 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none"
            />
          </div>
          <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-1">
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black uppercase italic text-sm dark:text-white">
                      {item.name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                      {item.category}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-blue-600">
                    Rp {formatIDR(Number(item.price || 0))}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => remove(item.id)}
                      className="h-8 w-8 rounded-xl border border-slate-200 dark:border-white/5"
                    >
                      {" "}
                      <Minus className="mx-auto w-4 h-4" />{" "}
                    </button>
                    <span className="w-8 text-center font-black">
                      {cart[item.id]?.quantity || 0}
                    </span>
                    <button
                      onClick={() => add(item)}
                      className="h-8 w-8 rounded-xl bg-blue-600 text-white"
                    >
                      {" "}
                      <Plus className="mx-auto w-4 h-4" />{" "}
                    </button>
                  </div>
                  <Badge className="rounded-full bg-orange-500 text-white border-none">
                    live billing
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          {cartItems.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total pesanan</span>
                <span className="font-semibold text-slate-950 dark:text-white">Rp {formatIDR(totalCart)}</span>
              </div>
            </div>
          )}
          <Button
            disabled={cartItems.length === 0}
            className="w-full h-12 rounded-xl bg-slate-950 text-white font-semibold"
            onClick={async () => {
              await onOrderFnb(cartItems);
              setCart({});
              setFnbOpen(false);
            }}
          >
            Kirim Pesanan
          </Button>
        </div>
      </MobileSheet>

      <MobileSheet
        open={addonOpen}
        onClose={() => setAddonOpen(false)}
        title="Add-on"
      >
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari addon..."
              className="pl-11 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none"
            />
          </div>
          <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-1">
            {filteredAddons.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black uppercase italic text-sm dark:text-white">
                      {item.name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                      addon resource
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-emerald-600">
                    Rp {formatIDR(Number(item.price || 0))}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => remove(item.id)}
                      className="h-8 w-8 rounded-xl border border-slate-200 dark:border-white/5"
                    >
                      {" "}
                      <Minus className="mx-auto w-4 h-4" />{" "}
                    </button>
                    <span className="w-8 text-center font-black">
                      {cart[item.id]?.quantity || 0}
                    </span>
                    <button
                      onClick={() => add(item)}
                      className="h-8 w-8 rounded-xl bg-emerald-600 text-white"
                    >
                      {" "}
                      <Plus className="mx-auto w-4 h-4" />{" "}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {cartItems.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total add-on</span>
                <span className="font-semibold text-slate-950 dark:text-white">Rp {formatIDR(totalCart)}</span>
              </div>
            </div>
          )}
          <Button
            disabled={cartItems.length === 0}
            className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold"
            onClick={async () => {
              await onOrderAddon(cartItems);
              setCart({});
              setAddonOpen(false);
            }}
          >
            Simpan Add-on
          </Button>
        </div>
      </MobileSheet>
    </div>
  );
}
