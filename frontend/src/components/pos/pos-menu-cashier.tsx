"use client";

import { useMemo, useState } from "react";
import { UtensilsCrossed, Plus, Minus, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FnBMenuItem } from "@/components/pos/fnb-catalog-dialog";

const formatIDR = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItems: FnBMenuItem[];
  onSuccess: () => void;
};

/**
 * PosMenuCashier — kasir F&B walk-in (mode Menu standalone). Bangun keranjang
 * dari katalog menu, lalu buat order jenis "menu" (buku terpisah) dan langsung
 * settle cash. Reuse endpoint POST /sales-orders/menu + /settle-cash.
 */
export function PosMenuCashier({ open, onOpenChange, menuItems, onSuccess }: Props) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const available = useMemo(
    () => menuItems.filter((m) => m.is_available !== false),
    [menuItems],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    available.forEach((m) => set.add(m.category?.trim() || "Lainnya"));
    return ["Semua", ...Array.from(set)];
  }, [available]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return available.filter((m) => {
      const catOk = category === "Semua" || (m.category?.trim() || "Lainnya") === category;
      const qOk = !q || m.name.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [available, category, search]);

  const cartLines = useMemo(
    () =>
      Object.keys(cart)
        .map((id) => {
          const item = menuItems.find((m) => m.id === id);
          if (!item) return null;
          const qty = cart[id];
          return { item, qty, lineTotal: item.price * qty };
        })
        .filter((x): x is { item: FnBMenuItem; qty: number; lineTotal: number } => Boolean(x)),
    [cart, menuItems],
  );

  const total = cartLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const count = cartLines.reduce((sum, l) => sum + l.qty, 0);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id: string) =>
    setCart((c) => {
      const next = { ...c };
      if ((next[id] || 0) <= 1) delete next[id];
      else next[id] -= 1;
      return next;
    });
  const removeLine = (id: string) =>
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });

  const reset = () => {
    setCart({});
    setCategory("Semua");
    setSearch("");
  };

  const pay = async () => {
    if (cartLines.length === 0) return;
    setSaving(true);
    try {
      const items = cartLines.map((l) => ({ fnb_item_id: l.item.id, quantity: l.qty }));
      const res = await api.post("/sales-orders/menu", { items });
      const orderId = res.data?.id;
      if (!orderId) throw new Error("Order menu gagal dibuat");
      await api.post(`/sales-orders/${orderId}/settle-cash`, { payment_method: "cash" });
      toast.success(`Order menu lunas — ${formatIDR(total)}`);
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data
        ?.error;
      toast.error(message || "Gagal memproses order menu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (saving ? null : onOpenChange(v))}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[96vw] max-w-4xl flex-col overflow-hidden rounded-2xl p-0 font-plus-jakarta">
        <DialogHeader className="shrink-0 border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">Kasir Menu</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Walk-in F&amp;B — tercatat di buku Menu, terpisah dari booking.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_300px]">
          {/* Catalog */}
          <div className="flex min-h-0 flex-col border-b border-slate-100 md:border-b-0 md:border-r dark:border-white/10">
            <div className="shrink-0 space-y-2.5 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari menu…"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/5"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      category === c
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-slate-200 text-slate-500 hover:border-amber-300 dark:border-white/10 dark:text-slate-300",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-0">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-white/10">
                  {available.length === 0 ? "Belum ada menu. Tambah dulu di halaman Menu." : "Menu tidak ditemukan."}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {filtered.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => add(m.id)}
                      className="flex flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-amber-400 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <span className="line-clamp-2 text-[13px] font-semibold text-slate-900 dark:text-white">
                        {m.name}
                      </span>
                      <span className="text-[13px] font-bold tabular-nums text-amber-600 dark:text-amber-300">
                        {formatIDR(m.price)}
                      </span>
                      {m.category ? (
                        <span className="text-[11px] text-slate-400">{m.category}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="flex min-h-0 flex-col">
            <div className="shrink-0 border-b border-slate-100 px-4 py-3 text-sm font-bold dark:border-white/10">
              Keranjang{count > 0 ? ` · ${count} item` : ""}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {cartLines.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Ketuk menu untuk menambah ke keranjang.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {cartLines.map((l) => (
                    <div key={l.item.id} className="flex items-center gap-2 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">
                          {l.item.name}
                        </div>
                        <div className="text-[11px] tabular-nums text-slate-400">
                          {formatIDR(l.item.price)} × {l.qty}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => dec(l.item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 dark:border-white/10"
                          aria-label="Kurangi"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-[13px] font-semibold tabular-nums">{l.qty}</span>
                        <button
                          type="button"
                          onClick={() => add(l.item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 dark:border-white/10"
                          aria-label="Tambah"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(l.item.id)}
                          className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-slate-300 hover:text-rose-500"
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 border-t border-slate-100 p-4 dark:border-white/10">
              <div className="mb-3 flex items-center justify-between text-base font-bold tabular-nums">
                <span>Total</span>
                <span>{formatIDR(total)}</span>
              </div>
              <Button
                onClick={pay}
                disabled={cartLines.length === 0 || saving}
                className="h-11 w-full rounded-xl bg-amber-500 font-bold text-white hover:bg-amber-600"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? "Memproses…" : `Bayar cash ${total > 0 ? formatIDR(total) : ""}`}
              </Button>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Order masuk buku Menu — terpisah dari pendapatan booking.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
