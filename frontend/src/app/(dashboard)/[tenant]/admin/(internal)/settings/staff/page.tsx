"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { PlanFeatureCallout } from "@/components/dashboard/plan-feature-ux";
import { analyzeTenantFeatureAccess } from "@/lib/plan-access";
import {
  PERMISSION_GROUPS,
  RECOMMENDED_ROLE_PRESETS,
} from "@/lib/permission-catalog";
import {
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  Users,
  UserCog,
  RotateCcw,
  Sparkles,
  Mail,
  ArrowRight,
  UserRound,
  LockKeyhole,
} from "lucide-react";

type StaffRole = {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string;
  permission_keys: string[];
  is_default: boolean;
};

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role_id?: string;
  role?: string;
};

type StaffPageResponse = {
  items?: StaffMember[];
};

type RolePageResponse = {
  items?: StaffRole[];
};

type StaffFormState = {
  name: string;
  email: string;
  password: string;
  role_id: string;
};

type RoleFormState = {
  name: string;
  description: string;
  permission_keys: string[];
  is_default: boolean;
};

type ApiErrorLike = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const EMPTY_STAFF_FORM: StaffFormState = {
  name: "",
  email: "",
  password: "",
  role_id: "",
};

const EMPTY_ROLE_FORM: RoleFormState = {
  name: "",
  description: "",
  permission_keys: [],
  is_default: false,
};

const getErrorMessage = (err: unknown, fallback: string) => {
  const maybeError = err as ApiErrorLike;
  return maybeError?.response?.data?.error || fallback;
};

