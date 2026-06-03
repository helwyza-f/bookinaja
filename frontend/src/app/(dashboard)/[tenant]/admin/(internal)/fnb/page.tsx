"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Minus,
  Trash2,
  Edit3,
  PackageSearch,
  Utensils,
  Coffee,
  Search,
  RefreshCw,
  BadgeCheck,
  ShoppingCart,
  ReceiptText,
  Link2,
  ClipboardList,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FnbItemDialog, type FnbItem } from "@/components/fnb/fnb-item-dialong";

type MenuItem = FnbItem;

type ActiveBooking = {
  id: string;
  customer_name?: string;
  resource_name?: string;
  status?: string;
};

type CartLine = {
  item: MenuItem;
  quantity: number;
};

type FnbOrder = {
  id: string;
  order_number: string;
  source: "standalone" | "booking";
  booking_id?: string;
  booking_label?: string;
  payment_method: string;
  grand_total: number;
  created_at: string;
  items: Array<{
    id: string;
    item_name: string;
    quantity: number;
    subtotal: number;
  }>;
};

type FnbOrderSummary = {
  total_orders: number;
  standalone_orders: number;
  booking_orders: number;
  total_revenue: number;
  standalone_revenue: number;
  booking_revenue: number;
};

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
  const [viewMode, setViewMode] = useState<"catalog" | "orders">("catalog");
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [attachMode, setAttachMode] = useState<"standalone" | "booking">("standalone");
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderNotes, setOrderNotes] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [activeBookings, setActiveBookings] = useState<ActiveBooking[]>([]);
  const [orders, setOrders] = useState<FnbOrder[]>([]);
  const [orderSummary, setOrderSummary] = useState<FnbOrderSummary | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

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

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const [ordersRes, summaryRes] = await Promise.all([
        api.get("/fnb/orders", { params: { limit: 30 } }),
        api.get("/fnb/orders/summary"),
      ]);
      setOrders(ordersRes.data || []);
      setOrderSummary(summaryRes.data || null);
    } catch {
      toast.error("Gagal memuat transaksi F&B");
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchActiveBookings = async () => {
    try {
      const res = await api.get("/bookings/pos/active");
      setActiveBookings(Array.isArray(res.data) ? res.data : []);
    } catch {
      setActiveBookings([]);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchOrders();
    fetchActiveBookings();
  }, []);

  const refreshAll = () => {
    fetchMenu();
    fetchOrders();
    fetchActiveBookings();
  };

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

  const cartTotal = useMemo(
    () => cart.reduce((total, line) => total + line.item.price * line.quantity, 0),
    [cart],
  );

  const addToCart = (item: MenuItem) => {
    if (!item.is_available) {
      toast.error("Menu sedang habis");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((line) => line.item.id === item.id);
      if (existing) {
        return prev.map((line) =>
          line.item.id === item.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
    setTransactionOpen(true);
  };

  const updateCartQuantity = (itemID: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) =>
          line.item.id === itemID
            ? { ...line, quantity: Math.max(0, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  };

  const resetTransaction = () => {
    setCart([]);
    setAttachMode("standalone");
    setSelectedBookingId("");
    setPaymentMethod("cash");
    setOrderNotes("");
  };

  const submitTransaction = async () => {
    if (cart.length === 0) {
      toast.error("Pilih minimal satu menu");
      return;
    }
    if (attachMode === "booking" && !selectedBookingId) {
      toast.error("Pilih booking tujuan");
      return;
    }
    setCreatingOrder(true);
    try {
      await api.post("/fnb/orders", {
        booking_id: attachMode === "booking" ? selectedBookingId : "",
        payment_method: paymentMethod,
        notes: orderNotes,
        items: cart.map((line) => ({
          fnb_item_id: line.item.id,
          quantity: line.quantity,
        })),
      });
      toast.success(
        attachMode === "booking"
          ? "Transaksi F&B masuk ke booking"
          : "Transaksi F&B tersimpan",
      );
      resetTransaction();
      setTransactionOpen(false);
      fetchOrders();
    } catch (err: unknown) {
      const apiError =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : "";
      toast.error(apiError || "Gagal menyimpan transaksi");
    } finally {
      setCreatingOrder(false);
    }
  };

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
    <div className="mx-auto max-w-[1600px] space-y-3 px-3 pb-32 pt-3 font-plus-jakarta animate-in fade-in duration-500 md:px-4">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
        <div className="space-y-3 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bookinaja-600)] text-white">
                  <Coffee size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                    Katalog F&B
                  </div>
                  <h1 className="text-[1.35rem] font-semibold leading-none tracking-tight text-slate-950 dark:text-white md:text-[1.45rem]">
                    Menu dan produk
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">Total</div>
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">{stats.total}</div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">Siap</div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                      {stats.ready} <BadgeCheck className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">Habis</div>
                    <div className="text-sm font-semibold text-amber-600">{stats.empty}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 self-start lg:self-center">
              <div className="flex h-8 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-white/[0.04]">
                <button
                  type="button"
                  onClick={() => setViewMode("catalog")}
                  className={cn(
                    "rounded-md px-3 text-xs font-semibold transition",
                    viewMode === "catalog"
                      ? "bg-white text-[var(--bookinaja-700)] shadow-sm dark:bg-white/10 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-300",
                  )}
                >
                  Katalog
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("orders")}
                  className={cn(
                    "rounded-md px-3 text-xs font-semibold transition",
                    viewMode === "orders"
                      ? "bg-white text-[var(--bookinaja-700)] shadow-sm dark:bg-white/10 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-300",
                  )}
                >
                  Transaksi
                </button>
              </div>
              <Button
                variant="outline"
                onClick={refreshAll}
                disabled={loading}
                className="h-8 rounded-lg border-slate-200 px-3 text-sm dark:border-white/15 dark:bg-white/[0.03]"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setOpen(true);
                }}
                className="h-8 rounded-lg bg-[var(--bookinaja-600)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--bookinaja-700)]"
              >
                <Plus className="mr-2 h-4 w-4" /> Tambah
              </Button>
              <Button
                onClick={() => setTransactionOpen(true)}
                className="h-8 rounded-lg bg-slate-950 px-3.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
              >
                <ShoppingCart className="mr-2 h-4 w-4" /> Jual
              </Button>
            </div>
          </div>

          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari menu / kategori"
                className="h-9 rounded-lg bg-slate-50 pl-10 dark:border-white/15 dark:bg-white/[0.04]"
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
        </div>
      </section>

      {viewMode === "orders" ? (
        <section className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="rounded-xl border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Revenue F&B</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                Rp{formatIDR(orderSummary?.total_revenue || 0)}
              </div>
            </Card>
            <Card className="rounded-xl border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Standalone</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                {orderSummary?.standalone_orders || 0}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Rp{formatIDR(orderSummary?.standalone_revenue || 0)}
              </div>
            </Card>
            <Card className="rounded-xl border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Attach booking</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                {orderSummary?.booking_orders || 0}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Rp{formatIDR(orderSummary?.booking_revenue || 0)}
              </div>
            </Card>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-white/10">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--bookinaja-600)]">
                  Transaksi terbaru
                </div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Entry menu</h2>
              </div>
              <Button
                type="button"
                onClick={() => setTransactionOpen(true)}
                className="h-9 rounded-lg bg-[var(--bookinaja-600)] text-white"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Buat transaksi
              </Button>
            </div>
            {ordersLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(4)].map((_, index) => (
                  <Skeleton key={index} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : orders.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-white/10">
                {orders.map((order) => (
                  <div key={order.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950 dark:text-white">{order.order_number}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
                            order.source === "booking"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
                          )}
                        >
                          {order.source === "booking" ? "Booking" : "Standalone"}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(order.created_at).toLocaleString("id-ID")}{" "}
                        {order.booking_label ? `/ ${order.booking_label}` : ""}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {order.items.map((item) => (
                          <span
                            key={item.id}
                            className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                          >
                            {item.quantity}x {item.item_name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-lg font-semibold text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                        Rp{formatIDR(order.grand_total)}
                      </div>
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                        {order.payment_method}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <ReceiptText className="mb-3 h-10 w-10 text-slate-300" />
                <h3 className="font-semibold text-slate-950 dark:text-white">Belum ada transaksi menu</h3>
                <p className="mt-1 text-sm text-slate-500">Buat transaksi standalone atau attach ke booking dari katalog.</p>
              </div>
            )}
          </div>
        </section>
      ) : loading ? (
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
                      onClick={() => addToCart(item)}
                      disabled={!item.is_available}
                      className="h-7 w-7 rounded-md bg-[var(--bookinaja-600)] text-white transition-colors hover:bg-[var(--bookinaja-700)] disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/[0.06]"
                    >
                      <ShoppingCart size={12} />
                    </Button>
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
      <Dialog
        open={transactionOpen}
        onOpenChange={(nextOpen) => {
          setTransactionOpen(nextOpen);
          if (!nextOpen && !creatingOrder) resetTransaction();
        }}
      >
        <DialogContent className="max-w-[95vw] rounded-2xl border bg-white p-0 shadow-2xl dark:bg-slate-950 md:max-w-3xl">
          <DialogHeader className="border-b border-slate-100 px-5 py-4 dark:border-white/10">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <ReceiptText className="h-5 w-5 text-[var(--bookinaja-600)]" />
              Transaksi menu
            </DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[78vh] overflow-hidden md:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-y-auto p-5">
              <div className="mb-4 flex h-9 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-white/[0.04]">
                <button
                  type="button"
                  onClick={() => {
                    setAttachMode("standalone");
                    setSelectedBookingId("");
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-md text-xs font-semibold transition",
                    attachMode === "standalone"
                      ? "bg-white text-emerald-700 shadow-sm dark:bg-white/10 dark:text-white"
                      : "text-slate-500",
                  )}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Standalone
                </button>
                <button
                  type="button"
                  onClick={() => setAttachMode("booking")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-md text-xs font-semibold transition",
                    attachMode === "booking"
                      ? "bg-white text-blue-700 shadow-sm dark:bg-white/10 dark:text-white"
                      : "text-slate-500",
                  )}
                >
                  <Link2 className="h-4 w-4" />
                  Ke booking
                </button>
              </div>

              {attachMode === "booking" && (
                <div className="mb-4 space-y-2">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Booking aktif</div>
                  <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]">
                      <SelectValue placeholder="Pilih booking tujuan" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {activeBookings.map((booking) => (
                        <SelectItem key={booking.id} value={booking.id}>
                          {(booking.customer_name || "Customer")} / {booking.resource_name || "Resource"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Item transaksi</div>
                  <span className="text-xs text-slate-400">{cart.length} entry</span>
                </div>
                {cart.length > 0 ? (
                  cart.map((line) => (
                    <div
                      key={line.item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {line.item.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          Rp{formatIDR(line.item.price)} / {line.item.category}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => updateCartQuantity(line.item.id, -1)}
                          className="h-8 w-8 rounded-lg"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => updateCartQuantity(line.item.id, 1)}
                          className="h-8 w-8 rounded-lg"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-white/10">
                    Pilih menu dari daftar cepat di bawah.
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-3">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tambah dari katalog</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items
                    .filter((item) => item.is_available)
                    .slice(0, 8)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addToCart(item)}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-[var(--bookinaja-300)] hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {item.name}
                          </span>
                          <span className="block text-xs text-slate-500">
                            Rp{formatIDR(item.price)}
                          </span>
                        </span>
                        <Plus className="h-4 w-4 shrink-0 text-[var(--bookinaja-600)]" />
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <aside className="border-t border-slate-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03] md:border-l md:border-t-0">
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Metode bayar</div>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="mt-2 h-11 rounded-xl bg-white dark:border-white/10 dark:bg-slate-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="qris">QRIS</SelectItem>
                      <SelectItem value="edc">EDC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Catatan</div>
                  <Textarea
                    value={orderNotes}
                    onChange={(event) => setOrderNotes(event.target.value)}
                    placeholder="Opsional"
                    className="mt-2 min-h-24 rounded-xl bg-white dark:border-white/10 dark:bg-slate-950"
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Total</span>
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                    Rp{formatIDR(cartTotal)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {attachMode === "booking"
                      ? "Akan masuk ke tagihan booking."
                      : "Dicatat sebagai penjualan menu mandiri."}
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={creatingOrder || cart.length === 0}
                  onClick={submitTransaction}
                  className="h-11 w-full rounded-xl bg-[var(--bookinaja-600)] font-semibold text-white hover:bg-[var(--bookinaja-700)]"
                >
                  {creatingOrder ? "Menyimpan..." : "Simpan transaksi"}
                </Button>
              </div>
            </aside>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
