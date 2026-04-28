"use client";

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
          className="rounded-2xl border-none bg-white dark:bg-slate-900 shadow-sm overflow-hidden h-64"
        >
          <Skeleton className="aspect-square w-full dark:bg-slate-800" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4 dark:bg-slate-800" />
            <Skeleton className="h-3 w-1/2 dark:bg-slate-800" />
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
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between md:p-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Coffee size={18} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                F&B Catalog
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl dark:text-white">
                Menu Library
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Kelola menu kasir, stok tampil, kategori, dan foto produk.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchMenu}
              disabled={loading}
              className="h-10 rounded-xl"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              onClick={() => {
                setEditingItem(null);
                setOpen(true);
              }}
              className="h-10 rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 border-b border-slate-100 dark:border-white/10">
          <div className="border-r border-slate-100 p-4 dark:border-white/10">
            <p className="text-xs text-slate-500">Total item</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{stats.total}</p>
          </div>
          <div className="border-r border-slate-100 p-4 dark:border-white/10">
            <p className="text-xs text-slate-500">Ready</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-emerald-600">
              {stats.ready} <BadgeCheck className="h-4 w-4" />
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500">Empty</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{stats.empty}</p>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama menu, kategori, atau deskripsi..."
              className="h-11 rounded-xl bg-slate-50 pl-10 dark:bg-white/5"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "h-9 shrink-0 rounded-xl border px-4 text-xs font-semibold transition",
                  categoryFilter === cat
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300",
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
                "group rounded-2xl border-[0.5px] border-slate-200 dark:border-white/5 transition-all duration-300 bg-white dark:bg-slate-900 overflow-hidden flex flex-col relative",
                !item.is_available && "opacity-60 grayscale-[0.5]",
              )}
            >
              <div className="aspect-square w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
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

                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1.5 px-2.5 rounded-lg border border-white/10 shadow-2xl">
                  <span className="text-[7px] font-black text-white uppercase italic tracking-widest">
                    {item.is_available ? "Ready" : "Empty"}
                  </span>
                  <button
                    onClick={() => handleToggleAvailable(item)}
                    className={cn(
                      "w-7 h-4 rounded-full relative transition-all shadow-inner",
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
                  <h3 className="text-[10px] md:text-[11px] font-[1000] text-slate-900 dark:text-white uppercase italic tracking-tight leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">
                    {item.category}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-50 dark:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-400 uppercase italic mb-0.5">
                      Price
                    </span>
                    <span className="text-[11px] md:text-sm font-[1000] italic text-blue-600 dark:text-blue-400 tracking-tighter">
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
                      className="h-7 w-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                    >
                      <Edit3 size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="h-7 w-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all shadow-sm"
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
        <div className="h-[50vh] flex flex-col items-center justify-center bg-white dark:bg-slate-950 rounded-[1.75rem] md:rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10 p-8 md:p-12 text-center">
          <div className="h-20 w-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
            <PackageSearch size={32} className="text-slate-200" />
          </div>
          <h3 className="text-2xl font-[1000] italic uppercase text-slate-900 dark:text-white tracking-tighter">
            Library Empty
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase italic mt-2 mb-8 tracking-widest">
            Register your products for the terminal display
          </p>
          <Button
            onClick={() => {
              setEditingItem(null);
              setOpen(true);
            }}
            className="h-12 px-8 rounded-2xl bg-blue-600 text-white font-black italic uppercase text-[10px] tracking-widest"
          >
            Register Product
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
