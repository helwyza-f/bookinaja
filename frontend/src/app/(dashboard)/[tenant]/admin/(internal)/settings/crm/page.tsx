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
  Lock,
  Megaphone,
  RefreshCw,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
};

type LegacyContact = {
  id: string;
  name: string;
  phone: string;
  blast_count?: number;
  last_blast_at?: string;
  updated_at?: string;
};

type ImportRow = {
  name: string;
  phone: string;
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
};

type TenantProfile = {
  plan?: string;
  subscription_status?: string;
};

const LEGACY_TEMPLATE = "name,phone\n";
const LEGACY_MESSAGE =
  "Halo {nama pelanggan}, sekarang kami sudah pakai Bookinaja. Untuk booking berikutnya kamu bisa pakai sistem baru kami ya.";
const ACTIVE_MESSAGE =
  "Halo {nama pelanggan}, terima kasih sudah booking di tempat kami. Pantau info booking dan promo terbaru lewat Bookinaja.";

const parseCSV = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const parseImportRows = (text: string): ImportRow[] => {
  const lines = parseCSV(text);
  if (lines.length <= 1) return [];
  return lines.slice(1).map((line) => {
    const [name = "", phone = ""] = line.split(",").map((item) => item.trim());
    return { name, phone };
  });
};

const getIssues = (row: ImportRow) => {
  const issues: string[] = [];
  if (!row.name.trim()) issues.push("nama kosong");
  if (!row.phone.trim()) issues.push("nomor kosong");
  if (row.phone && !/^\+?[0-9][0-9\s-]{6,}$/.test(row.phone.trim())) {
    issues.push("format nomor perlu dicek");
  }
  return issues;
};

const formatDate = (value?: string) => {
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
};

