"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  dateColumns?: string[];
};

type ApiRecord = Record<string, unknown>;
type ReportFilters = {
  search: string;
  from: string;
  to: string;
  status: string;
  method: string;
  source: string;
  page: number;
  pageSize: number;
};

type ReportFetchResult = {
  rows: Record<string, unknown>[];
  summary?: Record<string, number>;
  total?: number;
};

const configs: Record<ReportKind, ReportConfig> = {
  revenue: {
    title: "Laporan pendapatan",
    description: "Booking dan POS dengan total bayar, sisa tagihan, dan status pembayaran.",
    filename: "bookinaja-pendapatan.csv",
    columns: ["tipe", "ref", "customer", "status", "total", "paid", "sisa", "tanggal"],
    moneyColumns: ["total", "paid", "sisa"],
    dateColumns: ["tanggal"],
  },
  expenses: {
    title: "Laporan pengeluaran",
    description: "Expense khusus dengan kategori, vendor, tanggal, dan jumlah.",
    filename: "bookinaja-pengeluaran.csv",
    columns: ["tanggal", "judul", "kategori", "vendor", "jumlah"],
    moneyColumns: ["jumlah"],
    dateColumns: ["tanggal"],
  },
  transactions: {
    title: "Semua transaksi",
    description: "Audit transaksi booking dan direct sale dalam satu tabel.",
    filename: "bookinaja-semua-transaksi.csv",
    columns: ["tipe", "ref", "customer", "status_booking", "status_bayar", "total", "paid", "sisa", "tanggal"],
    moneyColumns: ["total", "paid", "sisa"],
    dateColumns: ["tanggal"],
  },
  customers: {
    title: "Laporan pelanggan",
    description: "Customer, kontak, total kunjungan, total belanja, dan aktivitas terakhir.",
    filename: "bookinaja-pelanggan.csv",
    columns: ["nama", "phone", "email", "kunjungan", "belanja", "terakhir"],
    moneyColumns: ["belanja"],
    dateColumns: ["terakhir"],
  },
  ledger: {
    title: "Ledger tenant",
    description: "Mutasi saldo tenant dari Midtrans: gross, fee, net, dan saldo berjalan.",
    filename: "bookinaja-ledger-tenant.csv",
    columns: ["tanggal", "source", "order_id", "transaction_id", "status", "type", "direction", "gross", "fee", "net", "saldo"],
    moneyColumns: ["gross", "fee", "net", "saldo"],
    dateColumns: ["tanggal"],
  },
  midtrans: {
    title: "Webhook Midtrans",
    description: "Notifikasi Midtrans khusus tenant ini untuk konfirmasi payment masuk atau gagal.",
    filename: "bookinaja-midtrans-webhook.csv",
    columns: ["diterima", "order_id", "transaction_id", "status", "fraud", "payment_type", "amount", "proses", "error"],
    moneyColumns: ["amount"],
    dateColumns: ["diterima"],
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
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<ReportFilters>({
    search: "",
    from: "",
    to: "",
    status: "all",
    method: "all",
    source: "all",
    page: 1,
    pageSize: 50,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const next = await fetchReportRows(kind, filters);
      setRows(next.rows);
      setSummary(next.summary || {});
      setTotal(next.total || next.rows.length);
    } catch {
      toast.error("Gagal memuat laporan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const metricCards = useMemo(() => buildMetrics(kind, rows, summary), [kind, rows, summary]);
  const hasStatusFilter = kind === "revenue" || kind === "transactions" || kind === "ledger" || kind === "midtrans";
  const hasMethodFilter = kind !== "customers";
  const hasSourceFilter = kind === "ledger";
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const updateFilter = (patch: Partial<ReportFilters>) => {
    setFilters((current) => ({ ...current, page: 1, ...patch }));
  };

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

      <Card className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950 md:grid-cols-6">
        <Input
          value={filters.search}
          onChange={(event) => updateFilter({ search: event.target.value })}
          placeholder="Cari ref, customer, status"
          className="rounded-xl md:col-span-2"
        />
        <Input
          type="date"
          value={filters.from}
          onChange={(event) => updateFilter({ from: event.target.value })}
          className="rounded-xl"
        />
        <Input
          type="date"
          value={filters.to}
          onChange={(event) => updateFilter({ to: event.target.value })}
          className="rounded-xl"
        />
        {hasStatusFilter ? (
          <select
            value={filters.status}
            onChange={(event) => updateFilter({ status: event.target.value })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="all">Semua status</option>
            <option value="pending">Pending</option>
            <option value="settled">Settled</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
            <option value="processed">Processed</option>
          </select>
        ) : null}
        {hasMethodFilter ? (
          <select
            value={filters.method}
            onChange={(event) => updateFilter({ method: event.target.value })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="all">Semua metode</option>
            <option value="midtrans">Midtrans</option>
            <option value="qris">QRIS</option>
            <option value="cash">Cash</option>
            <option value="transfer">Transfer</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="credit_card">Credit card</option>
          </select>
        ) : null}
        {hasSourceFilter ? (
          <select
            value={filters.source}
            onChange={(event) => updateFilter({ source: event.target.value })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="all">Semua source</option>
            <option value="booking_payment">Booking</option>
            <option value="sales_order">POS</option>
            <option value="refund">Refund</option>
            <option value="adjustment">Adjustment</option>
          </select>
        ) : null}
      </Card>

      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span>
            {total} data, halaman {filters.page} dari {totalPages}
          </span>
          <span>{rows.length} tampil</span>
        </div>
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
                        {renderCell(config, column, row[column])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <select
            value={filters.pageSize}
            onChange={(event) => updateFilter({ pageSize: Number(event.target.value) })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value={25}>25 / halaman</option>
            <option value={50}>50 / halaman</option>
            <option value={100}>100 / halaman</option>
            <option value={200}>200 / halaman</option>
          </select>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={filters.page <= 1 || refreshing}
              onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={filters.page >= totalPages || refreshing}
              onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function renderCell(config: ReportConfig, column: string, value: unknown) {
  if (config.moneyColumns?.includes(column)) return formatIDR(Number(value || 0));
  if (config.dateColumns?.includes(column)) return formatDateTime(String(value || ""));
  return String(value ?? "-");
}

function buildReportParams(kind: ReportKind, filters: ReportFilters) {
  const params: Record<string, string | number> = {
    page: filters.page,
    page_size: filters.pageSize,
  };
  if (filters.search) params.search = filters.search;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.status !== "all" && (kind === "revenue" || kind === "transactions" || kind === "ledger" || kind === "midtrans")) {
    params.status = filters.status;
  }
  if (filters.method !== "all" && kind !== "customers") params.method = filters.method;
  if (filters.source !== "all" && kind === "ledger") params.source = filters.source;
  return params;
}

async function fetchReportRows(kind: ReportKind, filters: ReportFilters): Promise<ReportFetchResult> {
  const params = buildReportParams(kind, filters);

  if (kind === "ledger") {
    const res = await api.get("/reports/ledger", { params });
    const items = (Array.isArray(res.data?.items) ? res.data.items : []) as ApiRecord[];
    const rows = items.map((item) => ({
      tanggal: String(item.created_at || ""),
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
    return { rows, summary: res.data?.summary || {}, total: Number(res.data?.total || 0) };
  }

  if (kind === "midtrans") {
    const res = await api.get("/reports/midtrans-notifications", { params });
    const items = (Array.isArray(res.data?.items) ? res.data.items : []) as ApiRecord[];
    const rows = items.map((item) => ({
      diterima: String(item.received_at || ""),
      order_id: String(item.order_id || "-"),
      transaction_id: String(item.transaction_id || "-"),
      status: String(item.transaction_status || "-"),
      fraud: String(item.fraud_status || "-"),
      payment_type: String(item.payment_type || "-"),
      amount: Number(item.gross_amount || 0),
      proses: String(item.processing_status || "-"),
      error: String(item.error_message || ""),
    }));
    return { rows, total: Number(res.data?.total || 0) };
  }

  const res = await api.get(`/reports/${kind}`, { params });
  const rows = (Array.isArray(res.data?.items) ? res.data.items : []) as Record<string, unknown>[];
  return { rows, summary: res.data?.summary || {}, total: Number(res.data?.total || 0) };
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
  const pageTotal = rows.reduce((sum, row) => sum + Number(row.total || row.jumlah || row.belanja || 0), 0);
  const total = Number(summary.total || summary.total_spent || pageTotal);
  const paid = Number(summary.paid || rows.reduce((sum, row) => sum + Number(row.paid || 0), 0));
  const due = Number(summary.outstanding || rows.reduce((sum, row) => sum + Number(row.sisa || 0), 0));
  const entries = Number(summary.entries || rows.length);
  return [
    { label: "Total data", value: String(entries) },
    { label: kind === "customers" ? "Total belanja" : "Total nilai", value: formatIDR(total) },
    { label: kind === "expenses" ? "Rata-rata" : "Paid / sisa", value: kind === "expenses" ? formatIDR(entries ? total / entries : 0) : `${formatIDR(paid)} / ${formatIDR(due)}` },
  ];
}
