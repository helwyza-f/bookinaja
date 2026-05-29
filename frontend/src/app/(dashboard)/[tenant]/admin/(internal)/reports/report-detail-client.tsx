"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type ReportKind =
  | "revenue"
  | "expenses"
  | "transactions"
  | "customers"
  | "ledger"
  | "midtrans";

type ReportConfig = {
  title: string;
  description: string;
  filename: string;
  columns: string[];
  moneyColumns?: string[];
};

type ApiRecord = Record<string, unknown>;

const configs: Record<ReportKind, ReportConfig> = {
  revenue: {
    title: "Laporan pendapatan",
    description: "Booking dan POS dengan total bayar, sisa tagihan, dan status pembayaran.",
    filename: "bookinaja-pendapatan.csv",
    columns: ["tipe", "ref", "customer", "status", "total", "paid", "sisa", "tanggal"],
    moneyColumns: ["total", "paid", "sisa"],
  },
  expenses: {
    title: "Laporan pengeluaran",
    description: "Expense khusus dengan kategori, vendor, tanggal, dan jumlah.",
    filename: "bookinaja-pengeluaran.csv",
    columns: ["tanggal", "judul", "kategori", "vendor", "jumlah"],
    moneyColumns: ["jumlah"],
  },
  transactions: {
    title: "Semua transaksi",
    description: "Audit transaksi booking dan direct sale dalam satu tabel.",
    filename: "bookinaja-semua-transaksi.csv",
    columns: ["tipe", "ref", "customer", "status_booking", "status_bayar", "total", "paid", "sisa", "tanggal"],
    moneyColumns: ["total", "paid", "sisa"],
  },
  customers: {
    title: "Laporan pelanggan",
    description: "Customer, kontak, total kunjungan, total belanja, dan aktivitas terakhir.",
    filename: "bookinaja-pelanggan.csv",
    columns: ["nama", "phone", "email", "kunjungan", "belanja", "terakhir"],
    moneyColumns: ["belanja"],
  },
  ledger: {
    title: "Ledger tenant",
    description: "Mutasi saldo tenant dari Midtrans: gross, fee, net, dan saldo berjalan.",
    filename: "bookinaja-ledger-tenant.csv",
    columns: ["tanggal", "source", "order_id", "transaction_id", "status", "type", "direction", "gross", "fee", "net", "saldo"],
    moneyColumns: ["gross", "fee", "net", "saldo"],
  },
  midtrans: {
    title: "Webhook Midtrans",
    description: "Notifikasi Midtrans khusus tenant ini untuk konfirmasi payment masuk atau gagal.",
    filename: "bookinaja-midtrans-webhook.csv",
    columns: ["diterima", "order_id", "transaction_id", "status", "fraud", "payment_type", "amount", "proses", "error"],
    moneyColumns: ["amount"],
  },
};

