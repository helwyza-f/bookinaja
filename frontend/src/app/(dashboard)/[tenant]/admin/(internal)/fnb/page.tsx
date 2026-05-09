"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  Edit3,
  PackageSearch,
  Utensils,
  Coffee,
  Search,
  RefreshCw,
  BadgeCheck,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FnbItemDialog, type FnbItem } from "@/components/fnb/fnb-item-dialong";

type MenuItem = FnbItem;

// --- KOMPONEN SKELETON COMPACT ---
function FnbSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {[...Array(12)].map((_, i) => (
        <Card
          key={i}
          className="h-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/15 dark:bg-[#0f0f17]"
        >
          <Skeleton className="aspect-square w-full dark:bg-white/[0.06]" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4 dark:bg-white/[0.06]" />
            <Skeleton className="h-3 w-1/2 dark:bg-white/[0.06]" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function FnbManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await api.get("/fnb");
      setItems(res.data || []);
    } catch {
      toast.error("Gagal sinkronisasi katalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleToggleAvailable = async (item: MenuItem) => {
    const originalStatus = item.is_available;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_available: !originalStatus } : i,
      ),
    );

    try {
      await api.put(`/fnb/${item.id}`, {
        ...item,
        is_available: !originalStatus,
      });
      toast.success(`${item.name} status updated`);
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_available: originalStatus } : i,
        ),
      );
      toast.error("Gagal update stok");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item ini selamanya?")) return;
    try {
      await api.delete(`/fnb/${id}`);
      toast.success("Item removed");
      fetchMenu();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(items.map((item) => item.category)))],
    [items],
  );

  const stats = useMemo(
    () => ({
      total: items.length,
      ready: items.filter((item) => item.is_available).length,
      empty: items.filter((item) => !item.is_available).length,
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchSearch =
        !query ||
        [item.name, item.description, item.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return matchCategory && matchSearch;
    });
  }, [items, searchQuery, categoryFilter]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 pb-32 pt-5 animate-in fade-in duration-500 font-plus-jakarta px-3 md:px-4">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between md:p-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bookinaja-600)] text-white">
              <Coffee size={18} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                Katalog F&B
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 md:text-2xl dark:text-white">
                Menu dan produk
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={fetchMenu}
              disabled={loading}
              className="h-10 rounded-lg border-slate-200 dark:border-white/15 dark:bg-white/[0.03]"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              onClick={() => {
                setEditingItem(null);
                setOpen(true);
              }}
              className="h-10 rounded-lg bg-[var(--bookinaja-600)] px-4 text-sm font-semibold text-white hover:bg-[var(--bookinaja-700)]"
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 border-b border-slate-100 dark:border-white/10">
          <div className="border-r border-slate-100 p-4 dark:border-white/10">
            <p className="text-xs text-slate-500">Total item</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{stats.total}</p>
          </div>
          <div className="border-r border-slate-100 p-4 dark:border-white/10">
            <p className="text-xs text-slate-500">Siap dijual</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-emerald-600">
              {stats.ready} <BadgeCheck className="h-4 w-4" />
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500">Sedang habis</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{stats.empty}</p>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari menu / kategori"
              className="h-10 rounded-lg bg-slate-50 pl-10 dark:border-white/15 dark:bg-white/[0.04]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "h-8 shrink-0 rounded-lg border px-3 text-xs font-medium transition",
                  categoryFilter === cat
                    ? "border-[var(--bookinaja-600)] bg-[var(--bookinaja-600)] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[var(--bookinaja-200)] hover:text-[var(--bookinaja-700)] dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-[var(--bookinaja-200)] dark:hover:text-[var(--bookinaja-100)]",
                )}
              >
                {cat === "all" ? "Semua" : cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. GRID AREA - HIGH DENSITY */}
      {loading ? (
        <FnbSkeleton />
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4 animate-in slide-in-from-bottom-2 duration-500">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors dark:border-white/15 dark:bg-[#0f0f17]",
                !item.is_available && "opacity-60 grayscale-[0.5]",
              )}
            >
              <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-white/[0.05]">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-10">
                    <Utensils size={40} />
                  </div>
                )}

                <div className="absolute right-2 top-2 flex items-center gap-2 rounded-md border border-black/5 bg-white/95 px-2 py-1 shadow-sm dark:border-white/10 dark:bg-slate-950/90">
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    {item.is_available ? "Siap" : "Habis"}
                  </span>
                  <button
                    onClick={() => handleToggleAvailable(item)}
                    className={cn(
                      "relative h-4 w-7 rounded-full transition-all",
                      item.is_available ? "bg-emerald-500" : "bg-slate-500",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm",
                        item.is_available
                          ? "translate-x-3.5"
                          : "translate-x-0.5",
                      )}
                    />
                  </button>
                </div>
              </div>

              <CardContent className="p-2.5 flex flex-col flex-1">
                <div className="flex-1 min-h-[34px] mb-2.5">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900 transition-colors group-hover:text-[var(--bookinaja-600)] dark:text-white dark:group-hover:text-[var(--bookinaja-200)]">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    {item.category}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 dark:border-white/10">
                  <div className="flex flex-col">
                    <span className="mb-0.5 text-[11px] font-medium text-slate-500">
                      Harga
                    </span>
                    <span className="text-sm font-semibold text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                      Rp{formatIDR(item.price)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingItem(item);
                        setOpen(true);
                      }}
                      className="h-7 w-7 rounded-md bg-slate-50 text-slate-400 transition-colors hover:text-[var(--bookinaja-600)] dark:bg-white/[0.06] dark:hover:text-[var(--bookinaja-200)]"
                    >
                      <Edit3 size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="h-7 w-7 rounded-md bg-slate-50 text-slate-400 transition-colors hover:text-red-500 dark:bg-slate-800"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-white/15 dark:bg-[#0f0f17]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-50 dark:bg-white/[0.05]">
            <PackageSearch size={32} className="text-slate-200" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Katalog masih kosong
          </h3>
          <p className="mb-6 mt-2 max-w-md text-sm text-slate-500">
            Tambahkan menu pertama supaya kasir dan customer bisa mulai memilih produk.
          </p>
          <Button
            onClick={() => {
              setEditingItem(null);
              setOpen(true);
            }}
            className="h-10 rounded-lg bg-[var(--bookinaja-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--bookinaja-700)]"
          >
            Tambah menu
          </Button>
        </div>
      )}
      <FnbItemDialog
        open={open}
        onOpenChange={setOpen}
        editingItem={editingItem}
        onSuccess={fetchMenu}
      />
    </div>
  );
}
