"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileUp,
  Megaphone,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tier?: string;
};

type ImportRow = {
  name: string;
  phone: string;
  email?: string;
  password?: string;
};

type ImportPreviewRow = ImportRow & {
  row: number;
  issues: string[];
};

type ImportResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  messages?: string[];
};

type AuditRow = {
  id: string;
  action: string;
  resource_type: string;
  metadata?: string;
  created_at: string;
  actor_name?: string;
  actor_email?: string;
};

type TenantProfile = {
  plan?: string;
  subscription_status?: string;
  subscription_current_period_end?: string;
  name?: string;
};

const DEFAULT_BULK_TEMPLATE = "name,phone,email,password\n";
const DEFAULT_BLAST_MESSAGE =
  "Halo {nama pelanggan}, sekarang kami sudah pakai Bookinaja. Simpan nomor ini agar kamu dapat update booking, promo, dan info penting.";

function parseCSV(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseImportText(text: string): ImportRow[] {
  const lines = parseCSV(text);
  if (lines.length <= 1) return [];
  return lines.slice(1).map((line) => {
    const [name = "", phone = "", email = "", password = ""] = line
      .split(",")
      .map((value) => value.trim());
    return {
      name,
      phone,
      email: email || undefined,
      password: password || undefined,
    };
  });
}

function buildPreview(rows: ImportRow[]): ImportPreviewRow[] {
  return rows.map((row, index) => {
    const issues: string[] = [];
    if (!row.name.trim()) issues.push("nama kosong");
    if (!row.phone.trim()) issues.push("nomor kosong");
    if (row.phone && !/^\+?[0-9][0-9\s-]{6,}$/.test(row.phone.trim())) {
      issues.push("format nomor perlu dicek");
    }
    return { ...row, row: index + 1, issues };
  });
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function SettingsCRMPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [activity, setActivity] = useState<AuditRow[]>([]);
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState(DEFAULT_BULK_TEMPLATE);
  const [blastMessage, setBlastMessage] = useState(DEFAULT_BLAST_MESSAGE);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadError, setUploadError] = useState("");

  const isProActive = useMemo(() => {
    const plan = String(profile?.plan || "").toLowerCase().trim();
    const status = String(profile?.subscription_status || "").toLowerCase().trim();
    return plan === "pro" && status === "active";
  }, [profile]);

  const importRows = useMemo(() => parseImportText(importText), [importText]);
  const importPreview = useMemo(() => buildPreview(importRows), [importRows]);
  const importWarnings = importPreview.filter((row) => row.issues.length > 0).length;
  const blastHistory = useMemo(
    () =>
      activity.filter(
        (item) => item.action === "customer_blast" || item.action === "customer_import",
      ),
    [activity],
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [custRes, activityRes, profileRes] = await Promise.all([
        api.get("/customers"),
        api.get("/admin/settings/activity?limit=50"),
        api.get("/admin/profile"),
      ]);
      setCustomers(custRes.data || []);
      setActivity(activityRes.data?.items || []);
      setProfile(profileRes.data || null);
    } catch {
      toast.error("Gagal memuat data CRM");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const templateDownload = () => {
    const blob = new Blob([DEFAULT_BULK_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bookinaja-customer-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (file: File | null) => {
    setUploadError("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUploadError("File harus .csv");
      return;
    }

    const text = await file.text();
    setSelectedFileName(file.name);
    setImportText(text.trim() ? text : DEFAULT_BULK_TEMPLATE);
  };

  const handleImport = async () => {
    if (!isProActive) {
      toast.error("Fitur import pelanggan hanya tersedia untuk plan Pro yang active");
      return;
    }
    if (importRows.length === 0) {
      toast.error("Tambahkan minimal 1 baris pelanggan yang valid");
      return;
    }

    setBusy(true);
    try {
      const res = await api.post("/admin/settings/customers/import", {
        rows: importRows,
      });
      setImportResult(res.data as ImportResult);
      toast.success("Import pelanggan selesai");
      await loadAll();
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Gagal mengimpor pelanggan";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleBlast = async () => {
    if (!isProActive) {
      toast.error("Fitur blast pelanggan hanya tersedia untuk plan Pro yang active");
      return;
    }
    if (!blastMessage.trim()) {
      toast.error("Pesan blast tidak boleh kosong");
      return;
    }

    setBusy(true);
    try {
      await api.post("/admin/settings/customers/blast", {
        message: blastMessage,
      });
      toast.success("Blast berhasil dikirim");
      await loadAll();
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Gagal mengirim blast";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-20 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Sparkles className="h-4 w-4" />
            CRM & Marketing
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            Migrasi pelanggan, blast, dan tracking campaign
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            Tenant Pro yang aktif bisa import CSV pelanggan, kirim blast WhatsApp, dan melihat history campaign untuk tracking operasional.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button variant="outline" onClick={loadAll} className="w-full gap-2 sm:w-auto">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={handleBlast}
            disabled={busy || !isProActive}
            className="w-full gap-2 sm:w-auto"
          >
            <Megaphone className="h-4 w-4" />
            Blast
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Customers" value={loading ? "-" : customers.length.toString()} />
        <Metric label="Plan" value={profile?.plan || "-"} />
        <Metric label="Status" value={profile?.subscription_status || "-"} />
        <Metric label="Campaign" value={blastHistory.length.toString()} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Eligibility
            </div>
            <div className="font-medium text-slate-950 dark:text-white">
              Fitur CRM Pro
            </div>
          </div>
          <Badge variant={isProActive ? "default" : "destructive"}>
            {isProActive ? "Pro active" : "Tidak aktif / bukan Pro"}
          </Badge>
        </div>
        <p className="mt-2 text-slate-500">
          Import pelanggan dan blast hanya dibuka untuk tenant plan <span className="font-semibold">pro</span> dengan status <span className="font-semibold">active</span>.
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-[420px]">
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="blast">Blast</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <FileUp className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <Badge className="border-none bg-blue-600 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                  Import CSV
                </Badge>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Migrasi pelanggan lama
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
                  Upload file CSV atau paste isi file langsung. Format yang didukung: <span className="font-medium text-slate-700 dark:text-slate-200">name,phone,email,password</span>.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-white/5 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:w-auto">
                    <Upload className="h-4 w-4" />
                    Upload CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(event) => handleFileUpload(event.target.files?.[0] || null)}
                    />
                  </label>
                  <Button variant="outline" onClick={templateDownload} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>

                {selectedFileName && (
                  <div className="text-xs text-slate-500">
                    File terpilih: <span className="font-medium text-slate-700 dark:text-slate-200">{selectedFileName}</span>
                  </div>
                )}
                {uploadError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
                    {uploadError}
                  </div>
                )}

                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="min-h-72 rounded-xl border-slate-200 bg-slate-50 font-mono text-sm dark:border-white/5 dark:bg-white/5"
                  placeholder="name,phone,email,password"
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {importRows.length}
                    </span>{" "}
                    baris siap diproses
                    {importWarnings > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {importWarnings} baris perlu dicek
                      </span>
                    )}
                  </div>
                  <Button onClick={handleImport} disabled={busy || !isProActive} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {busy ? "Memproses..." : "Import Pelanggan"}
                  </Button>
                </div>

                {importResult && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      Import selesai
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                      <Stat label="Total" value={importResult.total} />
                      <Stat label="Created" value={importResult.created} />
                      <Stat label="Updated" value={importResult.updated} />
                      <Stat label="Skipped" value={importResult.skipped} />
                      <Stat label="Failed" value={importResult.failed} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/5">
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  Preview
                </div>
                <Separator />
                <div className="max-h-80 space-y-2 overflow-auto pr-1">
                  {buildPreview(importRows).length === 0 ? (
                    <div className="text-sm text-slate-500">Belum ada data import.</div>
                  ) : (
                    buildPreview(importRows).map((row) => (
                      <div
                        key={`${row.row}-${row.phone}`}
                        className="rounded-lg border border-slate-200 p-3 text-sm dark:border-white/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-slate-950 dark:text-white">
                              {row.name || "Tanpa nama"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{row.phone || "-"}</div>
                          </div>
                          {row.issues.length > 0 ? (
                            <Badge variant="destructive">Cek</Badge>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                        </div>
                        {row.email && (
                          <div className="mt-2 text-xs text-slate-500">{row.email}</div>
                        )}
                        {row.issues.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {row.issues.map((issue) => (
                              <Badge key={issue} variant="outline" className="font-normal">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="blast" className="space-y-4">
          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <Badge className="border-none bg-emerald-500/10 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-600">
                  Blast WhatsApp
                </Badge>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Kirim campaign ke pelanggan
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
                  Blast tersimpan di audit log tenant, jadi admin bisa tracking kapan campaign dikirim, siapa yang mengirim, dan payload pesan yang dipakai.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
              <Textarea
                value={blastMessage}
                onChange={(e) => setBlastMessage(e.target.value)}
                className="min-h-56 rounded-xl border-slate-200 bg-slate-50 text-sm dark:border-white/5 dark:bg-white/5"
                placeholder="Tulis pesan blast..."
                disabled={!isProActive}
              />

              <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/5">
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  Checklist
                </div>
                <div className="space-y-2 text-sm text-slate-500">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    Tenant harus plan Pro dan active
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    Pesan harus singkat dan jelas
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    Gunakan placeholder {`{nama pelanggan}`}
                  </div>
                </div>
                <Button onClick={handleBlast} disabled={busy || !isProActive} className="w-full gap-2">
                  <Megaphone className="h-4 w-4" />
                  {busy ? "Mengirim..." : "Blast Sekarang"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  History Campaign
                </h2>
                <p className="text-sm text-slate-500">
                  Activity log untuk import pelanggan dan blast.
                </p>
              </div>
              <Badge variant="secondary">{blastHistory.length} record</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {blastHistory.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10">
                  Belum ada history campaign.
                </div>
              ) : (
                blastHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-white/5"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-950 dark:text-white">
                          {item.action === "customer_blast" ? "Blast WhatsApp" : "Import Pelanggan"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.actor_name || "System"} {item.actor_email ? `(${item.actor_email})` : ""} • {formatDate(item.created_at)}
                        </div>
                      </div>
                      <Badge variant="outline">{item.resource_type}</Badge>
                    </div>
                    <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      {item.metadata || "-"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
        {value}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/70 px-2 py-1 text-slate-700 dark:bg-white/5 dark:text-slate-200">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
