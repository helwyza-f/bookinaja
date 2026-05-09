"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  ChevronDown,
  Link2,
  Power,
  PowerOff,
  Radio,
  Send,
  Unlink2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { tenantDeviceChannel } from "@/lib/realtime/channels";
import {
  DEVICE_EVENT_PREFIXES,
  type RealtimeEvent,
  matchesRealtimePrefix,
} from "@/lib/realtime/event-types";

type ResourceOption = {
  id: string;
  name: string;
};

type DeviceDetail = {
  id: string;
  device_id: string;
  device_name: string;
  resource_id?: string | null;
  resource_name?: string;
  pairing_status: string;
  connection_status: string;
  is_enabled: boolean;
  firmware_version?: string;
  hardware_revision?: string;
  last_seen_at?: string | null;
  commands?: Array<{
    id: string;
    trigger_event: string;
    status: string;
    created_at: string;
    published_at?: string | null;
    last_error?: string;
  }>;
  events?: Array<{
    id: string;
    event_type: string;
    title: string;
    description: string;
    created_at: string;
  }>;
  telemetry?: Array<{
    id: string;
    topic: string;
    message_type: string;
    payload: Record<string, unknown> | string;
    received_at: string;
  }>;
  metrics?: {
    total_commands: number;
    acked_commands: number;
    failed_commands: number;
    pending_commands: number;
    avg_ack_latency_ms: number;
    last_ack_at?: string | null;
    state_messages_24h: number;
    ack_messages_24h: number;
  };
};

function extractError(error: unknown) {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || "Permintaan device gagal";
  }
  return "Permintaan device gagal";
}

function statusBadge(status: string) {
  switch ((status || "").toLowerCase()) {
    case "online":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "offline":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-700";
  }
}

function businessStatusText(device: DeviceDetail) {
  if (!device.is_enabled) return "Dinonaktifkan";
  if (device.connection_status === "online") return "Siap digunakan";
  if (device.pairing_status === "claimed") return "Menunggu alat dinyalakan";
  return "Perlu dicek";
}

function lastSeenText(value?: string | null) {
  if (!value) return "Belum ada aktivitas";
  return new Date(value).toLocaleString("id-ID");
}

