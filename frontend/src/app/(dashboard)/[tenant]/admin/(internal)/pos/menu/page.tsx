"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Search,
  ShoppingBag,
  X,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import type { FnBMenuItem } from "@/components/pos/fnb-catalog-dialog";

const formatIDR = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

export default function MenuCashierPage() {
  const { fnbMode } = useAdminSession();
  const [menuItems, setMenuItems] = useState<FnBMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/fnb")
      .then((res) => setMenuItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error("Gagal memuat menu"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          return { item, qty: cart[id], lineTotal: item.price * cart[id] };
        })
        .filter((x): x is { item: FnBMenuItem; qty: number; lineTotal: number } => Boolean(x)),
    [cart, menuItems],
  );
  const total = cartLines.reduce((s, l) => s + l.lineTotal, 0);
  const count = cartLines.reduce((s, l) => s + l.qty, 0);

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

  const pay = async () => {
    if (cartLines.length === 0) return;
    setSaving(true);
    try {
      const items = cartLines.map((l) => ({ fnb_item_id: l.item.id, quantity: l.qty }));
      const res = await api.post("/sales-orders/menu", { items });
      const orderId = res.data?.id;
      if (!orderId) throw new Error("Order gagal dibuat");
      await api.post(`/sales-orders/${orderId}/settle-cash`, { payment_method: "cash" });
      toast.success(`Lunas — ${formatIDR(total)}`);
      setCart({});
      setSheetOpen(false);
    } catch (error) {
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Gagal memproses order");
    } finally {
      setSaving(false);
    }
  };

  // Guard: kalau mode bukan standalone, arahkan ke pengaturan.
  if (fnbMode && fnbMode !== "standalone") {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
          <UtensilsCrossed className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Kasir Menu belum aktif</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Kasir Menu terpisah aktif saat Mode F&amp;B disetel ke{" "}
          <span className="font-semibold">POS Menu terpisah</span>.
        </p>
        <Link
          href="/admin/settings/menu"
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Buka pengaturan Mode F&amp;B
          <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    );
  }

  return (
    <div className="font-plus-jakarta">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur dark:border-white/10 dark:bg-[#0b0b12]/95 md:px-5">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
            <UtensilsCrossed className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Kasir Menu
            </h1>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              Walk-in F&amp;B · buku Menu (terpisah dari booking)
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
            aria-label="Refresh menu"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-0 md:grid-cols-[1fr_340px]">
        {/* Catalog */}
        <div className="min-w-0 px-3 pb-28 pt-3 md:px-5 md:pb-6">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari menu…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <div className="-mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                  category === c
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-slate-200 text-slate-500 hover:border-amber-300 dark:border-white/10 dark:text-slate-300",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Memuat menu…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400 dark:border-white/10">
              {available.length === 0 ? (
                <>
                  Belum ada menu.{" "}
                  <Link href="/admin/fnb" className="font-semibold text-blue-600">
                    Tambah di halaman Menu
                  </Link>
                  .
                </>
              ) : (
                "Menu tidak ditemukan."
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((m) => {
                const qty = cart[m.id] || 0;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => add(m.id)}
                    className={cn(
                      "relative flex flex-col items-start gap-1 rounded-2xl border bg-white p-3 text-left transition active:scale-[0.98] dark:bg-white/[0.03]",
                      qty > 0
                        ? "border-amber-500 ring-1 ring-amber-500/30"
                        : "border-slate-200 hover:border-amber-400 dark:border-white/10",
                    )}
                  >
                    {qty > 0 ? (
                      <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white">
                        {qty}
                      </span>
                    ) : null}
                    <span className="line-clamp-2 pr-6 text-[13px] font-semibold text-slate-900 dark:text-white">
                      {m.name}
                    </span>
                    <span className="text-[13px] font-bold tabular-nums text-amber-600 dark:text-amber-300">
                      {formatIDR(m.price)}
                    </span>
                    {m.category ? (
                      <span className="text-[11px] text-slate-400">{m.category}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart — desktop sidebar */}
        <aside className="hidden border-l border-slate-200 dark:border-white/10 md:block">
          <div className="sticky top-[61px] flex h-[calc(100vh-61px)] flex-col">
            <CartBody
              cartLines={cartLines}
              total={total}
              count={count}
              saving={saving}
              onAdd={add}
              onDec={dec}
              onRemove={removeLine}
              onPay={pay}
            />
          </div>
        </aside>
      </div>

      {/* Mobile: sticky cart bar */}
      {count > 0 ? (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-between gap-3 rounded-2xl bg-amber-500 px-4 py-3.5 text-white shadow-lg shadow-amber-500/25 md:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs font-bold">
              {count}
            </span>
            Lihat pesanan
          </span>
          <span className="text-base font-bold tabular-nums">{formatIDR(total)}</span>
        </button>
      ) : null}

      {/* Mobile: cart bottom sheet */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-white dark:bg-[#0f0f17]">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
              <div className="flex items-center gap-2 text-sm font-bold">
                <ShoppingBag className="h-4 w-4 text-amber-500" />
                Pesanan · {count} item
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                aria-label="Tutup"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <CartBody
              cartLines={cartLines}
              total={total}
              count={count}
              saving={saving}
              onAdd={add}
              onDec={dec}
              onRemove={removeLine}
              onPay={pay}
              hideHeader
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CartBody({
  cartLines,
  total,
  count,
  saving,
  onAdd,
  onDec,
  onRemove,
  onPay,
  hideHeader,
}: {
  cartLines: { item: FnBMenuItem; qty: number; lineTotal: number }[];
  total: number;
  count: number;
  saving: boolean;
  onAdd: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  onPay: () => void;
  hideHeader?: boolean;
}) {
  return (
    <>
      {!hideHeader ? (
        <div className="shrink-0 border-b border-slate-100 px-4 py-3.5 text-sm font-bold dark:border-white/10">
          Keranjang{count > 0 ? ` · ${count} item` : ""}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {cartLines.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Ketuk menu untuk menambah pesanan.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {cartLines.map((l) => (
              <div key={l.item.id} className="flex items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">
                    {l.item.name}
                  </div>
                  <div className="text-[11px] tabular-nums text-slate-400">
                    {formatIDR(l.item.price)} × {l.qty} = {formatIDR(l.lineTotal)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDec(l.item.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:border-white/10"
                    aria-label="Kurangi"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                  <button
                    type="button"
                    onClick={() => onAdd(l.item.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:border-white/10"
                    aria-label="Tambah"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(l.item.id)}
                    className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:text-rose-500"
                    aria-label="Hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-white/10">
        <div className="mb-3 flex items-center justify-between text-base font-bold tabular-nums">
          <span>Total</span>
          <span>{formatIDR(total)}</span>
        </div>
        <button
          type="button"
          onClick={onPay}
          disabled={cartLines.length === 0 || saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-[15px] font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {saving ? "Memproses…" : `Bayar cash ${total > 0 ? formatIDR(total) : ""}`}
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Masuk buku Menu — terpisah dari pendapatan booking.
        </p>
      </div>
    </>
  );
}