const formatIDR = (value?: number) => `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function getReportItems(payload: unknown) {
  const data = payload as { items?: unknown };
  return (Array.isArray(data?.items) ? data.items : []) as ApiRecord[];
}

function exportCsv(filename: string, rows: Record<string, unknown>[], columns: string[]) {
  if (rows.length === 0) {
    toast.info("Belum ada data untuk diexport");
    return;
  }
  const headers = columns;
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportDetailClient({ kind }: { kind: ReportKind }) {
  const config = configs[kind];
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const next = await fetchReportRows(kind);
      setRows(next.rows);
      setSummary(next.summary || {});
    } catch {
      toast.error("Gagal memuat laporan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const metricCards = useMemo(() => buildMetrics(kind, rows, summary), [kind, rows, summary]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950 md:flex-row md:items-end md:justify-between">
        <div>
          <Button asChild variant="ghost" className="-ml-3 mb-2 gap-2 rounded-xl">
            <Link href="/admin/reports">
              <ArrowLeft className="h-4 w-4" />
              Laporan
            </Link>
          </Button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Laporan
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {config.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {config.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2 rounded-xl" disabled={refreshing} onClick={load}>
            <RefreshCcw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
          <Button className="gap-2 rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => exportCsv(config.filename, rows, config.columns)}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {metricCards.map((metric) => (
          <Card key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{metric.label}</p>
            {loading ? (
              <Skeleton className="mt-3 h-7 w-32" />
            ) : (
              <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{metric.value}</p>
            )}
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:bg-white/[0.03]">
              <tr>
                {config.columns.map((column) => (
                  <th key={column} className="px-4 py-3 font-semibold">
                    {column.replaceAll("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={config.columns.length} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={config.columns.length}>
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={index} className="text-slate-700 dark:text-slate-200">
                    {config.columns.map((column) => (
                      <td key={column} className="whitespace-nowrap px-4 py-3">
                        {config.moneyColumns?.includes(column)
                          ? formatIDR(Number(row[column] || 0))
                          : String(row[column] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

async function fetchReportRows(kind: ReportKind) {
  if (kind === "expenses") {
    const res = await api.get("/reports/expenses", { params: { page_size: 200 } });
    const items = getReportItems(res.data);
    const rows = items.map((item) => ({
      tanggal: formatDateTime(String(item.tanggal || "")),
      judul: String(item.judul || "-"),
      kategori: String(item.kategori || "-"),
      vendor: String(item.vendor || "-"),
      jumlah: Number(item.jumlah || 0),
    }));
    return { rows };
  }

  if (kind === "customers") {
    const res = await api.get("/reports/customers", { params: { page_size: 200 } });
    const items = getReportItems(res.data);
    const rows = items.map((item) => ({
      nama: String(item.nama || "-"),
      phone: String(item.phone || "-"),
      email: String(item.email || "-"),
      kunjungan: Number(item.kunjungan || 0),
      belanja: Number(item.belanja || 0),
      terakhir: formatDateTime(String(item.terakhir || "")),
    }));
    return { rows };
  }

  if (kind === "ledger") {
    const res = await api.get("/reports/ledger", { params: { page_size: 200 } });
    const items = (Array.isArray(res.data?.items) ? res.data.items : []) as ApiRecord[];
    const rows = items.map((item) => ({
      tanggal: formatDateTime(String(item.created_at || "")),
      source: String(item.source_type || "-"),
      order_id: String(item.midtrans_order_id || item.source_ref || "-"),
      transaction_id: String(item.midtrans_transaction_id || "-"),
      status: String(item.status || item.transaction_status || "-"),
      type: String(item.payment_type || "-"),
      direction: String(item.direction || "-"),
      gross: Number(item.gross_amount || 0),
      fee: Number(item.platform_fee || 0),
      net: Number(item.net_amount || 0),
      saldo: Number(item.balance_after || 0),
    }));
    return { rows, summary: res.data?.summary || {} };
  }

  if (kind === "midtrans") {
    const res = await api.get("/reports/midtrans-notifications", { params: { page_size: 200 } });
    const items = (Array.isArray(res.data?.items) ? res.data.items : []) as ApiRecord[];
    const rows = items.map((item) => ({
      diterima: formatDateTime(String(item.received_at || "")),
      order_id: String(item.order_id || "-"),
      transaction_id: String(item.transaction_id || "-"),
      status: String(item.transaction_status || "-"),
      fraud: String(item.fraud_status || "-"),
      payment_type: String(item.payment_type || "-"),
      amount: Number(item.gross_amount || 0),
      proses: String(item.processing_status || "-"),
      error: String(item.error_message || ""),
    }));
    return { rows };
  }

  const endpoint = kind === "revenue" ? "/reports/revenue" : "/reports/transactions";
  const res = await api.get(endpoint, { params: { page_size: 200 } });
  const items = getReportItems(res.data);
  const rows = items.map((item) => ({
    tipe: String(item.tipe || "-"),
    ref: String(item.ref || "-"),
    customer: String(item.customer || "-"),
    status: String(item.status || "-"),
    status_booking: String(item.status_booking || "-"),
    status_bayar: String(item.status_bayar || item.status || "-"),
    total: Number(item.total || 0),
    paid: Number(item.paid || 0),
    sisa: Number(item.sisa || 0),
    tanggal: formatDateTime(String(item.tanggal || "")),
  }));
  return { rows };
}

function buildMetrics(kind: ReportKind, rows: Record<string, unknown>[], summary: Record<string, number>) {
  if (kind === "ledger") {
    return [
      { label: "Saldo ledger", value: formatIDR(summary.balance) },
      { label: "Credit settled", value: formatIDR(summary.settled_credit) },
      { label: "Jumlah mutasi", value: String(summary.entries || rows.length) },
    ];
  }
  if (kind === "midtrans") {
    return [
      { label: "Webhook", value: String(rows.length) },
      { label: "Processed", value: String(rows.filter((row) => row.proses === "processed").length) },
      { label: "Failed", value: String(rows.filter((row) => row.proses === "failed").length) },
    ];
  }
  const total = rows.reduce((sum, row) => sum + Number(row.total || row.jumlah || row.belanja || 0), 0);
  const paid = rows.reduce((sum, row) => sum + Number(row.paid || 0), 0);
  const due = rows.reduce((sum, row) => sum + Number(row.sisa || 0), 0);
  return [
    { label: "Total data", value: String(rows.length) },
    { label: kind === "customers" ? "Total belanja" : "Total nilai", value: formatIDR(total) },
    { label: kind === "expenses" ? "Rata-rata" : "Paid / sisa", value: kind === "expenses" ? formatIDR(rows.length ? total / rows.length : 0) : `${formatIDR(paid)} / ${formatIDR(due)}` },
  ];
}