export default function StaffSettingsPage() {
  const { user } = useAdminSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null);
  const [staffForm, setStaffForm] = useState<StaffFormState>(EMPTY_STAFF_FORM);
  const [roleForm, setRoleForm] = useState<RoleFormState>(EMPTY_ROLE_FORM);

  const roleMap = useMemo(() => {
    return roles.reduce<Record<string, StaffRole>>((acc, role) => {
      acc[role.id] = role;
      return acc;
    }, {});
  }, [roles]);
  const planGate = useMemo(
    () => analyzeTenantFeatureAccess(user || {}, { anyFeatures: ["staff_accounts", "role_permissions"] }),
    [user],
  );
  const featureLocked = planGate.state !== "available";

  const loadData = useCallback(async () => {
    if (featureLocked) {
      setStaff([]);
      setRoles([]);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [staffRes, rolesRes] = await Promise.all([
        api.get<StaffPageResponse>("/admin/settings/staff"),
        api.get<RolePageResponse>("/admin/settings/roles"),
      ]);
      setStaff(staffRes.data?.items ?? []);
      setRoles(rolesRes.data?.items ?? []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Gagal memuat data staff"));
    } finally {
      setLoading(false);
    }
  }, [featureLocked]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!staffDialogOpen) {
      setEditingStaff(null);
      setStaffForm(EMPTY_STAFF_FORM);
    }
  }, [staffDialogOpen]);

  useEffect(() => {
    if (!roleDialogOpen) {
      setEditingRole(null);
      setRoleForm(EMPTY_ROLE_FORM);
    }
  }, [roleDialogOpen]);

  const openCreateStaff = () => {
    setEditingStaff(null);
    setStaffForm({
      ...EMPTY_STAFF_FORM,
      role_id: roles.find((role) => role.is_default)?.id || roles[0]?.id || "",
    });
    setStaffDialogOpen(true);
  };

  const openEditStaff = (item: StaffMember) => {
    setEditingStaff(item);
    setStaffForm({
      name: item.name || "",
      email: item.email || "",
      password: "",
      role_id: item.role_id || roles.find((role) => role.name === item.role)?.id || roles.find((role) => role.is_default)?.id || roles[0]?.id || "",
    });
    setStaffDialogOpen(true);
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm(EMPTY_ROLE_FORM);
    setRoleDialogOpen(true);
  };

  const openEditRole = (role: StaffRole) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      permission_keys: [...role.permission_keys],
      is_default: role.is_default,
    });
    setRoleDialogOpen(true);
  };

  const togglePermission = (key: string) => {
    setRoleForm((prev) => ({
      ...prev,
      permission_keys: prev.permission_keys.includes(key)
        ? prev.permission_keys.filter((item) => item !== key)
        : [...prev.permission_keys, key],
    }));
  };

  const selectedPermissionCount = roleForm.permission_keys.length;
  const defaultRolesCount = roles.filter((role) => role.is_default).length;
  const customRolesCount = Math.max(roles.length - defaultRolesCount, 0);
  const selectedStaffRole =
    roles.find((role) => role.id === staffForm.role_id) || null;

  const submitStaff = async () => {
    if (!staffForm.name.trim() || !staffForm.email.trim() || !staffForm.role_id) {
      setError("Nama, email, dan role wajib diisi");
      return;
    }

    if (!editingStaff && !staffForm.password.trim()) {
      setError("Password wajib diisi untuk pegawai baru");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingStaff) {
        await api.put(`/admin/settings/staff/${editingStaff.id}`, {
          name: staffForm.name,
          email: staffForm.email,
          role_id: staffForm.role_id,
        });
      } else {
        await api.post("/admin/settings/staff", {
          name: staffForm.name,
          email: staffForm.email,
          password: staffForm.password,
          role_id: staffForm.role_id,
        });
      }
      setStaffDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Gagal menyimpan pegawai"));
    } finally {
      setSaving(false);
    }
  };

  const submitRole = async () => {
    if (!roleForm.name.trim()) {
      setError("Nama role wajib diisi");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: roleForm.name,
        description: roleForm.description,
        permission_keys: roleForm.permission_keys,
        is_default: roleForm.is_default,
      };

      if (editingRole) {
        await api.put(`/admin/settings/roles/${editingRole.id}`, payload);
      } else {
        await api.post("/admin/settings/roles", payload);
      }

      setRoleDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Gagal menyimpan role"));
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = async (item: StaffMember) => {
    const confirmed = window.confirm(`Hapus pegawai ${item.name}?`);
    if (!confirmed) return;
    setSaving(true);
    setError("");
    try {
      await api.delete(`/admin/settings/staff/${item.id}`);
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Gagal menghapus pegawai"));
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (role: StaffRole) => {
    const confirmed = window.confirm(`Hapus role ${role.name}?`);
    if (!confirmed) return;
    setSaving(true);
    setError("");
    try {
      await api.delete(`/admin/settings/roles/${role.id}`);
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Gagal menghapus role"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <PlanFeatureCallout
        input={user || {}}
        title="Akses tim dan role permission"
        description="Kelola akun staff tambahan dan atur role permission untuk operasional tim."
        requirement={{ anyFeatures: ["staff_accounts", "role_permissions"] }}
      />
      <MobileStaffHero
        staffCount={staff.length}
        defaultRolesCount={defaultRolesCount}
        customRolesCount={customRolesCount}
        onCreateRole={openCreateRole}
        onCreateStaff={openCreateStaff}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
            <Users className="h-4 w-4" />
            Staff
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            Staff & Role
          </h1>
        </div>
        <div className="hidden flex-col gap-2 sm:flex sm:flex-row sm:flex-wrap">
          <Button variant="outline" onClick={openCreateRole} className="w-full gap-2 sm:w-auto dark:border-white/10 dark:bg-white/[0.03]">
            <UserCog className="h-4 w-4" />
            Role
          </Button>
          <Button onClick={openCreateStaff} className="w-full gap-2 bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)] sm:w-auto">
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr] xl:gap-6">
        <Card className="rounded-xl border-slate-200 bg-white p-3 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-2xl sm:p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                Daftar Pegawai
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-slate-200 dark:border-white/5 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5">
                  <tr>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-500" colSpan={4}>
                        Memuat data...
                      </td>
                    </tr>
                  ) : staff.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-500" colSpan={4}>
                        Belum ada pegawai.
                      </td>
                    </tr>
                  ) : (
                    staff.map((item) => {
                      const role = item.role_id ? roleMap[item.role_id] : undefined;
                      return (
                        <tr key={item.id} className="border-t border-slate-200 dark:border-white/5">
                          <td className="px-3 py-3 font-medium text-slate-950 dark:text-white">
                            {item.name}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                            {item.email}
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant="secondary" className="gap-1">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {role?.name || item.role || "-"}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="inline-flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditStaff(item)} className="gap-2">
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteStaff(item)}
                                className="gap-2"
                                disabled={saving}
                              >
                                <Trash2 className="h-4 w-4" />
                                Hapus
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500 dark:border-white/5">
                Memuat data...
              </div>
            ) : staff.length === 0 ? (
              <EmptyMobileState
                title="Belum ada pegawai"
                description="Tambah staff pertama untuk mulai delegasi operasional tenant."
                actionLabel="Tambah Pegawai"
                onAction={openCreateStaff}
              />
            ) : (
              staff.map((item) => {
                const role = item.role_id ? roleMap[item.role_id] : undefined;
                return (
                  <div key={item.id} className="rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(248,250,252,0.96))] p-4 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,12,24,0.98))]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-slate-950 dark:text-white">{item.name}</div>
                        <div className="mt-1 flex items-center gap-2 break-all text-xs text-slate-500">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {item.email}
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 gap-1 rounded-full px-3 py-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {role?.name || item.role || "-"}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditStaff(item)} className="w-full gap-2 rounded-xl">
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteStaff(item)}
                        className="w-full gap-2 rounded-xl"
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="rounded-xl border-slate-200 bg-white p-3 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-2xl sm:p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                Role
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Mulai dari 2 role bawaan, lalu tambah custom kalau perlu.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={openCreateRole} className="gap-2">
              <Plus className="h-4 w-4" />
              Role
            </Button>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-[color:rgba(59,130,246,0.18)] bg-[var(--bookinaja-50)] p-3 dark:border-[color:rgba(96,165,250,0.18)] dark:bg-[color:rgba(59,130,246,0.12)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-100)]">
                2 role bawaan
              </div>
              <div className="mt-3 space-y-3">
                {RECOMMENDED_ROLE_PRESETS.map((preset) => (
                  <div key={preset.name} className="rounded-[1.25rem] border border-white/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">
                      {preset.name}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {preset.summary}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {preset.permissions.slice(0, 6).map((permission) => (
                        <Badge key={permission} variant="secondary" className="font-normal">
                          {permission}
                        </Badge>
                      ))}
                      {preset.permissions.length > 6 ? (
                        <Badge variant="secondary" className="font-normal">
                          +{preset.permissions.length - 6} lagi
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {roles.length === 0 ? (
              <EmptyMobileState
                title="Belum ada role"
                description="Mulai dari 2 role bawaan atau buat role custom kalau kebutuhan timmu lebih spesifik."
                actionLabel="Buat Role"
                onAction={openCreateRole}
              />
            ) : (
              roles.map((role) => (
                <div key={role.id} className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950 dark:text-white">{role.name}</span>
                        {role.is_default && <Badge>Default</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{role.description || "Tidak ada deskripsi"}</p>
                      <p className="mt-2 text-[11px] font-medium text-slate-400">
                        {role.permission_keys.length} permission aktif
                      </p>
                    </div>
                    <div className="hidden shrink-0 gap-2 sm:flex">
                      <Button variant="outline" size="sm" onClick={() => openEditRole(role)} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteRole(role)}
                        disabled={saving || role.is_default}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
                    <Button variant="outline" size="sm" onClick={() => openEditRole(role)} className="gap-2 rounded-xl">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteRole(role)}
                      disabled={saving || role.is_default}
                      className="gap-2 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {role.permission_keys.length === 0 ? (
                      <span className="text-xs text-slate-500">Belum ada permission.</span>
                    ) : (
                      role.permission_keys.map((permission) => (
                        <Badge key={permission} variant="secondary" className="font-normal">
                          {permission}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 p-0 sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:border sm:border-slate-200">
          <DialogHeader className="shrink-0 border-b border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 py-4 sm:px-6">
            <DialogTitle>{editingStaff ? "Edit Pegawai" : "Tambah Pegawai"}</DialogTitle>
            <DialogDescription>{editingStaff ? "Update akses dan identitas staff." : "Buat akun staff baru untuk tenant ini."}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 overscroll-contain sm:px-6">
            <div className="rounded-[1.35rem] border border-[color:rgba(59,130,246,0.18)] bg-[var(--bookinaja-50)] p-4 dark:border-[color:rgba(96,165,250,0.18)] dark:bg-[color:rgba(59,130,246,0.12)]">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-100)]">
                Akun staff
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Isi identitas singkat, lalu pilih role yang paling pas untuk tugas hariannya.
              </div>
            </div>

            <div className="space-y-3 rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                <UserRound className="h-4 w-4 text-[var(--bookinaja-600)]" />
                Identitas
              </div>

              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="staff-name">Nama</Label>
                  <Input
                    id="staff-name"
                    placeholder="Contoh: Rani Frontdesk"
                    className="h-11 rounded-[1.1rem]"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="staff-email">Email</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    placeholder="nama@tenant.com"
                    className="h-11 rounded-[1.1rem]"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {!editingStaff && (
              <div className="space-y-3 rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                  <LockKeyhole className="h-4 w-4 text-[var(--bookinaja-600)]" />
                  Keamanan awal
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="staff-password">Password</Label>
                  <Input
                    id="staff-password"
                    type="password"
                    placeholder="Buat password sementara"
                    className="h-11 rounded-[1.1rem]"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3 rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-[var(--bookinaja-600)]" />
                Role akses
              </div>

              <div className="grid gap-2">
                <Label>Role</Label>
                <Select
                  value={staffForm.role_id}
                  onValueChange={(value) => setStaffForm((prev) => ({ ...prev, role_id: value }))}
                >
                  <SelectTrigger className="h-11 w-full rounded-[1.1rem] px-3">
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedStaffRole ? (
                <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      {selectedStaffRole.name}
                    </Badge>
                    {selectedStaffRole.is_default ? (
                      <Badge className="rounded-full">Default</Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {selectedStaffRole.description || "Role ini belum punya deskripsi."}
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-slate-400">
                    {selectedStaffRole.permission_keys.length} permission aktif
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-none border-t border-slate-200 bg-white px-4 py-4 sm:rounded-b-[1.75rem] sm:px-6">
            <Button onClick={submitStaff} disabled={saving} className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]">
              {editingStaff ? "Simpan" : "Tambah"}
            </Button>
            <Button variant="outline" onClick={() => setStaffDialogOpen(false)} disabled={saving} className="rounded-xl">
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 p-0 sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:border sm:border-slate-200">
          <DialogHeader className="shrink-0 border-b border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 py-4 sm:px-6">
            <DialogTitle>{editingRole ? "Edit Role" : "Buat Role"}</DialogTitle>
            <DialogDescription>Atur akses role untuk tim tenant.</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 overscroll-contain sm:px-6">
            <div className="grid gap-2">
              <Label htmlFor="role-name">Nama Role</Label>
              <Input
                id="role-name"
                value={roleForm.name}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-description">Deskripsi</Label>
              <Textarea
                id="role-description"
                value={roleForm.description}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Permission</Label>
                <span className="text-xs text-slate-500">
                  {selectedPermissionCount} dipilih
                </span>
              </div>
              <Separator />
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {group.title}
                      </div>
                      <div className="text-xs text-slate-500">{group.description}</div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.items.map((permission) => {
                        const checked = roleForm.permission_keys.includes(permission.key);
                        return (
                          <button
                            key={permission.key}
                            type="button"
                            onClick={() => togglePermission(permission.key)}
                            className={`flex min-h-24 flex-col items-start justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                              checked
                                ? "border-[var(--bookinaja-500)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/5"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="min-w-0 font-medium">{permission.label}</div>
                              <div className="text-xs leading-5 opacity-80">{permission.help}</div>
                            </div>
                            <span className="shrink-0 text-[11px] leading-tight">{permission.key}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-none border-t border-slate-200 bg-white px-4 py-4 sm:rounded-b-[1.75rem] sm:px-6">
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)} disabled={saving} className="rounded-xl">
              Batal
            </Button>
            <Button onClick={submitRole} disabled={saving} className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]">
              {editingRole ? "Simpan Role" : "Buat Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MobileStaffHero({
  staffCount,
  defaultRolesCount,
  customRolesCount,
  onCreateRole,
  onCreateStaff,
}: {
  staffCount: number;
  defaultRolesCount: number;
  customRolesCount: number;
  onCreateRole: () => void;
  onCreateStaff: () => void;
}) {
  return (
    <section className="space-y-3 sm:hidden">
      <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))] p-4 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--bookinaja-700)]">
          <Sparkles className="h-3.5 w-3.5" />
          Team Access
        </div>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
          Staff & Role
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Atur siapa yang bisa bantu operasional tenant dan akses apa yang mereka pegang.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MobileHeroMetric label="Staff" value={staffCount} />
          <MobileHeroMetric label="Default" value={defaultRolesCount} />
          <MobileHeroMetric label="Custom" value={customRolesCount} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onCreateRole} className="h-12 rounded-2xl gap-2">
          <UserCog className="h-4 w-4" />
          Role
        </Button>
        <Button onClick={onCreateStaff} className="h-12 rounded-2xl gap-2 bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]">
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>
    </section>
  );
}

function MobileHeroMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 px-3 py-3 text-center shadow-sm">
      <div className="text-lg font-black tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

function EmptyMobileState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="font-semibold text-slate-950 dark:text-white">{title}</div>
      <div className="mt-1 leading-6 text-slate-500 dark:text-slate-400">{description}</div>
      <Button variant="outline" onClick={onAction} className="mt-3 rounded-xl gap-2">
        {actionLabel}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
