"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useTenant } from "@/context/tenant-context";
import { syncTenantCookies } from "@/lib/tenant-session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
    if (customerPhone.trim().length < 9) return;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/public/validate-customer?phone=${customerPhone}`);
        if (res.data?.name) {
          setCustomerName(res.data.name);
        }
      } catch {
        // keep silent; customer bisa lanjut sebagai customer baru
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

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Skeleton className="h-10 w-32 rounded-2xl" />
        <Skeleton className="h-80 rounded-[2rem]" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 rounded-[2rem]" />
          <Skeleton className="h-80 rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (!resource) return null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
      <Button variant="ghost" className="h-10 w-fit rounded-2xl px-3" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#120905] p-0 text-white">
          <div className="relative aspect-[16/9] w-full bg-white/5">
            {resource.image_url ? (
              <Image
                src={resource.image_url}
                alt={resource.name}
                fill
                unoptimized
                className="object-cover object-center"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-[#120905] via-[#120905]/35 to-transparent" />
            <div className="absolute left-6 top-6">
              <Badge className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                Direct Sale
              </Badge>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
              <h1 className="max-w-3xl text-3xl font-black uppercase italic tracking-tight md:text-5xl">
                {resource.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
                {resource.description || "Pilih produk yang ingin dibeli, lalu lanjutkan ke pembayaran customer."}
              </p>
            </div>
          </div>
        </Card>

        <Card className="rounded-[2rem] border border-white/10 bg-[#120905] p-5 text-white md:p-6">
          <div className="space-y-5">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Customer
              </div>
              <div className="mt-3 space-y-3">
                <Input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Nama customer"
                  className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-slate-400"
                />
                <Input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="WhatsApp customer"
                  className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Catatan
              </div>
              <Input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Opsional, misalnya catatan pesanan"
                className="mt-3 h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-slate-400"
              />
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Ringkasan
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-300">
                    {selectedItems.length > 0
                      ? `${selectedItems.reduce((sum, entry) => sum + entry.quantity, 0)} item dipilih`
                      : "Belum ada produk dipilih"}
                  </div>
                  <div className="mt-1 text-3xl font-black tracking-tight text-orange-500">
                    Rp{total.toLocaleString("id-ID")}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="h-12 rounded-2xl bg-orange-500 px-5 text-sm font-black uppercase tracking-[0.16em] text-white hover:bg-orange-400"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}
                  Lanjut bayar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
            Pilih produk
          </div>
          <h2 className="mt-2 text-2xl font-black uppercase italic tracking-tight text-white">
            Tanpa pilih slot waktu
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mainItems.map((item) => {
            const quantity = quantities[item.id] || 0;
            return (
              <Card
                key={item.id}
                className="rounded-[1.75rem] border border-white/10 bg-[#120f16] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
              >
                <div className="flex h-full flex-col gap-5">
                  <div className="space-y-2">
                    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">
                      {item.price_unit ? item.price_unit.replaceAll("_", " ") : "Produk"}
                    </div>
                    <h3 className="text-2xl font-black uppercase italic leading-none tracking-tight">
                      {item.name}
                    </h3>
                    <div className="text-3xl font-black tracking-tight text-orange-500">
                      Rp{Number(item.price || 0).toLocaleString("id-ID")}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10 w-10 rounded-full text-white hover:bg-white/10"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Qty
                      </div>
                      <div className="mt-1 text-2xl font-black">{quantity}</div>
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
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
