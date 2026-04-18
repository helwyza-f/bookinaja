"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X, Timer, Coffee, PlusCircle, Search, Minus, Plus } from "lucide-react";

type ControllerProps = {
  active: boolean;
  booking: any;
  menuItems: any[];
  addonItems: any[];
  onExtend: (count: number) => Promise<void>;
  onOrderFnb: (cart: any[]) => Promise<void>;
  onOrderAddon: (cart: any[]) => Promise<void>;
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
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-950 rounded-t-[2rem] sm:rounded-[2rem] max-h-[92vh] overflow-hidden shadow-2xl">
        <div className="p-4 border-b dark:border-white/5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 italic">
              Customer Live
            </p>
            <h3 className="text-lg font-[1000] uppercase italic tracking-tighter dark:text-white">
              {title}
            </h3>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        <div className="max-h-[calc(92vh-72px)] overflow-y-auto">{children}</div>
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
}: ControllerProps) {
  const [extendOpen, setExtendOpen] = useState(false);
  const [fnbOpen, setFnbOpen] = useState(false);
  const [addonOpen, setAddonOpen] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, any>>({});
  const [selectedExtend, setSelectedExtend] = useState<number>(1);

  useEffect(() => {
    if (!active) {
      setExtendOpen(false);
      setFnbOpen(false);
      setAddonOpen(false);
      setExtendError(null);
    }
  }, [active]);

  const add = (item: any) => {
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
      `${item.name} ${item.category || ""}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [menuItems, search]);

  const filteredAddons = useMemo(() => {
    return addonItems.filter((item) =>
      `${item.name}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [addonItems, search]);

  const unitDuration = Number(booking?.unit_duration || 60);
  const extOptions = [1, 2, 3, 4];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Button
          disabled={!active}
          onClick={() => setExtendOpen(true)}
          className="h-14 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black uppercase italic text-[10px] shadow-lg border border-slate-100 flex flex-col gap-1"
        >
          <Timer size={14} className="text-blue-600" />
          Tambah Jam
        </Button>
        <Button
          disabled={!active}
          onClick={() => setFnbOpen(true)}
          className="h-14 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black uppercase italic text-[10px] shadow-lg flex flex-col gap-1"
        >
          <Coffee size={14} className="text-orange-400" />
          Pesan Makan
        </Button>
        <Button
          disabled={!active}
          onClick={() => setAddonOpen(true)}
          className="h-14 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black uppercase italic text-[10px] shadow-lg border border-slate-100 flex flex-col gap-1"
        >
          <PlusCircle size={14} className="text-emerald-500" />
          Add-on
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className="rounded-full px-3 py-1 border-none bg-blue-600 text-white text-[9px] uppercase italic">
          billing live
        </Badge>
        <Badge className="rounded-full px-3 py-1 border-none bg-slate-100 text-slate-500 text-[9px] uppercase italic">
          customer mode
        </Badge>
        {extendError && (
          <Badge className="rounded-full px-3 py-1 border-none bg-amber-500 text-white text-[9px] uppercase italic">
            {extendError}
          </Badge>
        )}
      </div>

      <MobileSheet open={extendOpen} onClose={() => setExtendOpen(false)} title="Tambah Jam">
        <div className="p-4 space-y-4">
          <div className="rounded-2xl bg-blue-500/10 border border-blue-500/10 p-4 text-xs font-bold italic text-blue-700 dark:text-blue-100">
            Pilih tambahan durasi. Sistem akan menambah billing booking customer.
          </div>
          <div className="grid grid-cols-2 gap-3">
            {extOptions.map((count) => {
              const total = (Number(booking?.unit_price || 0) || 0) * count;
              return (
                <button
                  key={count}
                  onClick={() => setSelectedExtend(count)}
                  className={cn(
                    "p-4 rounded-2xl border text-left",
                    selectedExtend === count
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20"
                      : "border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900",
                  )}
                >
                  <p className="text-[10px] font-black uppercase italic text-slate-400">
                    +{count} {unitDuration === 60 ? "Jam" : "Sesi"}
                  </p>
                  <p className="mt-2 text-sm font-[1000] italic dark:text-white">
                    Rp {total.toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>
          <Button
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic"
            onClick={async () => {
              try {
                await onExtend(selectedExtend);
                setExtendError(null);
                setExtendOpen(false);
              } catch (err: any) {
                const message = String(err?.response?.data?.error || err?.message || "");
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

      <MobileSheet open={fnbOpen} onClose={() => setFnbOpen(false)} title="Pesan Makan">
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
          <div className="space-y-3">
            {filteredMenu.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black uppercase italic text-sm dark:text-white">{item.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{item.category}</p>
                  </div>
                  <p className="font-black italic text-blue-600">Rp {Number(item.price || 0).toLocaleString()}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => remove(item.id)} className="h-8 w-8 rounded-xl border border-slate-200 dark:border-white/5"> <Minus className="mx-auto w-4 h-4" /> </button>
                    <span className="w-8 text-center font-black">{cart[item.id]?.quantity || 0}</span>
                    <button onClick={() => add(item)} className="h-8 w-8 rounded-xl bg-blue-600 text-white"> <Plus className="mx-auto w-4 h-4" /> </button>
                  </div>
                  <Badge className="rounded-full bg-orange-500 text-white border-none">
                    live billing
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <Button
            disabled={cartItems.length === 0}
            className="w-full h-14 rounded-2xl bg-slate-950 text-white font-black uppercase italic"
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

      <MobileSheet open={addonOpen} onClose={() => setAddonOpen(false)} title="Add-on">
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
          <div className="space-y-3">
            {filteredAddons.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black uppercase italic text-sm dark:text-white">{item.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">addon resource</p>
                  </div>
                  <p className="font-black italic text-emerald-600">Rp {Number(item.price || 0).toLocaleString()}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => remove(item.id)} className="h-8 w-8 rounded-xl border border-slate-200 dark:border-white/5"> <Minus className="mx-auto w-4 h-4" /> </button>
                    <span className="w-8 text-center font-black">{cart[item.id]?.quantity || 0}</span>
                    <button onClick={() => add(item)} className="h-8 w-8 rounded-xl bg-emerald-600 text-white"> <Plus className="mx-auto w-4 h-4" /> </button>
                  </div>
                  <Badge className="rounded-full bg-emerald-500 text-white border-none">
                    billing live
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <Button
            disabled={cartItems.length === 0}
            className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-black uppercase italic"
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