function patchDeviceDetailFromEvent(
  current: DeviceDetail | null,
  event: RealtimeEvent,
) {
  if (!current) return current;
  const eventInternalID = String(event.entity_id || "");
  const eventDeviceID = String(event.summary?.device_id || "");
  if (!eventInternalID && !eventDeviceID) {
    return current;
  }
  const matched =
    (eventInternalID && current.id === eventInternalID) ||
    (eventDeviceID && current.device_id === eventDeviceID);
  if (!matched) {
    return current;
  }

  return {
    ...current,
    device_id: String(event.summary?.device_id ?? current.device_id),
    device_name: String(event.summary?.device_name ?? current.device_name),
    pairing_status: String(
      event.summary?.pairing_status ?? current.pairing_status,
    ),
    connection_status: String(
      event.summary?.connection_status ?? current.connection_status,
    ),
    is_enabled:
      typeof event.summary?.is_enabled === "boolean"
        ? Boolean(event.summary.is_enabled)
        : current.is_enabled,
    resource_id:
      event.summary?.resource_id === null
        ? null
        : String(event.summary?.resource_id ?? current.resource_id ?? "") || null,
    last_seen_at: String(
      event.summary?.last_seen_at ?? current.last_seen_at ?? "",
    ) || null,
  };
}

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const tenantId = user?.tenant_id || "";
  const [resourceId, setResourceId] = useState("");
  const [testForm, setTestForm] = useState({
    event: "manual_test",
    audio_index: "1",
    light_mode: "solid",
    color: "#00FF00",
    volume: "20",
  });

  const fetchData = useCallback(async () => {
    try {
      const [deviceRes, resourcesRes] = await Promise.all([
        api.get(`/devices/${params.id}`),
        api.get("/admin/resources/summary"),
      ]);
      const nextDevice = deviceRes.data;
      setDevice(nextDevice);
      setResourceId(nextDevice.resource_id || "");
      setResources(resourcesRes.data.items || []);
    } catch {
      toast.error("Gagal memuat detail alat");
      router.push("/admin/devices");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { connected: realtimeConnected, status: realtimeStatus } = useRealtime({
    enabled: Boolean(tenantId && device?.id),
    channels:
      tenantId && device?.id
        ? [tenantDeviceChannel(tenantId, device.id)]
        : [],
    onEvent: (event) => {
      if (matchesRealtimePrefix(event.type, DEVICE_EVENT_PREFIXES)) {
        setDevice((current) => patchDeviceDetailFromEvent(current, event));
        if (event.type.startsWith("device_command.")) {
          fetchData();
        }
      }
    },
    onReconnect: fetchData,
  });

  const sortedResources = useMemo(
    () => [...resources].sort((a, b) => a.name.localeCompare(b.name)),
    [resources],
  );

  const handleAssign = async () => {
    if (!resourceId) {
      toast.error("Pilih resource terlebih dahulu");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/devices/${params.id}/assign`, { resource_id: resourceId });
      toast.success("Alat berhasil dihubungkan ke resource");
      fetchData();
    } catch (error: unknown) {
      toast.error(extractError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    setSaving(true);
    try {
      await api.post(`/devices/${params.id}/unassign`);
      toast.success("Alat berhasil dilepas");
      setResourceId("");
      fetchData();
    } catch (error: unknown) {
      toast.error(extractError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!device) return;
    setSaving(true);
    try {
      await api.post(`/devices/${params.id}/${device.is_enabled ? "disable" : "enable"}`);
      toast.success(device.is_enabled ? "Alat dinonaktifkan" : "Alat diaktifkan");
      fetchData();
    } catch (error: unknown) {
      toast.error(extractError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setSaving(true);
    try {
      await api.post(`/devices/${params.id}/test`, {
        event: testForm.event,
        audio_index: Number(testForm.audio_index),
        light_mode: testForm.light_mode,
        color: testForm.color,
        volume: Number(testForm.volume),
      });
      toast.success("Tes alat berhasil dikirim");
      fetchData();
    } catch (error: unknown) {
      toast.error(extractError(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !device) {
    return <div className="p-6 text-sm text-slate-500">Memuat detail alat...</div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 pb-20 pt-4 font-plus-jakarta md:px-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push("/admin/devices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-600">
              Smart Point
            </div>
            <h1 className="text-2xl font-semibold text-slate-950">{device.device_name}</h1>
            <div className="text-sm text-slate-500">{device.device_id}</div>
            <div className="mt-2">
              <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleToggle} disabled={saving}>
            {device.is_enabled ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
            {device.is_enabled ? "Nonaktifkan alat" : "Aktifkan alat"}
          </Button>
          {device.resource_id && (
            <Link href={`/admin/resources/${device.resource_id}`}>
              <Button variant="outline" className="w-full sm:w-auto">
                Lihat Resource
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-slate-200 bg-gradient-to-br from-sky-50 via-white to-white shadow-sm dark:border-white/10 dark:from-sky-950/30 dark:via-slate-950 dark:to-slate-950">
        <CardContent className="space-y-5 p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white">
                <Radio className="h-4 w-4" />
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-950">Ringkasan alat</div>
                <div className="text-sm text-slate-500">
                  Lihat status alat, hubungkan ke resource, dan tes bunyi atau lampu.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={statusBadge(device.connection_status)}>
                {device.connection_status === "online"
                  ? "Online"
                  : device.connection_status === "offline"
                    ? "Offline"
                    : "Belum terhubung"}
              </Badge>
              <Badge variant="outline" className="border-slate-200 text-slate-700">
                {device.is_enabled ? "Aktif" : "Nonaktif"}
              </Badge>
              <Badge variant="outline" className="border-slate-200 text-slate-700">
                {device.resource_name || "Belum dipasang"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Status alat",
                value: businessStatusText(device),
                icon: device.connection_status === "online" ? Wifi : WifiOff,
              },
              {
                label: "Resource",
                value: device.resource_name || "Belum dipilih",
                icon: Link2,
              },
              {
                label: "Aktivitas terakhir",
                value: lastSeenText(device.last_seen_at),
                icon: Radio,
              },
              {
                label: "Pasang awal",
                value: device.pairing_status === "paired" ? "Sudah terhubung" : "Belum selesai",
                icon: device.pairing_status === "paired" ? Wifi : WifiOff,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">{item.label}</div>
                    <div className="mt-2 text-sm font-semibold leading-6 text-slate-950">
                      {item.value}
                    </div>
                  </div>
                  <item.icon className="mt-1 h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="space-y-4 p-5">
            <div>
              <div className="text-lg font-semibold text-slate-950 dark:text-white">Hubungkan ke resource</div>
              <div className="text-sm text-slate-500 dark:text-slate-300">
                Pilih resource tempat Smart Point ini akan dipasang.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Pilih resource</option>
                {sortedResources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
              </select>
              <Button onClick={handleAssign} disabled={saving} className="w-full sm:w-auto">
                <Link2 className="mr-2 h-4 w-4" />
                Simpan
              </Button>
              <Button
                variant="outline"
                onClick={handleUnassign}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                <Unlink2 className="mr-2 h-4 w-4" />
                Lepas
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="space-y-4 p-5">
            <div>
              <div className="text-lg font-semibold text-slate-950">Tes alat</div>
              <div className="text-sm text-slate-500">
                Coba kirim bunyi atau lampu untuk memastikan alat merespons.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Jenis tes"
                value={testForm.event}
                onChange={(e) => setTestForm((prev) => ({ ...prev, event: e.target.value }))}
              />
              <Input
                placeholder="Nomor audio"
                value={testForm.audio_index}
                onChange={(e) => setTestForm((prev) => ({ ...prev, audio_index: e.target.value }))}
              />
              <Input
                placeholder="Mode lampu"
                value={testForm.light_mode}
                onChange={(e) => setTestForm((prev) => ({ ...prev, light_mode: e.target.value }))}
              />
              <Input
                placeholder="Warna"
                value={testForm.color}
                onChange={(e) => setTestForm((prev) => ({ ...prev, color: e.target.value }))}
              />
              <Input
                placeholder="Volume"
                value={testForm.volume}
                onChange={(e) => setTestForm((prev) => ({ ...prev, volume: e.target.value }))}
              />
            </div>

            <Button
              onClick={handleTest}
              disabled={saving}
              className="w-full bg-sky-600 hover:bg-sky-700 sm:w-auto"
            >
              <Send className="mr-2 h-4 w-4" />
              Kirim tes
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Perintah berhasil", value: device.metrics?.acked_commands ?? 0 },
          { label: "Perintah gagal", value: device.metrics?.failed_commands ?? 0 },
          { label: "Menunggu kirim", value: device.metrics?.pending_commands ?? 0 },
          { label: "Respon rata-rata", value: `${Math.round(device.metrics?.avg_ack_latency_ms ?? 0)} ms` },
        ].map((metric) => (
          <Card key={metric.label} className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <CardContent className="p-5">
              <div className="text-sm text-slate-500">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <details className="group rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
            <div>
              <div className="text-lg font-semibold text-slate-950">Riwayat terbaru</div>
              <div className="text-sm text-slate-500">
                Lihat riwayat kirim perintah dan aktivitas alat.
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 border-t border-slate-100 p-5 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="font-semibold text-slate-900">Perintah</div>
              {(device.commands || []).length === 0 ? (
                <div className="text-sm text-slate-500">Belum ada perintah.</div>
              ) : (
                device.commands?.map((command) => (
                  <div key={command.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900">{command.trigger_event}</div>
                      <Badge variant="outline">{command.status}</Badge>
                    </div>
                    <div className="mt-2 text-slate-500">
                      {new Date(command.created_at).toLocaleString("id-ID")}
                    </div>
                    {command.last_error && <div className="mt-2 text-rose-600">{command.last_error}</div>}
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3">
              <div className="font-semibold text-slate-900">Aktivitas alat</div>
              {(device.events || []).length === 0 ? (
                <div className="text-sm text-slate-500">Belum ada aktivitas.</div>
              ) : (
                device.events?.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                    <div className="font-semibold text-slate-900">{event.title}</div>
                    <div className="mt-1 text-slate-500">{event.description}</div>
                    <div className="mt-2 text-xs text-slate-400">
                      {new Date(event.created_at).toLocaleString("id-ID")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </details>

        <details className="group rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
            <div>
              <div className="text-lg font-semibold text-slate-950">Lihat detail teknis</div>
              <div className="text-sm text-slate-500">
                Firmware, telemetry, dan data untuk troubleshooting.
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-4 border-t border-slate-100 p-5">
            <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-slate-500">Firmware</div>
                <div className="mt-1 font-medium text-slate-950">{device.firmware_version || "-"}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-slate-500">Hardware</div>
                <div className="mt-1 font-medium text-slate-950">{device.hardware_revision || "-"}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-slate-500">State 24 jam</div>
                <div className="mt-1 font-medium text-slate-950">{device.metrics?.state_messages_24h ?? 0}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-slate-500">Ack 24 jam</div>
                <div className="mt-1 font-medium text-slate-950">{device.metrics?.ack_messages_24h ?? 0}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-semibold text-slate-900">Telemetry</div>
              {(device.telemetry || []).length === 0 ? (
                <div className="text-sm text-slate-500">Belum ada telemetry.</div>
              ) : (
                device.telemetry?.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900">{entry.message_type}</div>
                      <Badge variant="outline">{entry.topic.split("/").slice(-1)[0]}</Badge>
                    </div>
                    <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                      {typeof entry.payload === "string"
                        ? entry.payload
                        : JSON.stringify(entry.payload, null, 2)}
                    </pre>
                    <div className="mt-2 text-xs text-slate-400">
                      {new Date(entry.received_at).toLocaleString("id-ID")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
