"use client";

import { useEffect, useMemo, useState } from "react";
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

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, []);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Users className="h-4 w-4" />
            Manajemen Pegawai
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            Role dan akses pegawai
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-500">
            Tambahkan pegawai, pilih role operasional, dan atur permission per domain kerja. Owner tetap terpisah dengan akses penuh di level bisnis.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button variant="outline" onClick={openCreateRole} className="w-full gap-2 sm:w-auto">
            <UserCog className="h-4 w-4" />
            Role Baru
          </Button>
          <Button onClick={openCreateStaff} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            Tambah Pegawai
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr] xl:gap-6">
        <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0b0b0b]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                Daftar Pegawai
              </h2>
              <p className="text-xs text-slate-500">
                Klik edit untuk mengganti data atau role.
              </p>
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
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10">
                Belum ada pegawai.
              </div>
            ) : (
              staff.map((item) => {
                const role = item.role_id ? roleMap[item.role_id] : undefined;
                return (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-950 dark:text-white">{item.name}</div>
                        <div className="mt-1 break-all text-xs text-slate-500">{item.email}</div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {role?.name || item.role || "-"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Button variant="outline" size="sm" onClick={() => openEditStaff(item)} className="w-full gap-2 sm:w-auto">
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteStaff(item)}
                        className="w-full gap-2 sm:w-auto"
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

        <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0b0b0b]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                Role Default dan Custom
              </h2>
              <p className="text-xs text-slate-500">
                Role di sini yang dipilih saat tambah atau edit pegawai.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={openCreateRole} className="gap-2">
              <Plus className="h-4 w-4" />
              Role
            </Button>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-500/10 dark:bg-blue-950/10">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                Preset Operasional Gaming / Rental
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Lima preset ini disusun dari tanggung jawab outlet yang paling umum. Owner tidak dipilih di sini karena owner selalu punya akses penuh dan berdiri di luar role staff.
              </p>
              <div className="mt-3 space-y-3">
                {RECOMMENDED_ROLE_PRESETS.map((preset) => (
                  <div key={preset.name} className="rounded-lg border border-white/70 bg-white/80 p-3 dark:border-white/5 dark:bg-white/[0.03]">
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">
                      {preset.name}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {preset.summary}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {preset.permissions.map((permission) => (
                        <Badge key={permission} variant="secondary" className="font-normal">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {roles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10">
                Belum ada role.
              </div>
            ) : (
              roles.map((role) => (
                <div key={role.id} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
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
                    <div className="flex shrink-0 gap-2">
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
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Pegawai" : "Tambah Pegawai"}</DialogTitle>
            <DialogDescription>
              {editingStaff
                ? "Ubah data pegawai dan pilih role yang sesuai."
                : "Buat pegawai baru lalu pilih role default atau custom."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="staff-name">Nama</Label>
              <Input
                id="staff-name"
                value={staffForm.name}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={staffForm.email}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            {!editingStaff && (
              <div className="grid gap-2">
                <Label htmlFor="staff-password">Password</Label>
                <Input
                  id="staff-password"
                  type="password"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={staffForm.role_id}
                onValueChange={(value) => setStaffForm((prev) => ({ ...prev, role_id: value }))}
              >
                <SelectTrigger className="w-full">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffDialogOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={submitStaff} disabled={saving}>
              {editingStaff ? "Simpan Perubahan" : "Simpan Pegawai"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Buat Role"}</DialogTitle>
            <DialogDescription>
              Atur nama role, deskripsi, dan permission yang melekat ke role ini.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
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
                            className={`flex min-h-20 flex-col items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                              checked
                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200"
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={submitRole} disabled={saving}>
              {editingRole ? "Simpan Role" : "Buat Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
