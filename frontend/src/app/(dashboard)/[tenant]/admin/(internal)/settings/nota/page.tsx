"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AxiosError } from "axios";
import {
  Bluetooth,
  CheckCircle2,
  Copy,
  Edit3,
  Lock,
  Printer,
  Save,
  Smartphone,
  Unplug,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { analyzeTenantFeatureAccess, formatPlanLabel, hasTenantFeature } from "@/lib/plan-access";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { PlanFeatureCallout } from "@/components/dashboard/plan-feature-ux";

type ReceiptSettings = {
  receipt_title?: string;
  receipt_subtitle?: string;
  receipt_footer?: string;
  receipt_whatsapp_text?: string;
  receipt_template?: string;
  receipt_channel?: string;
  printer_enabled?: boolean;
  printer_name?: string;
  printer_mode?: string;
  printer_endpoint?: string;
  printer_auto_print?: boolean;
  printer_status?: string;
  whatsapp_number?: string;
  name?: string;
  plan?: string;
  subscription_status?: string;
  plan_features?: string[];
};

type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice: (options: { acceptAllDevices: boolean; optionalServices?: string[] }) => Promise<{
      id: string;
      name?: string | null;
      gatt?: {
        connect: () => Promise<unknown>;
        disconnect?: () => void;
      } | null;
    }>;
  };
};

type BluetoothDeviceSession = {
  id: string;
  name: string;
  connect: () => Promise<boolean>;
  disconnect: () => void;
};

const defaultTemplate = [
  "=== {receipt_title} ===",
  "{receipt_subtitle}",
  "",
  "Kasir     : {cashier_name}",
  "Pelanggan : {customer_name}",
  "Booking   : {booking_id}",
  "Unit      : {resource_name}",
  "",
  "Total     : {grand_total}",
  "DP        : {deposit_amount}",
  "Dibayar   : {paid_amount}",
  "Sisa      : {balance_due}",
  "",
  "{receipt_footer}",
].join("\n");

const sampleReceipt = {
  receipt_title: "Struk Bookinaja",
  receipt_subtitle: "Bukti transaksi resmi",
  cashier_name: "Admin",
  customer_name: "Helwiza",
  booking_id: "BK-1024",
  resource_name: "Lapangan Futsal",
  grand_total: "Rp 150.000",
  deposit_amount: "Rp 50.000",
  paid_amount: "Rp 150.000",
  balance_due: "Rp 0",
  receipt_footer: "Terima kasih sudah berkunjung",
};

