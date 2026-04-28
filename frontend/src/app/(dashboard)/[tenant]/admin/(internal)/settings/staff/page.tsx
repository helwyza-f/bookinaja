"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Activity,
  CalendarClock,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
} from "lucide-react";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
};

type ActivityItem = {
  id: string;
  actor_name?: string;
  actor_email?: string;
  action: string;
  resource_type?: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const initialForm = { name: "", email: "", password: "" };

export default function SettingsStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get("/admin/settings/staff");
      setStaff(res.data?.items || []);
    } catch {
      toast.error("Gagal memuat data pegawai");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await api.get("/admin/settings/activity");
      setActivities(res.data?.items || []);
    } catch {
      toast.error("Gagal memuat activity log");
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setActivityLoading(true);
    await Promise.all([fetchStaff(), fetchActivity()]);
  }, [fetchActivity, fetchStaff]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const filteredStaff = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return staff;
    return staff.filter((member) =>
      [member.name, member.email, member.role].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    );
  }, [query, staff]);

  const handleSubmit = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password.trim();
    if (!name || !email || !password) {
      toast.error("Nama, email, dan password awal wajib diisi");
      return;
    }

    setSaving(true);
    try {
      await api.post("/admin/settings/staff", { name, email, password });
      toast.success("Staff berhasil ditambahkan");
      setForm(initialForm);
      await refreshAll();
    } catch (error) {
      toast.error((error as ApiError).response?.data?.error || "Gagal menambahkan pegawai");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: StaffMember) => {
    const ok = window.confirm(`Hapus akses ${member.name}?`);
    if (!ok) return;

    setDeletingId(member.id);
    try {
      await api.delete(`/admin/settings/staff/${member.id}`);
      toast.success("Akses staff dihapus");
      await refreshAll();
    } catch (error) {
      toast.error((error as ApiError).response?.data?.error || "Gagal menghapus staff");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Manajemen Pegawai
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Kelola akses staff tenant. Staff mendapat akses operasional, sedangkan konfigurasi tetap owner-only.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={refreshAll} className="h-10 rounded-xl">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Metric label="Staff aktif" value={loading ? "-" : String(staff.length)} />
          <Metric label="Activity log" value={activityLoading ? "-" : String(activities.length)} />
          <Metric label="Role staff" value="Operasional" />
          <Metric label="Area owner" value="Settings" />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Staff Aktif
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Akun staff yang bisa login ke dashboard tenant.
                </p>
              </div>
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari staff..."
                  className="h-10 rounded-xl pl-9"
                />
              </div>
            </div>

            <div className="md:hidden">
              {loading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : filteredStaff.length === 0 ? (
                <EmptyState label="Belum ada staff yang cocok." />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/10">
                  {filteredStaff.map((member) => (
                    <StaffMobileCard
                      key={member.id}
                      member={member}
                      deleting={deletingId === member.id}
                      onDelete={() => handleDelete(member)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/5">
                    <TableHead className="pl-5 text-xs">Nama</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">Dibuat</TableHead>
                    <TableHead className="pr-5 text-right text-xs">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell className="pl-5"><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="pr-5"><Skeleton className="ml-auto h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center text-sm text-slate-500">
                        Belum ada staff yang cocok.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="pl-5 font-medium">{member.name}</TableCell>
                        <TableCell className="text-slate-500">{member.email}</TableCell>
                        <TableCell><RoleBadge role={member.role} /></TableCell>
                        <TableCell className="text-slate-500">{formatDate(member.created_at)}</TableCell>
                        <TableCell className="pr-5 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(member)}
                            disabled={deletingId === member.id}
                            className="h-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                          >
                            {deletingId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Activity Log
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Riwayat perubahan owner dan staff terbaru.
                </p>
              </div>
              <Activity className="h-5 w-5 text-blue-600" />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/10">
              {activityLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 rounded-xl" />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <EmptyState label="Belum ada aktivitas." />
              ) : (
                activities.map((item) => <ActivityRow key={item.id} item={item} />)
              )}
            </div>
          </Card>
        </div>

        <aside className="h-fit xl:sticky xl:top-6">
          <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950 md:p-5">
            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Tambah Staff
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Buat akun staff operasional baru. Password awal bisa diganti setelah login.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <Input
                placeholder="Nama staff"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="h-10 rounded-xl"
              />
              <Input
                placeholder="Email login"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="h-10 rounded-xl"
              />
              <Input
                placeholder="Password awal"
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className="h-10 rounded-xl"
              />
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="mt-4 h-10 w-full rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Tambah Staff
            </Button>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100">
              <div className="flex items-center gap-2 font-semibold">
                <Shield className="h-4 w-4" />
                Owner-only
              </div>
              <p className="mt-1 text-xs leading-relaxed">
                Staff tidak bisa membuka halaman settings. Halaman ini hanya untuk owner.
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant="outline" className="rounded-lg border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
      {role}
    </Badge>
  );
}

function StaffMobileCard({
  member,
  deleting,
  onDelete,
}: {
  member: StaffMember;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{member.name}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{member.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <RoleBadge role={member.role} />
            <span className="text-xs text-slate-400">{formatDate(member.created_at)}</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onDelete}
          disabled={deleting}
          className="h-9 w-9 shrink-0 rounded-lg border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
            {humanizeAction(item.action)}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {item.actor_name || "System"}
            {item.actor_email ? ` · ${item.actor_email}` : ""}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 rounded-lg">
          {item.resource_type || "activity"}
        </Badge>
      </div>
      <div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          {formatDateTime(item.created_at)}
        </span>
        <span className="truncate">{formatMetadata(item.metadata)}</span>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="p-8 text-center text-sm text-slate-500">{label}</div>;
}

function humanizeAction(action: string) {
  return action.replaceAll("_", " ");
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMetadata(metadata?: Record<string, unknown>) {
  if (!metadata || Object.keys(metadata).length === 0) return "-";
  const name = typeof metadata.name === "string" ? metadata.name : "";
  const email = typeof metadata.email === "string" ? metadata.email : "";
  return [name, email].filter(Boolean).join(" · ") || JSON.stringify(metadata);
}
