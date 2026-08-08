"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Search,
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

type Source = "menu" | "prod";

type CatalogItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
  resourceId?: string; // hanya untuk produk (grouping order per resource)
};

export default function KasirPage() {
  const { fnbMode } = useAdminSession();
  const [source, setSource] = useState<Source>("menu");
  const [menuItems, setMenuItems] = useState<CatalogItem[]>([]);
  const [prodItems, setProdItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({}); // key: `${source}:${id}`
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([api.get("/fnb"), api.get("/admin/resources/pos-catalog")])
      .then(([fnbRes, catRes]) => {
        const fnb: FnBMenuItem[] =
          fnbRes.status === "fulfilled" && Array.isArray(fnbRes.value.data)
            ? fnbRes.value.data
            : [];
        setMenuItems(
          fnb
            .filter((m) => m.is_available !== false)
            .map((m) => ({ id: m.id, name: m.name, price: m.price, category: m.category })),
        );

        const resources =
          catRes.status === "fulfilled" ? catRes.value.data?.items || catRes.value.data || [] : [];
        const prod: CatalogItem[] = [];
        (Array.isArray(resources) ? resources : []).forEach((r: Record<string, unknown>) => {
          const mode = String(r.operating_mode || "").toLowerCase();
          if (mode !== "direct_sale" && mode !== "hybrid") return;
          const items = (r.available_items as Record<string, unknown>[]) || [];
          items.forEach((it) => {
            prod.push({
              id: String(it.id),
              name: String(it.name || "-"),
              price: Number(it.price || 0),
              category: String(r.resource_name || "Produk"),
              resourceId: String(r.resource_id),
            });
          });
        });
        setProdItems(prod);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeItems = source === "menu" ? menuItems : prodItems;
  const catalogById = useMemo(() => {
    const map: Record<string, CatalogItem> = {};
    [...menuItems, ...prodItems].forEach((it) => {
      map[`${it.resourceId ? "prod" : "menu"}:${it.id}`] = it;
    });
    return map;
  }, [menuItems, prodItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    activeItems.forEach((m) => set.add(m.category?.trim() || "Lainnya"));
    return ["Semua", ...Array.from(set)];
  }, [activeItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeItems.filter((m) => {
      const catOk = category === "Semua" || (m.category?.trim() || "Lainnya") === category;
      const qOk = !q || m.name.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [activeItems, category, search]);

  const cartLines = useMemo(
    () =>
      Object.keys(cart)
        .filter((k) => k.startsWith(`${source}:`))
        .map((k) => {
          const item = catalogById[k];
          if (!item) return null;
          return { key: k, item, qty: cart[k], lineTotal: item.price * cart[k] };
        })
        .filter((x): x is { key: string; item: CatalogItem; qty: number; lineTotal: number } =>
          Boolean(x),
        ),
    [cart, catalogById, source],
  );
  const total = cartLines.reduce((s, l) => s + l.lineTotal, 0);
  const count = cartLines.reduce((s, l) => s + l.qty, 0);

  const key = (id: string) => `${source}:${id}`;
  const add = (id: string) => setCart((c) => ({ ...c, [key(id)]: (c[key(id)] || 0) + 1 }));
  const decKey = (k: string) =>
    setCart((c) => {
      const next = { ...c };
      if ((next[k] || 0) <= 1) delete next[k];
      else next[k] -= 1;
      return next;
    });
  const addKey = (k: string) => setCart((c) => ({ ...c, [k]: (c[k] || 0) + 1 }));
  const removeKey = (k: string) =>
    setCart((c) => {
      const next = { ...c };
      delete next[k];
      return next;
    });

  const switchSource = (next: Source) => {
    setSource(next);
    setCategory("Semua");
    setSearch("");
  };

  const pay = async () => {
    if (cartLines.length === 0) return;
    setSaving(true);
    try {
      if (source === "menu") {
        const items = cartLines.map((l) => ({ fnb_item_id: l.item.id, quantity: l.qty }));
        const res = await api.post("/sales-orders/menu", { items });
        await api.post(`/sales-orders/${res.data?.id}/settle-cash`, { payment_method: "cash" });
      } else {
        // Group per resource (satu order per resource direct-sale).
        const groups: Record<string, { resource_item_id: string; quantity: number }[]> = {};
        cartLines.forEach((l) => {
          const rid = l.item.resourceId || "";
          if (!groups[rid]) groups[rid] = [];
          groups[rid].push({ resource_item_id: l.item.id, quantity: l.qty });
        });
        for (const rid of Object.keys(groups)) {
          const res = await api.post("/sales-orders/direct", {
            resource_id: rid,
            items: groups[rid],
          });
          await api.post(`/sales-orders/${res.data?.id}/settle-cash`, { payment_method: "cash" });
        }
      }
      toast.success(`Lunas — ${formatIDR(total)}`);
      setCart((c) => {
        const next = { ...c };
        Object.keys(next)
          .filter((k) => k.startsWith(`${source}:`))
          .forEach((k) => delete next[k]);
        return next;
      });
      setSheetOpen(false);
    } catch (error) {
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Gagal memproses order");
    } finally {
      setSaving(false);
    }
  };

  // Guard: Kasir aktif saat mode standalone.
  if (fnbMode && fnbMode !== "standalone") {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
          <ShoppingBag className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Kasir belum aktif</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Kasir general aktif saat Mode F&amp;B disetel ke{" "}
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

  const accent = source === "menu" ? "amber" : "blue";
  const bookLabel = source === "menu" ? "buku Menu" : "buku Produk / direct sale";

  return (
    <div className="font-plus-jakarta">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur dark:border-white/10 dark:bg-[#0b0b12]/95 md:px-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white",
                accent === "amber" ? "bg-amber-500" : "bg-blue-600",
              )}
            >
              {source === "menu" ? (
                <UtensilsCrossed className="h-5 w-5" />
              ) : (
                <ShoppingBag className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Kasir
              </h1>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                Jual cepat · masuk {bookLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 md:hidden"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>

          {/* Segment */}
          <div className="flex items-center gap-2 md:ml-auto">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.03]">
              {(
                [
                  { v: "menu", label: "Menu", dot: "bg-amber-500" },
                  { v: "prod", label: "Produk / Rental", dot: "bg-blue-500" },
                ] as const
              ).map((s) => (
                <button
                  key={s.v}
                  type="button"
                  onClick={() => switchSource(s.v)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                    source === s.v
                      ? s.v === "menu"
                        ? "bg-amber-500 text-white"
                        : "bg-blue-600 text-white"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", source === s.v ? "bg-white/70" : s.dot)} />
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={load}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 md:flex"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-[1fr_340px]">
        {/* Catalog */}
        <div className="min-w-0 px-3 pb-28 pt-3 md:px-5 md:pb-6">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={source === "menu" ? "Cari menu…" : "Cari produk / rental…"}
              className={cn(
                "h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none dark:border-white/10 dark:bg-white/5",
                accent === "amber" ? "focus:border-amber-400" : "focus:border-blue-400",
              )}
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
                    ? accent === "amber"
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-300",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Memuat katalog…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400 dark:border-white/10">
              {activeItems.length === 0 ? (
                source === "menu" ? (
                  <>
                    Belum ada menu.{" "}
                    <Link href="/admin/fnb" className="font-semibold text-blue-600">
                      Tambah di halaman Menu
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Belum ada produk direct-sale.{" "}
                    <Link href="/admin/resources" className="font-semibold text-blue-600">
                      Atur di Resources
                    </Link>
                    .
                  </>
                )
              ) : (
                "Tidak ditemukan."
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((m) => {
                const qty = cart[key(m.id)] || 0;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => add(m.id)}
                    className={cn(
                      "relative flex flex-col items-start gap-1 rounded-2xl border bg-white p-3 text-left transition active:scale-[0.98] dark:bg-white/[0.03]",
                      qty > 0
                        ? accent === "amber"
                          ? "border-amber-500 ring-1 ring-amber-500/30"
                          : "border-blue-600 ring-1 ring-blue-600/30"
                        : "border-slate-200 dark:border-white/10",
                    )}
                  >
                    {qty > 0 ? (
                      <span
                        className={cn(
                          "absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white",
                          accent === "amber" ? "bg-amber-500" : "bg-blue-600",
                        )}
                      >
                        {qty}
                      </span>
                    ) : null}
                    <span className="line-clamp-2 pr-6 text-[13px] font-semibold text-slate-900 dark:text-white">
                      {m.name}
                    </span>
                    <span
                      className={cn(
                        "text-[13px] font-bold tabular-nums",
                        accent === "amber"
                          ? "text-amber-600 dark:text-amber-300"
                          : "text-blue-700 dark:text-blue-300",
                      )}
                    >
                      {formatIDR(m.price)}
                    </span>
                    {m.category ? <span className="text-[11px] text-slate-400">{m.category}</span> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop cart */}
        <aside className="hidden border-l border-slate-200 dark:border-white/10 md:block">
          <div className="sticky top-[61px] flex h-[calc(100vh-61px)] flex-col">
            <CartBody
              accent={accent}
              bookLabel={bookLabel}
              cartLines={cartLines}
              total={total}
              count={count}
              saving={saving}
              onAdd={addKey}
              onDec={decKey}
              onRemove={removeKey}
              onPay={pay}
            />
          </div>
        </aside>
      </div>

      {/* Mobile cart bar */}
      {count > 0 ? (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(
            "fixed inset-x-3 bottom-3 z-30 flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-white shadow-lg md:hidden",
            accent === "amber" ? "bg-amber-500 shadow-amber-500/25" : "bg-blue-600 shadow-blue-600/25",
          )}
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

      {/* Mobile bottom sheet */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-white dark:bg-[#0f0f17]">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
              <div className="flex items-center gap-2 text-sm font-bold">
                <ShoppingBag className={cn("h-4 w-4", accent === "amber" ? "text-amber-500" : "text-blue-600")} />
                Pesanan · {count} item
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <CartBody
              accent={accent}
              bookLabel={bookLabel}
              cartLines={cartLines}
              total={total}
              count={count}
              saving={saving}
              onAdd={addKey}
              onDec={decKey}
              onRemove={removeKey}
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
  accent,
  bookLabel,
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
  accent: "amber" | "blue";
  bookLabel: string;
  cartLines: { key: string; item: CatalogItem; qty: number; lineTotal: number }[];
  total: number;
  count: number;
  saving: boolean;
  onAdd: (k: string) => void;
  onDec: (k: string) => void;
  onRemove: (k: string) => void;
  onPay: () => void;
  hideHeader?: boolean;
}) {
  return (
    <>
      {!hideHeader ? (
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-white/10">
          <span className="text-sm font-bold">Keranjang{count > 0 ? ` · ${count}` : ""}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10.5px] font-bold",
              accent === "amber"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                : "bg-blue-600/10 text-blue-700 dark:text-blue-300",
            )}
          >
            {bookLabel}
          </span>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {cartLines.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Ketuk item untuk mulai transaksi.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {cartLines.map((l) => (
              <div key={l.key} className="flex items-center gap-2 px-4 py-3">
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
                    onClick={() => onDec(l.key)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:border-white/10"
                    aria-label="Kurangi"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                  <button
                    type="button"
                    onClick={() => onAdd(l.key)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:border-white/10"
                    aria-label="Tambah"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(l.key)}
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
          className={cn(
            "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10",
            accent === "amber" ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-500",
          )}
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {saving ? "Memproses…" : `Bayar cash ${total > 0 ? formatIDR(total) : ""}`}
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-400">Masuk {bookLabel} — terpisah dari booking.</p>
      </div>
    </>
  );
}
