"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

const reportMenus = [
  {
    title: "Pendapatan",
    description: "Ringkasan pemasukan dari booking dan penjualan langsung, lengkap dengan total dibayar dan sisa tagihan.",
    href: "/admin/reports/revenue",
  },
  {
    title: "Pengeluaran",
    description: "Catatan biaya operasional berdasarkan kategori, supplier, tanggal, dan nominal.",
    href: "/admin/reports/expenses",
  },
  {
    title: "Semua transaksi",
    description: "Gabungan booking dan penjualan langsung untuk melihat arus transaksi harian.",
    href: "/admin/reports/transactions",
  },
  {
    title: "Pelanggan",
    description: "Daftar pelanggan, kontak, total kunjungan, belanja, dan aktivitas terakhir.",
    href: "/admin/reports/customers",
  },
  {
    title: "Saldo tenant",
    description: "Dana customer yang masuk lewat Midtrans Bookinaja dan menjadi saldo tenant sebelum dicairkan.",
    href: "/admin/reports/ledger",
  },
  {
    title: "Riwayat Midtrans",
    description: "Riwayat pembayaran digital dari Midtrans untuk memastikan transaksi sudah diterima dan diproses.",
    href: "/admin/reports/midtrans",
  },
];

export default function ReportsIndexPage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Operasional
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Laporan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Pantau pemasukan, pengeluaran, pelanggan, saldo tenant, dan pembayaran digital dalam satu tempat.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        {reportMenus.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="group h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:hover:border-white/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
