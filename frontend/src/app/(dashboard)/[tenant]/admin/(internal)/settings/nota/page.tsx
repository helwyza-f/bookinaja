"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AxiosError } from "axios";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  Bluetooth,
  CheckCircle2,
  Copy,
  Link2,
  MessageCircleMore,
  PlugZap,
  Printer,
  Save,
  Smartphone,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

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
  "Kasir: {cashier_name}",
  "Pelanggan: {customer_name}",
  "Booking: {booking_id}",
  "Unit: {resource_name}",
  "Total: {grand_total}",
  "DP: {deposit_amount}",
  "Dibayar: {paid_amount}",
  "Sisa: {balance_due}",
  "{receipt_footer}",
].join("\n");

export default function ReceiptPrinterSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | null>(null);
  const [selectedDeviceState, setSelectedDeviceState] = useState<"idle" | "picked" | "connected">("idle");
  const [connectionState, setConnectionState] = useState<"idle" | "selected" | "connected" | "disconnected">("idle");
  const [data, setData] = useState<ReceiptSettings>({ receipt_template: defaultTemplate });
  const bluetoothSessionRef = useRef<BluetoothDeviceSession | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get("/admin/receipt-settings")
      .then((res) => {
        if (!active) return;
        setData({
          ...res.data,
          receipt_template: res.data?.receipt_template || defaultTemplate,
        });
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setMessage("Gagal memuat pengaturan nota");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const channelLabel = useMemo(() => {
    const channel = String(data.receipt_channel || "whatsapp");
    if (channel === "printer") return "Printer";
    if (channel === "hybrid") return "Hybrid";
    return "WhatsApp";
  }, [data.receipt_channel]);

  const bluetoothAvailable = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.isSecureContext && "bluetooth" in navigator;
  }, []);

  const printerModeLabel = useMemo(() => {
    if (data.printer_mode === "bluetooth") return "Bluetooth";
    if (data.printer_mode === "local-bridge") return "Local bridge";
    if (data.printer_mode === "usb") return "USB";
    if (data.printer_mode === "whatsapp") return "WhatsApp";
    return data.printer_mode || "Belum dipilih";
  }, [data.printer_mode]);

  const connectionLabel = useMemo(() => {
    if (connectionState === "connected") return "Printer terhubung";
    if (connectionState === "selected") return "Printer dipilih";
    if (connectionState === "disconnected") return "Printer terputus";
    return data.printer_enabled ? "Siap dipilih" : "Nonaktif";
  }, [connectionState, data.printer_enabled]);

  const stepLabel = useMemo(() => {
    if (!bluetoothAvailable) return "Bluetooth tidak tersedia";
    if (selectedDeviceState === "connected") return "1. Device dipilih, 2. Terhubung, 3. Siap simpan";
    if (selectedDeviceState === "picked") return "1. Device dipilih, lanjut connect";
    return "1. Scan device, 2. Pilih, 3. Connect";
  }, [bluetoothAvailable, selectedDeviceState]);

  const setField = (key: keyof ReceiptSettings, value: string | boolean) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const persistSettings = async (nextData: ReceiptSettings, note?: string) => {
    try {
      const res = await api.put("/admin/receipt-settings", nextData);
      setData({
        ...res.data?.data,
        receipt_template: res.data?.data?.receipt_template || defaultTemplate,
      });
      if (note) setMessage(note);
    } catch (error) {
      const err = error as AxiosError<{ error?: string }>;
      setMessage(err.response?.data?.error || "Gagal memperbarui pengaturan");
    }
  };

  const openBluetoothPicker = async () => {
    setScanning(true);
    setMessage(null);
    try {
      const nav = navigator as BluetoothNavigator;
      if (!nav.bluetooth) {
        setMessage("Browser ini belum mendukung Web Bluetooth");
        return;
      }

      const device = await nav.bluetooth.requestDevice({ acceptAllDevices: true });
      setSelectedDeviceId(device.id);
      setSelectedDeviceName(device.name || "Bluetooth Printer");
      setSelectedDeviceState("picked");
      setConnectionState("selected");
      setField("printer_enabled", true);
      setField("printer_mode", "bluetooth");
      setField("printer_name", device.name || "Bluetooth Printer");
      setField("printer_status", "selected");
      bluetoothSessionRef.current = {
        id: device.id,
        name: device.name || "Bluetooth Printer",
        connect: async () => {
          const connected = await device.gatt?.connect();
          return Boolean(connected);
        },
        disconnect: () => device.gatt?.disconnect?.(),
      };
      setMessage(device.name ? `Device dipilih: ${device.name}` : "Device Bluetooth dipilih");
    } catch (error) {
      const err = error as Error;
      if (err.name !== "NotFoundError" && err.name !== "AbortError") {
        setMessage("Gagal membuka pemilih printer Bluetooth");
      }
    } finally {
      setScanning(false);
    }
  };

  const connectSelectedBluetooth = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      const nav = navigator as BluetoothNavigator;
      if (!nav.bluetooth) {
        setMessage("Browser ini belum mendukung Web Bluetooth");
        return;
      }

      const session = bluetoothSessionRef.current;
      if (!session) {
        setMessage("Silakan scan dulu untuk memilih printer Bluetooth");
        return;
      }

      const connected = await session.connect();
      if (!connected) {
        setMessage("Perangkat tidak merespons saat koneksi dicoba");
        return;
      }

      setSelectedDeviceId(session.id);
      setSelectedDeviceName(session.name);
      setSelectedDeviceState("connected");
      setConnectionState("connected");
      setField("printer_enabled", true);
      setField("printer_mode", "bluetooth");
      setField("printer_name", session.name);
      setField("printer_status", "connected");
      setMessage(session.name ? `Printer ${session.name} tersambung` : "Printer Bluetooth tersambung");
    } catch (error) {
      const err = error as Error;
      if (err.name !== "NotFoundError" && err.name !== "AbortError") {
        setMessage("Gagal mencoba koneksi Bluetooth");
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
      setConnectionState("disconnected");
      setSelectedDeviceState("idle");
      setField("printer_status", "disconnected");
      setMessage("Status printer Bluetooth direset ke terputus");
    } finally {
      setDisconnecting(false);
    }
  };

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await persistSettings(data, "Pengaturan nota dan printer berhasil disimpan");
    } finally {
      setSaving(false);
    }
  };

  const onCopyWhatsApp = async () => {
    setCopying(true);
    try {
      const text = [data.receipt_whatsapp_text || "Berikut struk transaksi Anda dari Bookinaja.", "", "Isi pesan bisa dipakai untuk kirim ringkasan transaksi ke pelanggan."].join("\n");
      await navigator.clipboard.writeText(text);
      setMessage("Teks WhatsApp nota sudah disalin");
    } catch {
      setMessage("Gagal menyalin teks WhatsApp");
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03] lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Nota & Printer</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Konten nota, koneksi printer, dan jalur kirim WhatsApp
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Satu tempat untuk mengatur isi struk, memilih channel cetak, dan menyiapkan printer yang dipakai saat pelunasan booking.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300">
            Channel aktif: <span className="font-semibold text-slate-950 dark:text-white">{channelLabel}</span>
          </div>
          <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300">
            Status printer: <span className="font-semibold text-slate-950 dark:text-white">{connectionLabel}</span>
          </div>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50/70 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-200">Panduan singkat</div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">{stepLabel}</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Admin cukup scan, pilih printer, connect kalau ingin cek sesi, lalu simpan pengaturan.
            </div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-blue-500/20 dark:bg-white/5 dark:text-slate-200">
            Mode yang dipakai sekarang: <span className="font-semibold">{printerModeLabel}</span>
          </div>
        </CardContent>
      </Card>

      {message && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
          {message}
        </div>
      )}

      <Card className="border-slate-200 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 px-3 py-3 dark:border-white/10">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Alur</div>
            <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">Scan → Pilih → Connect → Disconnect</div>
          </div>
          <div className="rounded-xl border border-slate-200 px-3 py-3 dark:border-white/10">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Device</div>
            <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{selectedDeviceName || data.printer_name || "Belum ada perangkat"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 px-3 py-3 dark:border-white/10">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">ID</div>
            <div className="mt-1 break-all text-sm font-semibold text-slate-950 dark:text-white">{selectedDeviceId || "Belum dipilih"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 px-3 py-3 dark:border-white/10">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Mode</div>
            <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{printerModeLabel}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Konten Nota</CardTitle>
            <CardDescription>
              Atur isi nota standar yang dipakai saat pelunasan dan saat staf kirim ringkasan ke pelanggan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Judul nota</Label>
                <Input value={data.receipt_title || ""} onChange={(e) => setField("receipt_title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subjudul</Label>
                <Input value={data.receipt_subtitle || ""} onChange={(e) => setField("receipt_subtitle", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Footer nota</Label>
              <Input value={data.receipt_footer || ""} onChange={(e) => setField("receipt_footer", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Template WhatsApp</Label>
              <Textarea
                value={data.receipt_whatsapp_text || ""}
                onChange={(e) => setField("receipt_whatsapp_text", e.target.value)}
                className="min-h-28"
              />
              <p className="text-xs text-slate-500">Teks ini dipakai saat staf kirim nota via WhatsApp ke pelanggan.</p>
            </div>
            <div className="space-y-2">
              <Label>Template cetak</Label>
              <Textarea
                value={data.receipt_template || ""}
                onChange={(e) => setField("receipt_template", e.target.value)}
                className="min-h-48 font-mono text-xs"
              />
              <p className="text-xs text-slate-500">
                Gunakan placeholder seperti <code>{`{receipt_title}`}</code>, <code>{`{grand_total}`}</code>, atau <code>{`{customer_name}`}</code>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" onClick={onCopyWhatsApp} disabled={copying}>
                <Copy className="mr-2 h-4 w-4" />
                Salin Teks WA
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">Koneksi Printer</CardTitle>
              <CardDescription>
                Gunakan alur scan dulu, pilih device, lalu connect kalau mau memastikan sesi browser ke printer benar-benar aktif.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Mode printer</Label>
                  <Select value={data.printer_mode || "bluetooth"} onValueChange={(value) => setField("printer_mode", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih mode printer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bluetooth">Bluetooth</SelectItem>
                      <SelectItem value="local-bridge">Local bridge</SelectItem>
                      <SelectItem value="usb">USB</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nama printer</Label>
                  <Input
                    value={data.printer_name || ""}
                    onChange={(e) => setField("printer_name", e.target.value)}
                    placeholder="Epson TM-T82"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endpoint bridge printer</Label>
                <Input
                  value={data.printer_endpoint || ""}
                  onChange={(e) => setField("printer_endpoint", e.target.value)}
                  placeholder="http://localhost:3030/print"
                />
                <p className="text-xs text-slate-500">
                  Dipakai kalau printer lewat bridge lokal. Kalau Bluetooth murni, bagian ini bisa dikosongkan.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-white/10">
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">Aktifkan printer</div>
                  <div className="text-xs text-slate-500">Centang kalau tenant memang memakai printer atau bridge lokal.</div>
                </div>
                <Switch checked={!!data.printer_enabled} onCheckedChange={(value) => setField("printer_enabled", value)} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-white/10">
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">Auto print saat lunas</div>
                  <div className="text-xs text-slate-500">Kalau aktif, sistem menyiapkan cetak otomatis setelah payment settlement.</div>
                </div>
                <Switch checked={!!data.printer_auto_print} onCheckedChange={(value) => setField("printer_auto_print", value)} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={openBluetoothPicker}
                  disabled={scanning || !bluetoothAvailable}
                >
                  <Bluetooth className="mr-2 h-4 w-4" />
                  {scanning ? "Membuka scanner..." : "Scan Bluetooth"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={connectSelectedBluetooth}
                  disabled={connecting || !bluetoothAvailable}
                >
                  <PlugZap className="mr-2 h-4 w-4" />
                  {connecting ? "Mencoba konek..." : "Connect"}
                </Button>
                <Button type="button" variant="outline" onClick={disconnectBluetooth} disabled={disconnecting}>
                  <Unplug className="mr-2 h-4 w-4" />
                  {disconnecting ? "Memutus..." : "Disconnect"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMessage("Alur singkat: Scan untuk pilih device, Connect untuk coba sesi browser, Disconnect untuk reset status. Kalau belum support, pakai Chrome/Edge di HTTPS atau localhost.")}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Cara Pakai
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 px-3 py-3 dark:border-white/10">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Printer terpilih</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {selectedDeviceName || data.printer_name || "Belum ada perangkat"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{selectedDeviceId || "Klik Scan Bluetooth untuk memilih printer"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 px-3 py-3 dark:border-white/10">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Kesiapan browser</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {bluetoothAvailable ? "Web Bluetooth siap dipakai" : "Web Bluetooth belum siap"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {bluetoothAvailable
                      ? "Pilih device dulu, baru connect kalau perlu uji sesi."
                      : "Buka lewat Chrome/Edge di HTTPS atau localhost agar tombol scan bisa aktif."}
                  </div>
                </div>
              </div>
              {!bluetoothAvailable && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  Bluetooth belum aktif di environment ini. Coba buka lewat <span className="font-semibold">Chrome atau Edge</span> pada <span className="font-semibold">localhost</span> atau <span className="font-semibold">HTTPS</span>.
                </div>
              )}
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-600 dark:bg-white/[0.03] dark:text-slate-300">
                <CheckCircle2 className={cn("h-4 w-4", data.printer_status === "connected" || connectionState === "connected" ? "text-emerald-500" : "text-amber-500")} />
                Status terakhir: {connectionLabel}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">Channel Kirim</CardTitle>
              <CardDescription>Pilih jalur utama yang paling sering dipakai staf saat kirim nota.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {["whatsapp", "printer", "hybrid"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setField("receipt_channel", item)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition",
                      data.receipt_channel === item
                        ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                        : "border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-white/10 dark:text-slate-300",
                    )}
                  >
                    {item === "whatsapp" ? "WhatsApp" : item === "printer" ? "Printer" : "Hybrid"}
                  </button>
                ))}
              </div>
              <Separator />
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <Smartphone className="mt-0.5 h-4 w-4 text-blue-600" />
                  <span>WhatsApp cocok kalau tenant belum siap printer fisik.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Printer className="mt-0.5 h-4 w-4 text-blue-600" />
                  <span>Printer dipakai kalau ada device fisik atau bridge lokal.</span>
                </div>
                <div className="flex items-start gap-2">
                  <MessageCircleMore className="mt-0.5 h-4 w-4 text-blue-600" />
                  <span>Hybrid kirim ke printer dan WhatsApp sekaligus.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">Simpan konfigurasi</div>
            <div className="text-xs text-slate-500">Perubahan ini dipakai saat pelunasan booking dan saat staf kirim nota.</div>
          </div>
          <Button onClick={onSave} disabled={saving} className="sm:min-w-44">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