export default function ReceiptPrinterSettingsPage() {
  const { user } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isEditingReceipt, setIsEditingReceipt] = useState(false);
  const [savedData, setSavedData] = useState<ReceiptSettings>({ receipt_template: defaultTemplate });
  const [draft, setDraft] = useState<ReceiptSettings>({ receipt_template: defaultTemplate });
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<"idle" | "selected" | "connected" | "disconnected">("idle");
  const bluetoothSessionRef = useRef<BluetoothDeviceSession | null>(null);
  const planGate = useMemo(
    () => analyzeTenantFeatureAccess(user || {}, { feature: "advanced_receipt_branding" }),
    [user],
  );
  const featureLocked = planGate.state !== "available";

  useEffect(() => {
    let active = true;
    if (featureLocked) {
      const nextData = normalizeSettings({
        receipt_template: defaultTemplate,
        plan: user?.plan,
        subscription_status: user?.subscription_status,
        plan_features: user?.plan_features || [],
      });
      setSavedData(nextData);
      setDraft(nextData);
      setLoading(false);
      return () => {
        active = false;
      };
    }
    api
      .get("/admin/receipt-settings")
      .then((res) => {
        if (!active) return;
        const nextData = normalizeSettings(res.data || {});
        setSavedData(nextData);
        setDraft(nextData);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setMessage("Gagal memuat pengaturan nota.");
        }
      });
    return () => {
      active = false;
    };
  }, [featureLocked, user?.plan, user?.plan_features, user?.subscription_status]);

  const bluetoothAvailable = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.isSecureContext && "bluetooth" in navigator;
  }, []);

  const printerStatus = useMemo(() => {
    if (connectionState === "connected") return "Terhubung";
    if (connectionState === "selected") return "Printer dipilih";
    if (connectionState === "disconnected") return "Terputus";
    if (savedData.printer_enabled) return "Siap dipakai";
    return "Nonaktif";
  }, [connectionState, savedData.printer_enabled]);

  const previewText = useMemo(() => renderTemplate(draft.receipt_template || defaultTemplate, draft), [draft]);
  const isProActive = useMemo(() => {
    return hasTenantFeature(savedData, "advanced_receipt_branding");
  }, [savedData]);

  const setField = (key: keyof ReceiptSettings, value: string | boolean) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const persistSettings = async (nextData: ReceiptSettings, note: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = normalizeSettings({
        ...nextData,
        printer_mode: "bluetooth",
        printer_endpoint: "",
        receipt_channel: nextData.printer_enabled ? "printer" : "whatsapp",
      });
      const res = await api.put("/admin/receipt-settings", payload);
      const updated = normalizeSettings(res.data?.data || payload);
      setSavedData(updated);
      setDraft(updated);
      setIsEditingReceipt(false);
      setMessage(note);
    } catch (error) {
      const err = error as AxiosError<{ error?: string }>;
      setMessage(err.response?.data?.error || "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  };

  const saveReceiptTemplate = async () => {
    await persistSettings(draft, "Template nota berhasil disimpan.");
  };

  const savePrinterSettings = async (nextData: ReceiptSettings) => {
    await persistSettings(nextData, "Pengaturan printer berhasil disimpan.");
  };

  const cancelReceiptEdit = () => {
    setDraft(savedData);
    setIsEditingReceipt(false);
    setMessage(null);
  };

  const openBluetoothPicker = async () => {
    if (!isProActive) {
      setMessage("Printer dan penggunaan nota belum aktif di plan tenant ini.");
      return;
    }
    setScanning(true);
    setMessage(null);
    try {
      const nav = navigator as BluetoothNavigator;
      if (!nav.bluetooth) {
        setMessage("Bluetooth belum tersedia di browser ini. Gunakan Chrome/Edge lewat HTTPS atau localhost.");
        return;
      }

      const device = await nav.bluetooth.requestDevice({ acceptAllDevices: true });
      const name = device.name || "Bluetooth Printer";
      setSelectedDeviceId(device.id);
      setSelectedDeviceName(name);
      setConnectionState("selected");
      bluetoothSessionRef.current = {
        id: device.id,
        name,
        connect: async () => Boolean(await device.gatt?.connect()),
        disconnect: () => device.gatt?.disconnect?.(),
      };

      const nextData = normalizeSettings({
        ...draft,
        printer_enabled: true,
        printer_mode: "bluetooth",
        printer_name: name,
        printer_status: "selected",
      });
      setDraft(nextData);
      await savePrinterSettings(nextData);
    } catch (error) {
      const err = error as Error;
      if (err.name !== "NotFoundError" && err.name !== "AbortError") {
        setMessage("Gagal membuka pilihan printer Bluetooth.");
      }
    } finally {
      setScanning(false);
    }
  };

  const connectSelectedBluetooth = async () => {
    if (!isProActive) {
      setMessage("Printer dan penggunaan nota belum aktif di plan tenant ini.");
      return;
    }
    setConnecting(true);
    setMessage(null);
    try {
      const session = bluetoothSessionRef.current;
      if (!session) {
        setMessage("Pilih printer Bluetooth dulu.");
        return;
      }

      const connected = await session.connect();
      if (!connected) {
        setMessage("Printer tidak merespons saat koneksi dicoba.");
        return;
      }

      setConnectionState("connected");
      const nextData = normalizeSettings({
        ...draft,
        printer_enabled: true,
        printer_mode: "bluetooth",
        printer_name: session.name,
        printer_status: "connected",
      });
      setDraft(nextData);
      await savePrinterSettings(nextData);
    } catch (error) {
      const err = error as Error;
      if (err.name !== "NotFoundError" && err.name !== "AbortError") {
        setMessage("Gagal menghubungkan printer Bluetooth.");
      }
    } finally {
      setConnecting(false);
    }
  };

  const disconnectBluetooth = async () => {
    setDisconnecting(true);
    setMessage(null);
    try {
      bluetoothSessionRef.current?.disconnect();
      bluetoothSessionRef.current = null;
      setSelectedDeviceId(null);
      setSelectedDeviceName(null);
      setConnectionState("disconnected");
      const nextData = normalizeSettings({
        ...draft,
        printer_enabled: false,
        printer_mode: "bluetooth",
        printer_status: "disconnected",
      });
      setDraft(nextData);
      await savePrinterSettings(nextData);
    } finally {
      setDisconnecting(false);
    }
  };

  const toggleAutoPrint = async (enabled: boolean) => {
    if (!isProActive) {
      setMessage("Auto print belum aktif di plan tenant ini.");
      return;
    }
    const nextData = normalizeSettings({
      ...draft,
      printer_auto_print: enabled,
    });
    setDraft(nextData);
    await savePrinterSettings(nextData);
  };

  const onCopyWhatsApp = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(draft.receipt_whatsapp_text || "Berikut struk transaksi Anda dari Bookinaja.");
      setMessage("Teks WhatsApp nota disalin.");
    } catch {
      setMessage("Gagal menyalin teks WhatsApp.");
    } finally {
      setCopying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Memuat pengaturan nota...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
      <PlanFeatureCallout
        input={user || {}}
        title="Receipt branding dan printer"
        description="Template nota premium dan printer workflow sebaiknya diberi konteks plan yang jelas sebelum owner mulai merapikan output transaksi."
        requirement={{ feature: "advanced_receipt_branding" }}
      />
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              Nota
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Pengaturan Nota
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              Atur template struk, pesan WhatsApp, dan printer Bluetooth.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-auto">
            <StatusPill label="Printer" value={printerStatus} active={!!savedData.printer_enabled} />
            <StatusPill label="Paket" value={formatPlanLabel(savedData.plan)} active={isProActive} />
          </div>
        </div>
      </section>

      {!isProActive && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="text-sm font-semibold">Nota WA dan print fisik mengikuti entitlement plan aktif.</div>
              <p className="mt-1 text-xs leading-5 opacity-80">
                Kamu tetap bisa cek template dan alur pengaturannya, tapi tombol kirim/cetak nota di booking dan POS akan terkunci sampai upgrade.
              </p>
            </div>
          </div>
          <Button asChild className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]">
            <Link href="/admin/settings/billing/subscribe">Upgrade Pro</Link>
          </Button>
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Card className="rounded-[1.5rem] border-slate-200 shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Printer className="h-4 w-4 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]" />
                Printer Bluetooth
              </CardTitle>
              <CardDescription>
                Pilih printer, lalu tes koneksi kalau perlu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Printer terpilih</div>
                <div className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                  {selectedDeviceName || draft.printer_name || "Belum ada printer"}
                </div>
                <div className="mt-1 break-all text-xs text-slate-500">
                  {selectedDeviceId || (draft.printer_enabled ? "Tersimpan dari sesi sebelumnya" : "Klik Pilih Printer untuk mulai")}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" className="h-10 rounded-xl" onClick={openBluetoothPicker} disabled={scanning || saving || !bluetoothAvailable || !isProActive}>
                  <Bluetooth className="mr-2 h-4 w-4" />
                  {scanning ? "Membuka..." : "Pilih Printer"}
                </Button>
                <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={connectSelectedBluetooth} disabled={connecting || saving || !bluetoothAvailable || !isProActive}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {connecting ? "Connect..." : "Test Connect"}
                </Button>
                <Button type="button" variant="outline" onClick={disconnectBluetooth} disabled={disconnecting || saving || !isProActive} className="h-10 rounded-xl sm:col-span-2">
                  <Unplug className="mr-2 h-4 w-4" />
                  {disconnecting ? "Memutus..." : "Matikan Printer"}
                </Button>
              </div>

              {!bluetoothAvailable && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  Web Bluetooth hanya aktif di Chrome/Edge lewat HTTPS atau localhost.
                </div>
              )}

              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-white/10">
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">Auto print saat lunas</div>
                  <div className="text-xs text-slate-500">Kalau aktif, nota siap dicetak setelah pembayaran lunas.</div>
                </div>
                <Switch checked={!!draft.printer_auto_print} onCheckedChange={toggleAutoPrint} disabled={saving || !isProActive} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-slate-200 shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="h-4 w-4 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]" />
                Pesan WhatsApp
              </CardTitle>
              <CardDescription>Teks singkat yang dipakai saat staf kirim nota.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditingReceipt ? (
                <Textarea
                  value={draft.receipt_whatsapp_text || ""}
                  onChange={(event) => setField("receipt_whatsapp_text", event.target.value)}
                  className="min-h-28"
                />
              ) : (
                <div className="rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-700 dark:border-white/10 dark:text-slate-300">
                  {draft.receipt_whatsapp_text || "Berikut struk transaksi Anda dari Bookinaja."}
                </div>
              )}
              <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={onCopyWhatsApp} disabled={copying}>
                <Copy className="mr-2 h-4 w-4" />
                {copying ? "Menyalin..." : "Salin Pesan"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-[1.5rem] border-slate-200 shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">Template Nota</CardTitle>
                  <CardDescription>View dulu. Edit hanya kalau memang perlu.</CardDescription>
                </div>
                {isEditingReceipt ? (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={cancelReceiptEdit} disabled={saving}>
                      <X className="mr-2 h-4 w-4" />
                      Batal
                    </Button>
                    <Button type="button" size="sm" className="rounded-xl" onClick={saveReceiptTemplate} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setIsEditingReceipt(true)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Template
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditingReceipt ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Judul nota">
                      <Input value={draft.receipt_title || ""} onChange={(event) => setField("receipt_title", event.target.value)} />
                    </Field>
                    <Field label="Subjudul">
                      <Input value={draft.receipt_subtitle || ""} onChange={(event) => setField("receipt_subtitle", event.target.value)} />
                    </Field>
                  </div>
                  <Field label="Footer">
                    <Input value={draft.receipt_footer || ""} onChange={(event) => setField("receipt_footer", event.target.value)} />
                  </Field>
                  <Field label="Template cetak">
                    <Textarea
                      value={draft.receipt_template || ""}
                      onChange={(event) => setField("receipt_template", event.target.value)}
                      className="min-h-56 font-mono text-xs"
                    />
                  </Field>
                  <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs leading-5 text-slate-500 dark:border-white/10 dark:text-slate-300">
                    Placeholder yang umum: {"{receipt_title}"}, {"{customer_name}"}, {"{resource_name}"}, {"{grand_total}"}, {"{paid_amount}"}, {"{balance_due}"}.
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <ReadField label="Judul" value={draft.receipt_title || "Struk Bookinaja"} />
                  <ReadField label="Subjudul" value={draft.receipt_subtitle || "Bukti transaksi resmi"} />
                  <ReadField label="Footer" value={draft.receipt_footer || "Terima kasih sudah berkunjung"} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-slate-200 shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">Preview Nota</CardTitle>
              <CardDescription>Pakai contoh transaksi supaya format mudah dicek.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
                <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-slate-800 dark:text-slate-100">
                  {previewText}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function normalizeSettings(data: ReceiptSettings): ReceiptSettings {
  return {
    ...data,
    receipt_title: data.receipt_title || "Struk Bookinaja",
    receipt_subtitle: data.receipt_subtitle || "Bukti transaksi resmi",
    receipt_footer: data.receipt_footer || "Terima kasih sudah berkunjung",
    receipt_whatsapp_text: data.receipt_whatsapp_text || "Berikut struk transaksi Anda dari Bookinaja.",
    receipt_template: data.receipt_template || defaultTemplate,
    receipt_channel: data.receipt_channel || "whatsapp",
    printer_mode: "bluetooth",
    printer_endpoint: "",
    printer_status: data.printer_status || "disconnected",
  };
}

function renderTemplate(template: string, data: ReceiptSettings) {
  const values = {
    ...sampleReceipt,
    receipt_title: data.receipt_title || sampleReceipt.receipt_title,
    receipt_subtitle: data.receipt_subtitle || sampleReceipt.receipt_subtitle,
    receipt_footer: data.receipt_footer || sampleReceipt.receipt_footer,
  };

  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template || defaultTemplate,
  );
}

function StatusPill({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={cn("mt-1 text-sm font-semibold", active ? "text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]" : "text-slate-950 dark:text-white")}>
        {value}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}