export default function SettingsCRMPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [legacyContacts, setLegacyContacts] = useState<LegacyContact[]>([]);
  const [activity, setActivity] = useState<AuditRow[]>([]);
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState(LEGACY_TEMPLATE);
  const [legacyMessage, setLegacyMessage] = useState(LEGACY_MESSAGE);
  const [activeMessage, setActiveMessage] = useState(ACTIVE_MESSAGE);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");

  const isProActive = useMemo(() => {
    const plan = String(profile?.plan || "").toLowerCase().trim();
    const status = String(profile?.subscription_status || "").toLowerCase().trim();
    return plan === "pro" && status === "active";
  }, [profile]);

  const importRows = useMemo(() => parseImportRows(importText), [importText]);
  const importWarnings = useMemo(
    () => importRows.filter((row) => getIssues(row).length > 0).length,
    [importRows],
  );
  const crmHistory = useMemo(
    () =>
      activity.filter((item) =>
        ["legacy_customer_import", "legacy_customer_blast", "customer_blast"].includes(item.action),
      ),
    [activity],
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [custRes, legacyRes, activityRes, profileRes] = await Promise.all([
        api.get("/customers"),
        api.get("/admin/settings/customers/legacy"),
        api.get("/admin/settings/activity?limit=50"),
        api.get("/admin/profile"),
      ]);
      setCustomers(custRes.data || []);
      setLegacyContacts(legacyRes.data?.items || []);
      setActivity(activityRes.data?.items || []);
      setProfile(profileRes.data || null);
    } catch {
      toast.error("Gagal memuat CRM");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const downloadTemplate = () => {
    const blob = new Blob([LEGACY_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bookinaja-pelanggan-lama.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("File harus .csv");
      return;
    }
    setSelectedFileName(file.name);
    const text = await file.text();
    setImportText(text.trim() ? text : LEGACY_TEMPLATE);
  };

  const handleImportLegacy = async () => {
    if (!isProActive) {
      toast.error("Migrasi pelanggan lama hanya tersedia di Pro active");
      return;
    }
    if (importRows.length === 0) {
      toast.error("Tambahkan minimal 1 pelanggan lama");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post("/admin/settings/customers/import", { rows: importRows });
      setImportResult(res.data);
      toast.success("Pelanggan lama disimpan");
      await loadAll();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal menyimpan pelanggan lama");
    } finally {
      setBusy(false);
    }
  };

  const handleBlast = async (target: "legacy" | "active") => {
    if (!isProActive) {
      toast.error("Blast CRM hanya tersedia di Pro active");
      return;
    }
    const message = target === "legacy" ? legacyMessage : activeMessage;
    if (!message.trim()) {
      toast.error("Pesan blast tidak boleh kosong");
      return;
    }
    setBusy(true);
    try {
      await api.post("/admin/settings/customers/blast", { target, message });
      toast.success(target === "legacy" ? "Blast migrasi dikirim" : "Blast pelanggan aktif dikirim");
      await loadAll();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal mengirim blast");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-20 sm:p-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Users className="h-4 w-4" />
            CRM & Marketing
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Pisahkan migrasi dan operasional
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Pelanggan aktif adalah customer yang sudah booking di Bookinaja. Pelanggan lama hanya daftar kontak migrasi untuk diberi tahu via WhatsApp, bukan akun customer.
          </p>
        </div>
        <Button variant="outline" onClick={loadAll} className="w-fit gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Pelanggan aktif" value={loading ? "-" : String(customers.length)} />
        <Metric label="Pelanggan lama" value={loading ? "-" : String(legacyContacts.length)} />
        <Metric label="Plan" value={(profile?.plan || "-").toUpperCase()} />
        <Metric label="Campaign" value={String(crmHistory.length)} />
      </div>

      {!isProActive && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="text-sm font-semibold">Migrasi dan blast CRM tersedia di paket Pro.</div>
              <p className="mt-1 text-xs leading-5 opacity-80">
                Halaman tetap bisa diakses agar benefit Pro jelas, tapi import dan blast terkunci sampai upgrade.
              </p>
            </div>
          </div>
          <Button asChild className="w-fit rounded-xl bg-slate-950 text-white hover:bg-slate-800">
            <Link href="/admin/settings/billing/subscribe">Upgrade Pro</Link>
          </Button>
        </div>
      )}

      <Tabs defaultValue="migration" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[560px]">
          <TabsTrigger value="migration">Migrasi</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="migration" className="space-y-4">
          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <SectionHeader
              icon={<FileUp className="h-5 w-5" />}
              label="Pelanggan lama"
              title="Input kontak lama untuk migrasi"
              description="CSV cukup nama dan nomor HP. Data ini tidak membuat akun Bookinaja dan tidak masuk ke tabel customers aktif."
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10">
                    <Upload className="h-4 w-4" />
                    Upload CSV
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => handleFileUpload(event.target.files?.[0] || null)} />
                  </label>
                  <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                    <Download className="h-4 w-4" />
                    Template
                  </Button>
                </div>
                {selectedFileName && <div className="text-xs text-slate-500">File: {selectedFileName}</div>}
                <Textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  className="min-h-64 rounded-xl bg-slate-50 font-mono text-sm dark:bg-white/5"
                  placeholder="name,phone"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">
                    {importRows.length} baris
                    {importWarnings > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {importWarnings} perlu dicek
                      </span>
                    )}
                  </div>
                  <Button onClick={handleImportLegacy} disabled={busy || !isProActive} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Simpan pelanggan lama
                  </Button>
                </div>
                {importResult && (
                  <ResultBox result={importResult} label="Import pelanggan lama selesai" />
                )}
              </div>

              <Preview rows={importRows} />
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <SectionHeader
              icon={<Megaphone className="h-5 w-5" />}
              label="Blast migrasi"
              title="Kirim pengumuman ke pelanggan lama"
              description="Target blast ini hanya kontak legacy yang kamu import di tab migrasi."
            />
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
              <Textarea
                value={legacyMessage}
                onChange={(event) => setLegacyMessage(event.target.value)}
                className="min-h-44 rounded-xl bg-slate-50 text-sm dark:bg-white/5"
              />
              <div className="rounded-xl border border-slate-200 p-4 dark:border-white/5">
                <Metric label="Target legacy" value={String(legacyContacts.length)} compact />
                <Button onClick={() => handleBlast("legacy")} disabled={busy || !isProActive} className="mt-4 w-full gap-2">
                  <Megaphone className="h-4 w-4" />
                  Blast pelanggan lama
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="operational" className="space-y-4">
          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <SectionHeader
              icon={<Users className="h-5 w-5" />}
              label="Pelanggan aktif"
              title="Blast operational ke customer tenant"
              description="Target ini adalah customer yang benar-benar sudah booking di tenant ini. Beda dari pelanggan lama migrasi."
            />
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
              <Textarea
                value={activeMessage}
                onChange={(event) => setActiveMessage(event.target.value)}
                className="min-h-44 rounded-xl bg-slate-50 text-sm dark:bg-white/5"
              />
              <div className="rounded-xl border border-slate-200 p-4 dark:border-white/5">
                <Metric label="Target aktif" value={String(customers.length)} compact />
                <Button onClick={() => handleBlast("active")} disabled={busy || !isProActive} className="mt-4 w-full gap-2">
                  <Megaphone className="h-4 w-4" />
                  Blast pelanggan aktif
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">Sample pelanggan aktif</h2>
              <Badge variant="secondary">{customers.length} customer</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {customers.slice(0, 8).map((customer) => (
                <ContactRow key={customer.id} name={customer.name} phone={customer.phone} />
              ))}
              {customers.length === 0 && <EmptyText text="Belum ada pelanggan aktif dari booking tenant ini." />}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">History CRM</h2>
                <p className="text-sm text-slate-500">Import legacy, blast legacy, dan blast pelanggan aktif.</p>
              </div>
              <Badge variant="secondary">{crmHistory.length} record</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {crmHistory.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-white/5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium text-slate-950 dark:text-white">{labelAction(item.action)}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.actor_name || "System"} • {formatDate(item.created_at)}</div>
                    </div>
                    <Badge variant="outline">{item.resource_type}</Badge>
                  </div>
                  <div className="mt-3 break-words text-sm text-slate-600 dark:text-slate-300">{item.metadata || "-"}</div>
                </div>
              ))}
              {crmHistory.length === 0 && <EmptyText text="Belum ada aktivitas CRM." />}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionHeader({ icon, label, title, description }: { icon: React.ReactNode; label: string; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">{icon}</div>
      <div>
        <Badge className="border-none bg-blue-600 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">{label}</Badge>
        <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <Card className={compact ? "border-0 bg-transparent p-0 shadow-none" : "border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a]"}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className={compact ? "mt-2 text-2xl font-semibold text-slate-950 dark:text-white" : "mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white"}>{value}</div>
    </Card>
  );
}

