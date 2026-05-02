"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import {
  ChevronRight,
  CircleHelp,
  Plus,
  Power,
  Radio,
  RefreshCcw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type DeviceSummary = {
  id: string;
  device_id: string;
  device_name: string;
  resource_id?: string | null;
  pairing_status: string;
  connection_status: string;
  is_enabled: boolean;
  last_seen_at?: string | null;
};

type ResourceOption = {
  id: string;
  name: string;
};

type Overview = {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  assigned_devices: number;
  disabled_devices: number;
  pending_commands: number;
  failed_commands_24h: number;
  acked_commands_24h: number;
};

function extractError(error: unknown) {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || "Permintaan device gagal";
  }
  return "Permintaan device gagal";
}

function statusTone(status: string) {
  switch ((status || "").toLowerCase()) {
    case "online":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "offline":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-700";
  }
}

function statusLabel(status: string) {
  switch ((status || "").toLowerCase()) {
    case "online":
      return "Online";
    case "offline":
      return "Offline";
    default:
      return "Belum terhubung";
  }
}

function pairingLabel(status: string) {
  switch ((status || "").toLowerCase()) {
    case "paired":
      return "Sudah terhubung";
    case "claimed":
      return "Siap dipasang";
    default:
      return "Perlu disiapkan";
  }
}

function relativeLastSeen(value?: string | null) {
  if (!value) return "Belum ada aktivitas";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes <= 1) return "Baru saja aktif";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  return `${days} hari lalu`;
}

