"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
    return tenants.filter((tenant) =>
      [tenant.name, tenant.slug, tenant.business_category, tenant.business_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [query, tenants]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#050505] dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-10">
        <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 md:p-10 lg:p-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.3em] text-blue-600">
                <Sparkles className="h-3.5 w-3.5" />
                Public Tenant Directory
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black italic uppercase tracking-tighter leading-none md:text-6xl">
                Semua tenant Bookinaja dalam satu pintu.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                Pilih tenant, masuk ke landing page mereka, lalu lanjutkan booking
                seperti biasa. Portal customer tetap ada di `/user`.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="rounded-2xl bg-slate-950 px-5 py-6 text-white hover:bg-slate-800">
                  <Link href="/user/login">Login Customer</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl px-5 py-6">
                  <Link href="/user/me">My Dashboard</Link>
                </Button>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 p-6 dark:border-white/5 dark:bg-white/[0.02] md:p-10 lg:border-l lg:border-t-0">
              <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl">
                <div className="text-[9px] font-black uppercase tracking-[0.35em] text-blue-200">
                  Global Access
                </div>
                <div className="mt-3 text-2xl font-black italic uppercase tracking-tighter">
                  bookinaja.com/tenants
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Direktori publik ini terpisah dari area customer supaya portal
                  `/user` tetap fokus ke dashboard dan booking detail.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-white/[0.03] md:p-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari tenant, kategori, atau slug..."
              className="h-12 rounded-2xl pl-11"
            />
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-80 rounded-[2rem] bg-white dark:bg-white/5"
                />
              ))
            : filtered.map((tenant) => (
                <Card
                  key={tenant.id}
                  className="group overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm transition-transform duration-300 hover:-translate-y-1 dark:border-white/5 dark:bg-white/[0.03]"
                >
                  <div
                    className="h-40 bg-slate-100 bg-cover bg-center"
                    style={{
                      backgroundImage: tenant.banner_url
                        ? `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55)), url(${tenant.banner_url})`
                        : "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(37,99,235,0.45))",
                    }}
                  />
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600">
                          {tenant.business_category || "tenant"}
                        </div>
                        <h2 className="mt-2 truncate text-xl font-black italic uppercase tracking-tighter">
                          {tenant.name}
                        </h2>
                      </div>
                      {tenant.primary_color ? (
                        <div
                          className="h-10 w-10 rounded-2xl border border-white/20 shadow-inner"
                          style={{ backgroundColor: tenant.primary_color }}
                        />
                      ) : null}
                    </div>

                    <p className="line-clamp-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
                      {tenant.tagline ||
                        tenant.slogan ||
                        tenant.about_us ||
                        "Tenant terdaftar di Bookinaja."}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full uppercase">
                        {tenant.slug}
                      </Badge>
                      {tenant.business_type ? (
                        <Badge variant="outline" className="rounded-full uppercase">
                          {tenant.business_type}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                        <span>{new URL(getTenantUrl(tenant.slug)).hostname}</span>
                      </div>
                      <a
                        href={getTenantUrl(tenant.slug)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-[0.25em] transition-all",
                          "bg-slate-950 text-white hover:bg-slate-800",
                        )}
                      >
                        Buka Tenant
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
        </section>
      </div>
    </div>
  );
}
