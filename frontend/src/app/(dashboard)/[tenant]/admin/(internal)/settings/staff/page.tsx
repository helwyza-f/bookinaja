"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Activity,
  CalendarClock,
  Loader2,
  Plus,
  Shield,
  Trash2,
  UsersRound,
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

export default function SettingsStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const fetchStaff = async () => {
    try {
      const res = await api.get("/admin/settings/staff");
      setStaff(res.data?.items || []);
    } catch {
      toast.error("Gagal memuat data pegawai");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      const res = await api.get("/admin/settings/activity");
      setActivities(res.data?.items || []);
    } catch {
      toast.error("Gagal memuat activity log");
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    void fetchStaff();
    void fetchActivity();
  }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("Lengkapi data pegawai");
      return;
    }

    setSaving(true);
    try {
      await api.post("/admin/settings/staff", form);
      toast.success("Undangan staff berhasil dibuat");
      setForm({ name: "", email: "", password: "" });
      await Promise.all([fetchStaff(), fetchActivity()]);
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Gagal menambahkan pegawai";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: StaffMember) => {
    const ok = window.confirm(`Hapus staff ${member.name}? Tindakan ini tidak bisa dibatalkan.`);
    if (!ok) return;

    setDeletingId(member.id);
    try {
      await api.delete(`/admin/settings/staff/${member.id}`);
      toast.success("Staff berhasil dihapus");
      await Promise.all([fetchStaff(), fetchActivity()]);
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Gagal menghapus staff";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <Card className="rounded-[2.25rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-6 md:p-8 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_35%)] pointer-events-none" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-lg shadow-slate-950/20">
              <UsersRound className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <Badge className="bg-blue-600 text-white border-none text-[9px] font-black uppercase tracking-widest">
                Manajemen Pegawai
              </Badge>
              <h1 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter dark:text-white">
                Akses staff, RBAC, dan audit trail
              </h1>
              <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400 font-medium">
                Area executive ini fokus ke kerja yang penting: undang staff
                cepat, hapus akses saat perlu, dan lihat semua perubahan yang
                terjadi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-[1.35rem] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 px-4 py-3">
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                Staff
              </div>
              <div className="mt-1 text-2xl font-black italic dark:text-white">
                {loading ? "-" : staff.length}
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 px-4 py-3">
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                Aktivitas
              </div>
              <div className="mt-1 text-2xl font-black italic dark:text-white">
                {activityLoading ? "-" : activities.length}
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 px-4 py-3">
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                Role
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-blue-600">
                <Shield className="h-3 w-3" />
                Owner only
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                  Team Members
                </div>
                <h2 className="text-xl font-black italic uppercase tracking-tighter dark:text-white">
                  Daftar staff aktif
                </h2>
              </div>
              {loading ? null : (
                <Badge className="bg-slate-950 text-white border-none text-[9px] font-black uppercase tracking-widest">
                  {staff.length} akun
                </Badge>
              )}
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <Skeleton className="h-72 rounded-[1.5rem] bg-slate-100 dark:bg-white/5" />
              ) : staff.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 dark:border-white/5 p-10 text-center text-slate-400 font-black uppercase tracking-widest italic">
                  Belum ada staff
                </div>
              ) : (
                staff.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-[1.35rem] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-black italic uppercase tracking-tight dark:text-white truncate">
                        {member.name}
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">
                        {member.email}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className="bg-blue-600/10 text-blue-600 border-none text-[9px] font-black uppercase tracking-widest">
                          {member.role}
                        </Badge>
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          {member.created_at
                            ? new Date(member.created_at).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "Baru"}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleDelete(member)}
                      disabled={deletingId === member.id}
                      className="rounded-2xl border border-red-200 bg-red-50 px-3 text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                    >
                      {deletingId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="rounded-[2rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-6 md:p-8">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                  Activity Log
                </div>
                <h2 className="mt-1 text-xl font-black italic uppercase tracking-tighter dark:text-white">
                  Jejak perubahan executive
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {activityLoading ? (
                <Skeleton className="h-72 rounded-[1.5rem] bg-slate-100 dark:bg-white/5" />
              ) : activities.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 dark:border-white/5 p-10 text-center text-slate-400 font-black uppercase tracking-widest italic">
                  Belum ada aktivitas
                </div>
              ) : (
                activities.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.35rem] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-black italic uppercase tracking-tight dark:text-white truncate">
                          {item.action.replaceAll("_", " ")}
                        </div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">
                          {item.actor_name || "System"}
                          {item.actor_email ? ` • ${item.actor_email}` : ""}
                        </div>
                      </div>
                      <Badge className="bg-slate-950 text-white border-none text-[9px] font-black uppercase tracking-widest">
                        {item.resource_type || "activity"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <CalendarClock className="h-3 w-3" />
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </span>
                      <span className="truncate">
                        {item.metadata && Object.keys(item.metadata).length > 0
                          ? JSON.stringify(item.metadata)
                          : "executive log"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="rounded-[2rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-6 md:p-8 space-y-4 h-fit">
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
              Add Staff
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">
              Undang pegawai baru
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Masukkan nama, email, dan password awal. Setelah dibuat, staff
              langsung punya akses operasional sesuai role-nya.
            </p>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Nama pegawai"
              className="h-12 rounded-2xl"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <Input
              placeholder="Email"
              type="email"
              className="h-12 rounded-2xl"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
            <Input
              placeholder="Password awal"
              type="password"
              className="h-12 rounded-2xl"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic tracking-[0.2em]"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Tambah Staff
          </Button>

          <div className="rounded-[1.35rem] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-4 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            Audit trail akan merekam `user_id` owner yang menambahkan staff
            baru, menghapus staff, dan seluruh perubahan executive berikutnya.
          </div>
          <div className="rounded-[1.35rem] border border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10 p-4 text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
            Tip: gunakan nama role yang jelas, supaya tim operasional lebih
            cepat memahami batas aksesnya.
          </div>
        </Card>
      </div>
    </div>
  );
}
