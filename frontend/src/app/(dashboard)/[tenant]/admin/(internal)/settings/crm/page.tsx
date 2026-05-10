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
  ArrowRight,
  CheckCircle2,
  Download,
  FileUp,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";

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

type SubscriptionProfile = {
  plan?: string;
  status?: string;
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
  const [profile, setProfile] = useState<SubscriptionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState(LEGACY_TEMPLATE);
  const [legacyMessage, setLegacyMessage] = useState(LEGACY_MESSAGE);
  const [activeMessage, setActiveMessage] = useState(ACTIVE_MESSAGE);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

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
  const recentLegacyContacts = useMemo(() => legacyContacts.slice(0, 6), [legacyContacts]);
  const recentCustomers = useMemo(() => customers.slice(0, 6), [customers]);
  const latestCrmActivity = crmHistory[0];

  const loadAll = async () => {
    setLoading(true);
    try {
      const [custRes, legacyRes, activityRes, profileRes] = await Promise.all([
        api.get("/customers"),
        api.get("/admin/settings/customers/legacy"),
        api.get("/admin/settings/activity?limit=50"),
        api.get("/billing/subscription"),
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
    void loadAll();
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
    <div className="space-y-4 p-4 pb-20 sm:space-y-6 sm:p-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))] p-5 shadow-sm dark:border-white/12 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(8,47,73,0.94))]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--bookinaja-700)] dark:border-[rgba(96,165,250,0.24)] dark:bg-[rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]">
              <Sparkles className="h-3.5 w-3.5" />
              CRM Workspace
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              CRM Workspace
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:max-w-2xl">
              Import legacy, campaigns, dan history.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadAll()} className="rounded-xl">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              onClick={() => setActiveTab("campaigns")}
              className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
            >
              <Megaphone className="mr-2 h-4 w-4" />
              Buka Campaign
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Aktif"
          value={loading ? "-" : String(customers.length)}
          hint="customer tenant"
        />
        <MetricCard
          label="Legacy"
          value={loading ? "-" : String(legacyContacts.length)}
          hint="kontak impor"
        />
        <MetricCard
          label="History"
          value={String(crmHistory.length)}
          hint={`${String(profile?.plan || "-").toUpperCase()} / ${String(profile?.status || "-").toUpperCase()}`}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[760px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="import">Import Legacy</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-[1.75rem] border-slate-200 bg-white p-5 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                    Separation of concern
                  </div>
                  <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                    Tiga workflow utama CRM
                  </h2>
                </div>
                <Badge variant="secondary">{crmHistory.length} activity</Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <WorkflowCard
                  title="Legacy import"
                  description="Tarik kontak lama dari CSV, validasi, lalu simpan ke bucket legacy."
                  detail={`${importRows.length} baris draft`}
                  actionLabel="Buka import"
                  onClick={() => setActiveTab("import")}
                />
                <WorkflowCard
                  title="Campaigns"
                  description="Kelola blast untuk legacy contacts dan pelanggan aktif tenant."
                  detail={`${legacyContacts.length + customers.length} total audience`}
                  actionLabel="Buka campaign"
                  onClick={() => setActiveTab("campaigns")}
                />
                <WorkflowCard
                  title="History"
                  description="Audit import dan blast yang pernah dijalankan tim."
                  detail={latestCrmActivity ? labelAction(latestCrmActivity.action) : "Belum ada history"}
                  actionLabel="Lihat history"
                  onClick={() => setActiveTab("history")}
                />
              </div>
            </Card>

            <Card className="rounded-[1.75rem] border-slate-200 bg-white p-5 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                Status workspace
              </div>
              <div className="mt-4 space-y-3">
                <StatusRow label="Import draft" value={`${importRows.length} baris`} />
                <StatusRow label="Warning import" value={importWarnings ? `${importWarnings} issue` : "Aman"} />
                <StatusRow label="Legacy contacts" value={`${legacyContacts.length} kontak`} />
                <StatusRow label="Active customers" value={`${customers.length} customer`} />
                <StatusRow
                  label="Last CRM activity"
                  value={latestCrmActivity ? formatDate(latestCrmActivity.created_at) : "-"}
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <AudiencePanel
              title="Legacy contacts"
              eyebrow="Untuk migrasi"
              emptyText="Belum ada kontak legacy."
              items={recentLegacyContacts.map((item) => ({
                id: item.id,
                name: item.name,
                phone: item.phone,
                meta: item.last_blast_at ? `Blast terakhir ${formatDate(item.last_blast_at)}` : "Belum pernah diblast",
              }))}
            />
            <AudiencePanel
              title="Pelanggan aktif"
              eyebrow="Untuk campaign tenant"
              emptyText="Belum ada pelanggan aktif."
              items={recentCustomers.map((item) => ({
                id: item.id,
                name: item.name,
                phone: item.phone,
                meta: "Source: booking tenant",
              }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-[1.75rem] border-slate-200 bg-white p-5 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
              <SectionHeader
                icon={<FileUp className="h-5 w-5" />}
                label="Legacy import"
                title="Import kontak pelanggan lama"
                description="Satu workflow khusus untuk migrasi CSV supaya tidak campur dengan blast."
              />

              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                  >
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                      <Upload className="h-4 w-4 text-[var(--bookinaja-600)]" />
                      Upload CSV
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(event) => void handleFileUpload(event.target.files?.[0] || null)}
                      />
                    </label>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {selectedFileName || "Pilih file .csv untuk kontak lama"}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                      <Download className="h-4 w-4 text-[var(--bookinaja-600)]" />
                      Download template
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Header wajib: `name,phone`
                    </div>
                  </button>
                </div>

                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Contoh CSV
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded-[1rem] bg-white px-3 py-3 font-mono text-xs leading-6 text-slate-700 ring-1 ring-slate-200 dark:bg-[#0f172a] dark:text-slate-200 dark:ring-white/10">{`name,phone
Rani,+628123456789
Budi,081234567890`}</pre>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Satu baris per kontak. Jangan pakai kolom tambahan.
                  </div>
                </div>

                <Textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  className="min-h-72 rounded-[1.35rem] bg-slate-50 font-mono text-sm dark:bg-slate-900/30"
                  placeholder="name,phone"
                />

                <div className="grid grid-cols-3 gap-3">
                  <MiniMetric label="Draft rows" value={String(importRows.length)} />
                  <MiniMetric label="Warnings" value={String(importWarnings)} />
                  <MiniMetric label="Legacy saved" value={String(legacyContacts.length)} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Import akan tetap diverifikasi backend sesuai rules tenant.
                  </div>
                  <Button
                    onClick={() => void handleImportLegacy()}
                    disabled={busy}
                    className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Simpan legacy contacts
                  </Button>
                </div>

                {importResult ? (
                  <ResultBox result={importResult} label="Import pelanggan lama selesai" />
                ) : null}
              </div>
            </Card>

            <Card className="rounded-[1.75rem] border-slate-200 bg-white p-5 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                Preview & validation
              </div>
              <div className="mt-4">
                <Preview rows={importRows} />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <CampaignComposer
              title="Blast legacy contacts"
              eyebrow="Audience legacy"
              description="Kirim pengumuman migrasi atau reaktivasi ke kontak pelanggan lama."
              audienceCount={legacyContacts.length}
              message={legacyMessage}
              onChangeMessage={setLegacyMessage}
              onSubmit={() => void handleBlast("legacy")}
              busy={busy}
              helper="Pesan ini dikirim ke bucket legacy contacts."
            />

            <CampaignComposer
              title="Blast pelanggan aktif"
              eyebrow="Audience aktif"
              description="Kirim pengumuman ke customer tenant yang sudah pernah booking."
              audienceCount={customers.length}
              message={activeMessage}
              onChangeMessage={setActiveMessage}
              onSubmit={() => void handleBlast("active")}
              busy={busy}
              helper="Pesan ini dikirim ke customer tenant aktif."
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="rounded-[1.75rem] border-slate-200 bg-white p-5 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                  CRM audit
                </div>
                <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                  History import dan campaign
                </h2>
              </div>
              <Badge variant="secondary">{crmHistory.length} record</Badge>
            </div>

            <div className="mt-5 space-y-3">
              {crmHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold text-slate-950 dark:text-white">
                        {labelAction(item.action)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {item.actor_name || "System"} • {formatDate(item.created_at)}
                      </div>
                    </div>
                    <Badge variant="outline">{item.resource_type}</Badge>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {item.metadata || "-"}
                  </div>
                </div>
              ))}
              {crmHistory.length === 0 ? <EmptyText text="Belum ada aktivitas CRM." /> : null}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionHeader({
  icon,
  label,
  title,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bookinaja-600)] text-white">
        {icon}
      </div>
      <div>
        <Badge className="border-none bg-[var(--bookinaja-600)] text-[10px] font-medium uppercase tracking-wide text-white">
          {label}
        </Badge>
        <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="rounded-[1.2rem] border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
        {value}
      </div>
      <div className="mt-2 truncate text-[11px] text-slate-400">{hint}</div>
    </Card>
  );
}

function WorkflowCard({
  title,
  description,
  detail,
  actionLabel,
  onClick,
}: {
  title: string;
  description: string;
  detail: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:border-[var(--bookinaja-300)] hover:bg-[var(--bookinaja-50)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[rgba(96,165,250,0.24)] dark:hover:bg-[rgba(59,130,246,0.08)]"
    >
      <div className="text-sm font-semibold text-slate-950 dark:text-white">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-400">{detail}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-950 dark:text-white">{value}</span>
    </div>
  );
}

function AudiencePanel({
  title,
  eyebrow,
  items,
  emptyText,
}: {
  title: string;
  eyebrow: string;
  items: Array<{ id: string; name: string; phone: string; meta: string }>;
  emptyText: string;
}) {
  return (
    <Card className="rounded-[1.75rem] border-slate-200 bg-white p-5 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950 dark:text-white">
        {title}
      </h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="font-medium text-slate-950 dark:text-white">{item.name || "Tanpa nama"}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.phone || "-"}</div>
            <div className="mt-2 text-[11px] text-slate-400">{item.meta}</div>
          </div>
        ))}
        {items.length === 0 ? <EmptyText text={emptyText} /> : null}
      </div>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

function Preview({ rows }: { rows: ImportRow[] }) {
  return (
    <div className="space-y-3 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-sm font-semibold text-slate-950 dark:text-white">Preview kontak legacy</div>
      <Separator />
      <div className="max-h-[32rem] space-y-2 overflow-auto pr-1">
        {rows.map((row, index) => {
          const issues = getIssues(row);
          return (
            <div
              key={`${index}-${row.phone}`}
              className="rounded-[1.15rem] border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0f172a]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-950 dark:text-white">
                    {row.name || "Tanpa nama"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {row.phone || "-"}
                  </div>
                </div>
                <Badge variant={issues.length > 0 ? "destructive" : "secondary"}>
                  {issues.length > 0 ? "Cek" : "OK"}
                </Badge>
              </div>
              {issues.length > 0 ? (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {issues.join(", ")}
                </div>
              ) : null}
            </div>
          );
        })}
        {rows.length === 0 ? <EmptyText text="Belum ada data legacy." /> : null}
      </div>
    </div>
  );
}

function ResultBox({ result, label }: { result: ImportResult; label: string }) {
  return (
    <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200">
      <div className="flex items-center gap-2 font-semibold">
        <CheckCircle2 className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <span>Total {result.total}</span>
        <span>Simpan {result.created}</span>
        <span>Update {result.updated}</span>
        <span>Skip {result.skipped}</span>
        <span>Gagal {result.failed}</span>
      </div>
    </div>
  );
}

function CampaignComposer({
  title,
  eyebrow,
  description,
  audienceCount,
  message,
  onChangeMessage,
  onSubmit,
  busy,
  helper,
}: {
  title: string;
  eyebrow: string;
  description: string;
  audienceCount: number;
  message: string;
  onChangeMessage: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  helper: string;
}) {
  return (
    <Card className="rounded-[1.75rem] border-slate-200 bg-white p-5 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <Badge variant="secondary">{audienceCount} target</Badge>
      </div>

      <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
        {helper}
      </div>

      <Textarea
        value={message}
        onChange={(event) => onChangeMessage(event.target.value)}
        className="mt-4 min-h-48 rounded-[1.35rem] bg-slate-50 text-sm dark:bg-slate-900/30"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Placeholder <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-white/10">{"{nama pelanggan}"}</code> bisa dipakai jika backend mendukung templating.
        </div>
        <Button
          onClick={onSubmit}
          disabled={busy}
          className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
        >
          <Send className="mr-2 h-4 w-4" />
          Kirim blast
        </Button>
      </div>
    </Card>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-[1.15rem] border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
      {text}
    </div>
  );
}

function labelAction(action: string) {
  if (action === "legacy_customer_import") return "Import pelanggan lama";
  if (action === "legacy_customer_blast") return "Blast pelanggan lama";
  if (action === "customer_blast") return "Blast pelanggan aktif";
  return action;
}
