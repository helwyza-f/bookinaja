"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Clock, Search } from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getTenantUrl } from "@/lib/tenant";

type TenantCard = {
  id: string;
  name: string;
  slug: string;
  business_category?: string;
  business_type?: string;
  tagline?: string;
  slogan?: string;
  about_us?: string;
  primary_color?: string;
  logo_url?: string;
  banner_url?: string;
  open_time?: string;
  close_time?: string;
};

export default function TenantsDirectoryPage() {
  const [tenants, setTenants] = useState<TenantCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get("/public/tenants");
        if (active) setTenants(res.data?.items || []);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;

    return tenants.filter((tenant) =>
      [
        tenant.name,
        tenant.slug,
        tenant.business_category,
        tenant.business_type,
        tenant.tagline,
        tenant.slogan,
        tenant.about_us,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [query, tenants]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#050505] dark:text-white">
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <section className="flex flex-col gap-5 border-b border-slate-200 pb-6 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
              <Building2 className="h-4 w-4" />
              Tenant Directory
            </div>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-tight md:text-5xl">
              Cari tenant Bookinaja
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Pilih tempat yang mau kamu booking. Semua tenant aktif bisa dicari dari sini tanpa harus tahu slug atau subdomain mereka dulu.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/user/login">Login Customer</Link>
            </Button>
            <Button asChild className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
              <Link href="/user/me">Dashboard</Link>
            </Button>
          </div>
        </section>

        <section className="sticky top-0 z-10 -mx-4 bg-slate-50/95 px-4 py-4 backdrop-blur dark:bg-[#050505]/95 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari tenant, kategori, tipe bisnis, atau slug..."
                className="h-11 rounded-xl border-slate-200 pl-10"
              />
            </div>
            <div className="px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {loading ? "Memuat tenant..." : `${filtered.length} dari ${tenants.length} tenant`}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-56 rounded-2xl bg-white dark:bg-white/5" />
              ))
            : filtered.map((tenant) => (
                <Card
                  key={tenant.id}
                  className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-colors hover:border-blue-200 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  {tenant.banner_url ? (
                    <div className="h-24 bg-slate-100 bg-cover bg-center" style={{ backgroundImage: `url(${tenant.banner_url})` }} />
                  ) : (
                    <div
                      className="h-2"
                      style={{ backgroundColor: tenant.primary_color || "#2563eb" }}
                    />
                  )}

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"
                        style={tenant.primary_color ? { backgroundColor: tenant.primary_color } : undefined}
                      >
                        {tenant.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={tenant.logo_url} alt="" className="h-full w-full rounded-xl object-cover" />
                        ) : (
                          <Building2 className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-black uppercase tracking-tight">
                          {tenant.name}
                        </h2>
                        <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {tenant.slug}
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-400">
                      {tenant.tagline || tenant.slogan || tenant.about_us || "Tenant terdaftar di Bookinaja."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-lg uppercase">
                        {tenant.business_category || "tenant"}
                      </Badge>
                      {tenant.business_type ? (
                        <Badge variant="outline" className="rounded-lg uppercase">
                          {tenant.business_type}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
                      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {tenant.open_time || "09:00"}-{tenant.close_time || "22:00"}
                        </span>
                      </div>
                      <a
                        href={getTenantUrl(tenant.slug)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                      >
                        Buka
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
        </section>

        {!loading && filtered.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-lg font-black uppercase tracking-tight">Tenant tidak ditemukan</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Coba cari nama bisnis, kategori, atau slug yang lebih umum.
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
