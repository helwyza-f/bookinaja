"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Landmark,
  ReceiptText,
  ShoppingCart,
  Users,
  WalletCards,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const reportMenus = [
  {
    title: "Pendapatan",
    description: "Booking dan POS dengan total, paid amount, sisa tagihan, dan status bayar.",
    href: "/admin/reports/revenue",
    icon: Banknote,
  },
  {
    title: "Pengeluaran",
    description: "Expense khusus dengan kategori, vendor, tanggal, dan nilai pengeluaran.",
    href: "/admin/reports/expenses",
    icon: ReceiptText,
  },
  {
    title: "Semua transaksi",
    description: "Gabungan booking dan direct sale untuk audit transaksi operasional.",
    href: "/admin/reports/transactions",
    icon: ShoppingCart,
  },
  {
    title: "Pelanggan",
    description: "Customer, kunjungan, total belanja, kontak, dan aktivitas terakhir.",
    href: "/admin/reports/customers",
    icon: Users,
  },
  {
    title: "Ledger tenant",
    description: "Mutasi saldo tenant dari Midtrans: gross, fee, net, status, dan saldo berjalan.",
    href: "/admin/reports/ledger",
    icon: WalletCards,
  },
  {
    title: "Webhook Midtrans",
    description: "Notifikasi Midtrans tenant ini, lengkap dengan order id dan processing status.",
    href: "/admin/reports/midtrans",
    icon: Landmark,
  },
];

export default function ReportsIndexPage() {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
          Reports
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950 dark:text-white">
          Laporan bisnis
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Pilih laporan spesifik untuk buka detail data, audit transaksi, dan export CSV.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportMenus.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="group h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950 dark:hover:border-blue-400/30">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
                  <item.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-slate-950 dark:text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {item.description}
              </p>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
