"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Minus,
  NotebookPen,
  Package2,
  Phone,
  Plus,
  ShoppingBag,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useTenant } from "@/context/tenant-context";
import { syncTenantCookies } from "@/lib/tenant-session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ResourceItem = {
  id: string;
  name: string;
  price: number;
  price_unit?: string;
  item_type?: string;
  is_default?: boolean;
};

type ResourceDetail = {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  operating_mode?: string;
  items?: ResourceItem[];
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

export default function PublicDirectSaleOrderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useTenant();
  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [knownCustomer, setKnownCustomer] = useState(false);
  const [checkingCustomer, setCheckingCustomer] = useState(false);

  useEffect(() => {
    syncTenantCookies(profile?.slug);
  }, [profile?.slug]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get(`/public/resources/${params.id}`);
        const detail = res.data as ResourceDetail;
        if (String(detail?.operating_mode || "timed").toLowerCase() === "timed") {
          router.replace(`/bookings/${params.id}`);
          return;
        }
        setResource(detail);
      } catch {
        toast.error("Gagal memuat produk");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [params.id, router]);

  useEffect(() => {
    if (!resource?.items?.length) return;
    setQuantities((current) => {
      if (Object.keys(current).length > 0) return current;
      const items = resource.items ?? [];
      const defaults = Object.fromEntries(
        items
          .filter((item) => item.is_default)
          .map((item) => [item.id, 1]),
      );
      return defaults;
    });
  }, [resource?.items]);

  useEffect(() => {
    if (customerPhone.trim().length < 9) {
      setKnownCustomer(false);
      setCheckingCustomer(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingCustomer(true);
      try {
        const res = await api.get(`/public/validate-customer?phone=${customerPhone}`);
        if (res.data?.name) {
          setCustomerName(res.data.name);
          setKnownCustomer(true);
        } else {
          setKnownCustomer(false);
        }
      } catch {
        setKnownCustomer(false);
      } finally {
        setCheckingCustomer(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [customerPhone]);

  const mainItems = useMemo(
    () =>
      (resource?.items || []).filter((item) =>
        !["add_on", "addon"].includes(String(item.item_type || "").toLowerCase()),
      ),
    [resource?.items],
  );

  const selectedItems = useMemo(
    () =>
      mainItems
        .map((item) => ({ item, quantity: quantities[item.id] || 0 }))
        .filter((entry) => entry.quantity > 0),
    [mainItems, quantities],
  );

  const total = useMemo(
    () => selectedItems.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0),
    [selectedItems],
  );
  const selectedCount = useMemo(
    () => selectedItems.reduce((sum, entry) => sum + entry.quantity, 0),
    [selectedItems],
  );

  const updateQuantity = (itemID: string, delta: number) => {
    setQuantities((current) => {
      const next = Math.max(0, (current[itemID] || 0) + delta);
      return { ...current, [itemID]: next };
    });
  };

  const handleCheckout = async () => {
    if (!resource) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Lengkapi nama dan WhatsApp customer dulu");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Pilih minimal satu produk");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/public/sales-orders", {
        resource_id: resource.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        notes,
        items: selectedItems.map(({ item, quantity }) => ({
          resource_item_id: item.id,
          quantity,
        })),
      });
      const redirectUrl = res.data?.redirect_url;
      if (redirectUrl) {
        router.push(redirectUrl);
        return;
      }
      toast.success("Order berhasil dibuat");
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.response?.data?.error || "Gagal membuat order");
    } finally {
      setSubmitting(false);
    }
  };

  const summaryLabel =
    selectedCount > 0 ? `${selectedCount} item dipilih` : "Pilih produk";
  const readyForCheckout =
    selectedItems.length > 0 && customerName.trim().length > 0 && customerPhone.trim().length > 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Skeleton className="h-10 w-32 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Skeleton className="h-[26rem] rounded-[2rem]" />
          <Skeleton className="h-[26rem] rounded-[2rem]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-72 rounded-[2rem]" />
          <Skeleton className="h-72 rounded-[2rem]" />
          <Skeleton className="h-72 rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (!resource) return null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_38%,#f8fafc_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.14),_transparent_28%),linear-gradient(180deg,#050505_0%,#0b0d14_42%,#050505_100%)] dark:text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 pb-28 md:px-6 md:pb-8">
        <Button variant="ghost" className="h-10 w-fit rounded-2xl px-3 text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-white dark:hover:bg-white/5 dark:hover:text-white" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>

        <div className="space-y-6">
          <Card className="overflow-hidden rounded-[2rem] border border-orange-100 bg-white text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0d1018] dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="relative min-h-[20rem]">
              {resource.image_url ? (
                <Image
                  src={resource.image_url}
                  alt={resource.name}
                  fill
                  unoptimized
                  className="object-cover object-center opacity-85"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,#111827_0%,#1f2937_50%,#111827_100%)]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,18,0.1)_0%,rgba(7,10,18,0.32)_35%,rgba(7,10,18,0.94)_100%)]" />
              <div className="relative flex h-full min-h-[20rem] flex-col justify-between p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Badge className="rounded-full border border-white/60 bg-white/75 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-900 backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-white">
                    Order
                  </Badge>
                  <div className="rounded-full border border-emerald-300/70 bg-emerald-50/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                    Tanpa jadwal
                  </div>
                </div>

                <div className="space-y-3">
                  <h1 className="max-w-3xl text-4xl font-black uppercase italic leading-[0.88] tracking-tight text-white md:text-6xl">
                    {resource.name}
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-white/90 md:text-base">
                    {resource.description || "Pilih item lalu lanjut bayar."}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-3">
            <FlowStepCard
              step="1"
              title="Pilih produk"
              description="Tentukan item dan jumlah yang mau dipesan."
              active={selectedItems.length === 0}
              done={selectedItems.length > 0}
            />
            <FlowStepCard
              step="2"
              title="Isi data customer"
              description="Nomor WhatsApp dipakai untuk akses order dan pembayaran."
              active={selectedItems.length > 0 && (!customerName.trim() || !customerPhone.trim())}
              done={customerName.trim().length > 0 && customerPhone.trim().length > 0}
            />
            <FlowStepCard
              step="3"
              title="Review lalu bayar"
              description="Cek ringkasan order, lalu lanjut ke pembayaran."
              active={readyForCheckout}
              done={false}
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Langkah 1
                </div>
                <h2 className="mt-2 text-3xl font-black uppercase italic tracking-tight text-slate-950 dark:text-white">
                  Pilih produk
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Tambahkan item yang mau dibeli. Flow ini khusus order langsung, tanpa pilih jadwal.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                Atur qty per item
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mainItems.map((item) => {
                const quantity = quantities[item.id] || 0;
                const subtotal = item.price * quantity;
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "rounded-[1.9rem] border p-5 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-all duration-300 dark:text-white dark:shadow-[0_18px_60px_rgba(0,0,0,0.18)]",
                      quantity > 0
                        ? "border-orange-300 bg-[linear-gradient(180deg,rgba(255,237,213,0.85)_0%,rgba(255,255,255,1)_34%,rgba(248,250,252,1)_100%)] dark:border-orange-400/40 dark:bg-[linear-gradient(180deg,rgba(249,115,22,0.14)_0%,rgba(15,18,27,0.98)_36%,rgba(15,18,27,1)_100%)]"
                        : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#120f16]",
                    )}
                  >
                    <div className="flex h-full flex-col gap-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                            {item.price_unit ? item.price_unit.replaceAll("_", " ") : "Produk"}
                          </div>
                          <h3 className="text-2xl font-black uppercase italic leading-none tracking-tight">
                            {item.name}
                          </h3>
                        </div>
                        {quantity > 0 ? (
                          <div className="rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                            Dipilih
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <div className="text-3xl font-black tracking-tight text-orange-400">
                          Rp{Number(item.price || 0).toLocaleString("id-ID")}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {quantity > 0
                            ? `Subtotal Rp${subtotal.toLocaleString("id-ID")}`
                            : "Belum dipilih"}
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between rounded-[1.4rem] border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/[0.04]">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-10 w-10 rounded-full text-slate-700 hover:bg-white dark:text-white dark:hover:bg-white/10"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="min-w-24 text-center">
                          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                            Qty
                          </div>
                          <div className="mt-1 text-3xl font-black">{quantity}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-10 w-10 rounded-full bg-orange-500 text-white hover:bg-orange-400"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:border-white/8 dark:bg-black/15 dark:text-slate-400">
                        <Package2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        Ubah qty kapan saja.
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <Card className="rounded-[2rem] border border-slate-200 bg-white p-5 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f121b] dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.26)] md:p-6">
              <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                        Langkah 2
                      </div>
                      <h2 className="mt-2 text-2xl font-black uppercase italic tracking-tight">
                        Data customer
                      </h2>
                      <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
                        Nomor WhatsApp dipakai untuk buka order lagi, cek status, dan lanjut pembayaran.
                      </p>
                    </div>
                  {knownCustomer ? (
                    <Badge className="rounded-full border-none bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                      Dikenali
                    </Badge>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      <Phone className="h-3.5 w-3.5" />
                      WhatsApp customer
                    </div>
                    <div className="relative">
                      <Input
                        value={customerPhone}
                        onChange={(event) => setCustomerPhone(event.target.value.replace(/\D/g, ""))}
                        placeholder="08xxxxxxxxxx"
                        inputMode="numeric"
                        className={cn(
                          "h-13 rounded-2xl border-slate-200 bg-white pl-4 pr-12 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500",
                          knownCustomer && "border-emerald-300 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-500/[0.06]",
                        )}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                        {checkingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                      {knownCustomer
                        ? "Nomor dikenali."
                        : "Nomor ini dipakai untuk akses order."}
                    </p>
                  </label>

                  <label className="block sm:col-span-2">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      <UserRound className="h-3.5 w-3.5" />
                      Nama customer
                    </div>
                    <div className="relative">
                      <Input
                        value={customerName}
                        onChange={(event) => setCustomerName(event.target.value)}
                        placeholder="Nama customer"
                        className="h-13 rounded-2xl border-slate-200 bg-white pl-4 pr-12 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
                      />
                      {knownCustomer ? (
                        <Check className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300" />
                      ) : null}
                    </div>
                  </label>

                  <label className="block sm:col-span-2">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      <NotebookPen className="h-3.5 w-3.5" />
                      Catatan pesanan
                    </div>
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Opsional, misalnya catatan pesanan."
                      className="min-h-28 rounded-[1.4rem] border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
                    />
                  </label>
                </div>
              </div>
            </Card>

            <div className="lg:sticky lg:top-6 lg:h-fit">
              <Card className="rounded-[2rem] border border-slate-200 bg-white p-5 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f121b] dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.26)] md:p-6">
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                        Langkah 3
                      </div>
                      <h2 className="mt-2 text-2xl font-black uppercase italic tracking-tight">
                        Review order
                      </h2>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                      {selectedItems.length} jenis
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      Ringkasan
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {summaryLabel}
                    </div>

                    <div className="mt-4 space-y-2">
                      {selectedItems.length > 0 ? (
                        selectedItems.map(({ item, quantity }) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/8 dark:bg-black/15"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black uppercase italic text-slate-950 dark:text-white">
                                {item.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {quantity} x Rp{Number(item.price || 0).toLocaleString("id-ID")}
                              </div>
                            </div>
                            <div className="shrink-0 text-sm font-black text-orange-400">
                              Rp{Number(item.price * quantity).toLocaleString("id-ID")}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                          Belum ada item.
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Total
                        </div>
                        <div className="mt-1 text-3xl font-black tracking-tight text-orange-400">
                          Rp{total.toLocaleString("id-ID")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Setelah order dibuat
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">
                          Customer akan diarahkan ke akses order untuk cek detail dan menyelesaikan pembayaran.
                        </p>
                      </div>
                    </div>
                  </div>

                  {!readyForCheckout ? (
                    <div className="rounded-[1.4rem] border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                      Lengkapi item, nama, dan WhatsApp dulu sebelum lanjut.
                    </div>
                  ) : (
                    <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                      Siap lanjut. Setelah ini customer masuk ke halaman pembayaran order.
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleCheckout}
                    disabled={submitting}
                    className="h-13 w-full rounded-[1.4rem] bg-orange-500 text-sm font-black uppercase tracking-[0.18em] text-white hover:bg-orange-400"
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}
                    Buat order & lanjut bayar
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/92 px-4 py-3 backdrop-blur md:hidden dark:border-white/10 dark:bg-[#090b10]/92">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Total
              </div>
              <div className="truncate text-2xl font-black tracking-tight text-orange-400">
                Rp{total.toLocaleString("id-ID")}
              </div>
            </div>
            <Button
              type="button"
              onClick={handleCheckout}
              disabled={submitting}
              className="h-12 shrink-0 rounded-2xl bg-orange-500 px-5 text-sm font-black uppercase tracking-[0.16em] text-white hover:bg-orange-400"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}
              Bayar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowStepCard({
  step,
  title,
  description,
  active,
  done,
}: {
  step: string;
  title: string;
  description: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <Card
      className={cn(
        "rounded-[1.5rem] border bg-white p-4 shadow-sm dark:bg-[#0f121b]",
        done
          ? "border-emerald-200 dark:border-emerald-400/25"
          : active
            ? "border-orange-300 dark:border-orange-400/30"
            : "border-slate-200 dark:border-white/10",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black",
            done
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
              : active
                ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200"
                : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
          )}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : step}
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-950 dark:text-white">{title}</div>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </Card>
  );
}