function Preview({ rows }: { rows: ImportRow[] }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/5">
      <div className="text-sm font-semibold text-slate-950 dark:text-white">Preview kontak legacy</div>
      <Separator />
      <div className="max-h-80 space-y-2 overflow-auto pr-1">
        {rows.map((row, index) => {
          const issues = getIssues(row);
          return (
            <div key={`${index}-${row.phone}`} className="rounded-lg border border-slate-200 p-3 dark:border-white/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-950 dark:text-white">{row.name || "Tanpa nama"}</div>
                  <div className="mt-1 text-xs text-slate-500">{row.phone || "-"}</div>
                </div>
                <Badge variant={issues.length > 0 ? "destructive" : "secondary"}>{issues.length > 0 ? "Cek" : "OK"}</Badge>
              </div>
              {issues.length > 0 && <div className="mt-2 text-xs text-amber-600">{issues.join(", ")}</div>}
            </div>
          );
        })}
        {rows.length === 0 && <EmptyText text="Belum ada data legacy." />}
      </div>
    </div>
  );
}

function ResultBox({ result, label }: { result: ImportResult; label: string }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200">
      <div className="flex items-center gap-2 font-semibold">
        <CheckCircle2 className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <span>Total {result.total}</span>
        <span>Simpan {result.created}</span>
        <span>Update {result.updated}</span>
        <span>Skip {result.skipped}</span>
        <span>Gagal {result.failed}</span>
      </div>
    </div>
  );
}

function ContactRow({ name, phone }: { name: string; phone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-white/5">
      <div className="font-medium text-slate-950 dark:text-white">{name || "Customer"}</div>
      <div className="mt-1 text-xs text-slate-500">{phone || "-"}</div>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10">{text}</div>;
}

function labelAction(action: string) {
  if (action === "legacy_customer_import") return "Import pelanggan lama";
  if (action === "legacy_customer_blast") return "Blast pelanggan lama";
  if (action === "customer_blast") return "Blast pelanggan aktif";
  return action;
}