export default function DevicesPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [form, setForm] = useState({
    device_id: "",
    device_name: "",
    device_key: "",
    resource_id: "",
  });

  const fetchData = async () => {
    try {
      const [deviceRes, overviewRes, resourceRes] = await Promise.all([
        api.get("/devices"),
        api.get("/devices/overview"),
        api.get("/resources-all"),
      ]);
      setDevices(deviceRes.data.items || []);
      setOverview(overviewRes.data || null);
      setResources(resourceRes.data.resources || []);
    } catch {
      toast.error("Gagal memuat data Smart Point");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fallbackStats = useMemo(() => {
    const online = devices.filter((item) => item.connection_status === "online").length;
    const assigned = devices.filter((item) => item.resource_id).length;
    const disabled = devices.filter((item) => !item.is_enabled).length;
    return {
      online,
      assigned,
      disabled,
      offline: Math.max(devices.length - online, 0),
    };
  }, [devices]);

  const handleClaim = async () => {
    if (!form.device_id || !form.device_key) {
      toast.error("Kode alat dan kunci perangkat wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/devices/claim", form);
      toast.success("Smart Point berhasil ditambahkan");
      setForm({ device_id: "", device_name: "", device_key: "", resource_id: "" });
      setShowClaimForm(false);
      fetchData();
    } catch (error: unknown) {
      toast.error(extractError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (device: DeviceSummary) => {
    try {
      await api.post(`/devices/${device.id}/${device.is_enabled ? "disable" : "enable"}`);
      toast.success(device.is_enabled ? "Alat dinonaktifkan" : "Alat diaktifkan");
      fetchData();
    } catch (error: unknown) {
      toast.error(extractError(error));
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 pb-20 pt-4 font-plus-jakarta md:px-4">
      <Card className="overflow-hidden rounded-[28px] border-slate-200 bg-gradient-to-br from-sky-50 via-white to-white shadow-sm dark:border-white/10 dark:from-sky-950/30 dark:via-slate-950 dark:to-slate-950">
        <CardContent className="space-y-5 p-5 md:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white">
                <Radio className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-600">
                  Settings
                </div>
                <h1 className="text-2xl font-semibold text-slate-950">Smart Point</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  Kelola perangkat notifikasi untuk resource bisnis Anda, cek apakah alat sedang
                  aktif, dan hubungkan ke resource yang sesuai.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="w-full sm:w-auto" onClick={fetchData}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button
                className="w-full bg-sky-600 hover:bg-sky-700 sm:w-auto"
                onClick={() => setShowClaimForm((prev) => !prev)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {showClaimForm ? "Tutup form" : "Tambah Smart Point"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Alat aktif",
                value: overview?.online_devices ?? fallbackStats.online,
                helper: "Sedang terhubung",
                icon: Wifi,
                tone: "text-emerald-700",
              },
              {
                label: "Sudah dipasang",
                value: overview?.assigned_devices ?? fallbackStats.assigned,
                helper: "Sudah terkait ke resource",
                icon: ShieldCheck,
                tone: "text-sky-700",
              },
              {
                label: "Belum aktif",
                value: overview?.offline_devices ?? fallbackStats.offline,
                helper: "Perlu dicek bila dibutuhkan",
                icon: WifiOff,
                tone: "text-rose-700",
              },
              {
                label: "Nonaktif",
                value: overview?.disabled_devices ?? fallbackStats.disabled,
                helper: "Tidak menerima perintah",
                icon: Power,
                tone: "text-slate-700",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-500">{item.label}</div>
                    <div className={`mt-2 text-3xl font-semibold ${item.tone}`}>{item.value}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.helper}</div>
                  </div>
                  <item.icon className={`mt-1 h-5 w-5 ${item.tone}`} />
                </div>
              </div>
            ))}
          </div>

          {showClaimForm && (
            <div className="rounded-2xl border border-sky-100 bg-white p-4 md:p-5 dark:border-sky-900/40 dark:bg-slate-950/80">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-2xl bg-sky-100 p-2 text-sky-700">
                  <CircleHelp className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Tambah Smart Point baru</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Masukkan kode alat, kunci perangkat, lalu pilih resource jika alat ingin
                    langsung dipasang sekarang.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Input
                  placeholder="Kode alat"
                  value={form.device_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, device_id: e.target.value }))}
                />
                <Input
                  placeholder="Nama alat"
                  value={form.device_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, device_name: e.target.value }))}
                />
                <Input
                  placeholder="Kunci perangkat"
                  value={form.device_key}
                  onChange={(e) => setForm((prev) => ({ ...prev, device_key: e.target.value }))}
                />
                <select
                  value={form.resource_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, resource_id: e.target.value }))}
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">Pilih resource nanti saja</option>
                  {resources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={handleClaim}
                  disabled={submitting}
                  className="w-full bg-sky-600 hover:bg-sky-700 sm:w-auto"
                >
                  {submitting ? "Menyimpan..." : "Simpan Smart Point"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setShowClaimForm(false)}
                >
                  Nanti saja
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="rounded-3xl border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Daftar Smart Point</h2>
              <p className="text-sm text-slate-500">
                Ringkasan alat yang sudah terdaftar di bisnis ini.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-slate-600">
              {devices.length} alat
            </Badge>
          </div>

          {devices.length === 0 ? (
            <Card className="rounded-3xl border-dashed border-slate-300 bg-white shadow-sm dark:border-white/15 dark:bg-slate-950/70">
              <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-500">
                  <Radio className="h-5 w-5" />
                </div>
                <div className="font-semibold text-slate-900">Belum ada Smart Point</div>
                <p className="max-w-md text-sm leading-6 text-slate-500">
                  Tambahkan alat pertama supaya resource dapat memberi notifikasi otomatis saat
                  sesi dimulai atau selesai.
                </p>
                <Button
                  className="bg-sky-600 hover:bg-sky-700"
                  onClick={() => setShowClaimForm(true)}
                >
                  Tambah Smart Point
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {devices.map((device) => (
                <Card
                  key={device.id}
                  className="rounded-3xl border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-slate-950/70"
                >
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold text-slate-950">
                          {device.device_name || device.device_id}
                        </div>
                        <div className="mt-1 truncate text-xs font-medium text-slate-500">
                          {device.device_id}
                        </div>
                      </div>
                      <Badge className={statusTone(device.connection_status)}>
                        {statusLabel(device.connection_status)}
                      </Badge>
                    </div>

                    <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <span>Status pemasangan</span>
                        <span className="font-medium text-slate-900">
                          {pairingLabel(device.pairing_status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Resource</span>
                        <span className="font-medium text-slate-900">
                          {device.resource_id ? "Sudah dipilih" : "Belum dipilih"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Aktivitas terakhir</span>
                        <span className="font-medium text-slate-900">
                          {relativeLastSeen(device.last_seen_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!device.is_enabled && (
                        <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
                          Nonaktif
                        </Badge>
                      )}
                      {device.is_enabled && device.connection_status === "online" && (
                        <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                          Siap digunakan
                        </Badge>
                      )}
                      {device.is_enabled && device.connection_status !== "online" && (
                        <Badge className="border border-amber-200 bg-amber-50 text-amber-700">
                          Perlu dicek
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link href={`/admin/devices/${device.id}`} className="flex-1">
                        <Button className="w-full bg-slate-900 hover:bg-slate-800">
                          Kelola alat
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => handleToggle(device)}
                      >
                        {device.is_enabled ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
