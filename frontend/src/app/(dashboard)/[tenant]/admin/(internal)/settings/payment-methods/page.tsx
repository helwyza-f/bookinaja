"use client";

import { useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import {
  CheckCircle2,
  ChevronDown,
  Edit3,
  Landmark,
  Link2,
  QrCode,
  Save,
  Settings2,
  Wallet,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { analyzeTenantFeatureAccess } from "@/lib/plan-access";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { PlanFeatureCallout } from "@/components/dashboard/plan-feature-ux";

type PaymentMethodItem = {
  code: string;
  display_name: string;
  category: string;
  verification_type: string;
  provider: string;
  instructions: string;
  is_active: boolean;
  sort_order: number;
  metadata?: {
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    qr_image_url?: string;
    footer_note?: string;
  };
};

type ResourceItem = {
  id: string;
  name: string;
  operating_mode?: string;
};

type DepositOverrideItem = {
  resource_id: string;
  resource_name?: string;
  override_dp: boolean;
  dp_enabled: boolean;
  dp_percentage: number;
};

type DepositSettings = {
  dp_enabled: boolean;
  dp_percentage: number;
  resource_configs: DepositOverrideItem[];
};

const defaults: PaymentMethodItem[] = [
  {
    code: "midtrans",
    display_name: "Midtrans / QRIS Gateway",
    category: "gateway",
    verification_type: "auto",
    provider: "midtrans",
    instructions: "Pembayaran diverifikasi otomatis oleh Midtrans.",
    is_active: true,
    sort_order: 1,
    metadata: {},
  },
  {
    code: "bank_transfer",
    display_name: "Transfer Bank",
    category: "manual",
    verification_type: "manual",
    provider: "bank_transfer",
    instructions:
      "Transfer ke rekening tenant lalu kirim bukti bayar untuk diverifikasi admin.",
    is_active: false,
    sort_order: 2,
    metadata: {},
  },
  {
    code: "qris_static",
    display_name: "QRIS Static",
    category: "manual",
    verification_type: "manual",
    provider: "qris_static",
    instructions:
      "Scan QRIS tenant lalu kirim bukti bayar untuk diverifikasi admin.",
    is_active: false,
    sort_order: 3,
    metadata: {},
  },
  {
    code: "cash",
    display_name: "Cash / Bayar di Tempat",
    category: "manual",
    verification_type: "manual",
    provider: "cash",
    instructions: "Pembayaran diterima langsung oleh admin atau kasir tenant.",
    is_active: true,
    sort_order: 4,
    metadata: {},
  },
];

const methodTone: Record<string, string> = {
  midtrans: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200",
  bank_transfer:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
  qris_static:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
  cash: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
};

const labelMap: Record<string, string> = {
  midtrans: "Otomatis",
  bank_transfer: "Manual",
  qris_static: "Manual",
  cash: "Manual",
};

const methodSummary = (item: PaymentMethodItem) => {
  if (item.code === "bank_transfer") {
    return [
      item.metadata?.bank_name,
      item.metadata?.account_number,
      item.metadata?.account_name,
    ]
      .filter(Boolean)
      .join(" / ") || "Rekening belum diatur";
  }
  if (item.code === "qris_static") {
    return item.metadata?.qr_image_url
      ? "QRIS siap dipakai customer"
      : "QRIS belum diatur";
  }
  if (item.code === "cash") {
    return "Konfirmasi langsung ke kasir atau admin";
  }
  return "Snap Midtrans untuk DP dan pelunasan otomatis";
};

const methodGuide = (item: PaymentMethodItem) => {
  if (item.code === "bank_transfer") {
    return "Isi rekening tujuan dan instruksi singkat.";
  }
  if (item.code === "qris_static") {
    return "Upload QRIS lalu cek preview sebelum diaktifkan.";
  }
  if (item.code === "cash") {
    return "Cocok untuk bayar di venue atau kasir.";
  }
  return "Metode otomatis untuk pembayaran online.";
};

const methodIcon = (code: string) => {
  if (code === "qris_static") return QrCode;
  if (code === "cash") return Wallet;
  return Landmark;
};

export default function PaymentMethodsSettingsPage() {
  const { user } = useAdminSession();
  const [items, setItems] = useState<PaymentMethodItem[]>(defaults);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [depositSettings, setDepositSettings] = useState<DepositSettings>({
    dp_enabled: true,
    dp_percentage: 40,
    resource_configs: [],
  });
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draftItem, setDraftItem] = useState<PaymentMethodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMethodCode, setSavingMethodCode] = useState<string | null>(null);
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [showDepositOverrides, setShowDepositOverrides] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(false);
  const planGate = useMemo(
    () =>
      analyzeTenantFeatureAccess(user || {}, {
        anyFeatures: ["payment_method_management", "manual_payment_verification"],
      }),
    [user],
  );
  const featureLocked = planGate.state !== "available";

  useEffect(() => {
    if (featureLocked) {
      setItems(defaults);
      setResources([]);
      setLoading(false);
      return;
    }
    Promise.all([
      api.get("/admin/payment-methods"),
      api.get("/admin/deposit-settings"),
      api.get("/admin/resources/summary"),
    ])
      .then(([paymentRes, depositRes, resourceRes]) => {
        setItems(paymentRes.data?.items?.length ? paymentRes.data.items : defaults);
        setDepositSettings({
          dp_enabled: Boolean(depositRes.data?.dp_enabled ?? true),
          dp_percentage: Number(depositRes.data?.dp_percentage ?? 40),
          resource_configs: Array.isArray(depositRes.data?.resource_configs)
            ? depositRes.data.resource_configs
            : [],
        });
        const resourceItems = Array.isArray(resourceRes.data?.items)
          ? resourceRes.data.items
          : Array.isArray(resourceRes.data)
            ? resourceRes.data
            : [];
        setResources(resourceItems);
      })
      .catch(() => toast.error("Gagal memuat pengaturan pembayaran"))
      .finally(() => setLoading(false));
  }, [featureLocked]);

  const activeCount = useMemo(
    () => items.filter((item) => item.is_active).length,
    [items],
  );

  const timedResources = useMemo(
    () =>
      resources.filter(
        (resource) => String(resource.operating_mode || "timed").toLowerCase() === "timed",
      ),
    [resources],
  );

  const overrideCount = useMemo(
    () =>
      depositSettings.resource_configs.filter(
        (item) =>
          item.override_dp &&
          timedResources.some((resource) => resource.id === item.resource_id),
      ).length,
    [depositSettings.resource_configs, timedResources],
  );

  const getMethodValidationErrors = (item: PaymentMethodItem) => {
    const errors: string[] = [];
    if (!item.display_name.trim()) errors.push("Nama tampil wajib diisi.");
    if (!item.instructions.trim()) errors.push("Instruksi pembayaran wajib diisi.");
    if (item.code === "bank_transfer") {
      if (!item.metadata?.bank_name?.trim()) errors.push("Nama bank wajib diisi.");
      if (!item.metadata?.account_name?.trim()) {
        errors.push("Nama pemilik rekening wajib diisi.");
      }
      if (!item.metadata?.account_number?.trim()) {
        errors.push("Nomor rekening wajib diisi.");
      }
    }
    if (item.code === "qris_static" && !item.metadata?.qr_image_url?.trim()) {
      errors.push("Gambar QRIS wajib diisi.");
    }
    return errors;
  };

  const startEditing = (item: PaymentMethodItem) => {
    setEditingCode(item.code);
    setDraftItem({ ...item, metadata: { ...(item.metadata || {}) } });
  };

  const cancelEditing = () => {
    setEditingCode(null);
    setDraftItem(null);
  };

  const updateDraft = (patch: Partial<PaymentMethodItem>) => {
    setDraftItem((current) => {
      if (!current) return current;
      return {
        ...current,
        ...patch,
        metadata: {
          ...(current.metadata || {}),
          ...(patch.metadata || {}),
        },
      };
    });
  };

  const saveItems = async (
    nextItems: PaymentMethodItem[],
    successMessage: string,
    code?: string,
  ) => {
    setSavingMethodCode(code || "all");
    try {
      await api.put("/admin/payment-methods", { items: nextItems });
      setItems(nextItems);
      toast.success(successMessage);
      return true;
    } catch (error) {
      const err = error as AxiosError<{ error?: string }>;
      toast.error(err.response?.data?.error || "Gagal menyimpan metode pembayaran");
      return false;
    } finally {
      setSavingMethodCode(null);
    }
  };

  const saveDraft = async () => {
    if (!draftItem) return;
    const errors = draftItem.is_active ? getMethodValidationErrors(draftItem) : [];
    if (errors.length > 0) {
      toast.error("Lengkapi data metode ini dulu.");
      return;
    }
    const nextItems = items.map((item) =>
      item.code === draftItem.code ? draftItem : item,
    );
    const ok = await saveItems(nextItems, "Metode pembayaran diperbarui", draftItem.code);
    if (ok) cancelEditing();
  };

  const toggleMethod = async (item: PaymentMethodItem, checked: boolean) => {
    if (checked) {
      const errors = getMethodValidationErrors({ ...item, is_active: true });
      if (errors.length > 0) {
        startEditing(item);
        toast.error(`Lengkapi ${item.display_name} sebelum diaktifkan.`);
        return;
      }
    }
    const nextItems = items.map((entry) =>
      entry.code === item.code ? { ...entry, is_active: checked } : entry,
    );
    await saveItems(
      nextItems,
      checked ? `${item.display_name} diaktifkan` : `${item.display_name} dinonaktifkan`,
      item.code,
    );
  };

  const draftErrors =
    draftItem && draftItem.is_active ? getMethodValidationErrors(draftItem) : [];

  const getOverride = (resourceId: string) =>
    depositSettings.resource_configs.find((item) => item.resource_id === resourceId);

  const updateDepositOverride = (
    resource: ResourceItem,
    patch: Partial<DepositOverrideItem>,
  ) => {
    setDepositSettings((current) => {
      const existing = current.resource_configs.find(
        (item) => item.resource_id === resource.id,
      );
      const nextItem: DepositOverrideItem = {
        resource_id: resource.id,
        resource_name: resource.name,
        override_dp: existing?.override_dp ?? false,
        dp_enabled: existing?.dp_enabled ?? current.dp_enabled,
        dp_percentage: existing?.dp_percentage ?? current.dp_percentage,
        ...patch,
      };
      const nextItems = current.resource_configs.filter(
        (item) => item.resource_id !== resource.id,
      );
      if (nextItem.override_dp) nextItems.push(nextItem);
      return { ...current, resource_configs: nextItems };
    });
  };

  const saveDepositSettings = async () => {
    if (depositSettings.dp_percentage < 0 || depositSettings.dp_percentage > 100) {
      toast.error("Persentase DP default harus 0 - 100.");
      return;
    }
    if (
      depositSettings.resource_configs.some(
        (item) => item.dp_percentage < 0 || item.dp_percentage > 100,
      )
    ) {
      toast.error("Persentase DP resource harus 0 - 100.");
      return;
    }
    setSavingDeposit(true);
    try {
      const timedResourceIds = new Set(timedResources.map((resource) => resource.id));
      const payload = {
        dp_enabled: depositSettings.dp_enabled,
        dp_percentage: Number(depositSettings.dp_percentage || 0),
        resource_configs: depositSettings.resource_configs
          .filter((item) => timedResourceIds.has(item.resource_id))
          .map((item) => ({
            resource_id: item.resource_id,
            override_dp: item.override_dp,
            dp_enabled: item.dp_enabled,
            dp_percentage: Number(item.dp_percentage || 0),
          })),
      };
      const res = await api.put("/admin/deposit-settings", payload);
      setDepositSettings({
        dp_enabled: Boolean(res.data?.data?.dp_enabled ?? payload.dp_enabled),
        dp_percentage: Number(res.data?.data?.dp_percentage ?? payload.dp_percentage),
        resource_configs: Array.isArray(res.data?.data?.resource_configs)
          ? res.data.data.resource_configs
          : payload.resource_configs,
      });
      setEditingDeposit(false);
      setShowDepositOverrides(false);
      toast.success("Pengaturan DP diperbarui");
    } catch (error) {
      const err = error as AxiosError<{ error?: string }>;
      toast.error(err.response?.data?.error || "Gagal menyimpan pengaturan DP");
    } finally {
      setSavingDeposit(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      <PlanFeatureCallout
        input={user || {}}
        title="Metode bayar dan verifikasi manual"
        description="Workflow pembayaran tenant lebih enak dipahami kalau owner langsung lihat apakah pengelolaan payment method dan verifikasi manual sudah masuk di plan sekarang."
        requirement={{ anyFeatures: ["payment_method_management", "manual_payment_verification"] }}
      />
      <Card className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))] p-5 shadow-sm dark:border-white/12 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(8,47,73,0.94))]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              Payments
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Payment Methods
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Pilih metode bayar yang tampil ke customer, lalu atur DP default kalau
              perlu untuk resource timed.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:w-auto">
            <SummaryStat label="Aktif" value={String(activeCount)} />
            <SummaryStat
              label="DP"
              value={depositSettings.dp_enabled ? `${depositSettings.dp_percentage}%` : "Off"}
            />
            <SummaryStat label="Override" value={String(overrideCount)} />
          </div>
        </div>
      </Card>

      <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-white/5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            Metode Bayar
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Aktifkan yang dipakai, edit hanya data yang penting.
          </p>
        </div>

        <div className="grid gap-3 p-4 sm:p-5 xl:grid-cols-2">
          {items.map((item) => {
            const isEditing = editingCode === item.code && draftItem;
            const currentItem = isEditing ? draftItem : item;
            const Icon = methodIcon(item.code);
            const busy = savingMethodCode === item.code || savingMethodCode === "all";
            const ready = getMethodValidationErrors(item).length === 0;

            return (
              <div
                key={item.code}
                className="rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-4 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("rounded-2xl p-3", methodTone[item.code] || methodTone.cash)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                            {currentItem.display_name}
                          </h2>
                          <span
                            className={cn(
                              "rounded-md px-2.5 py-1 text-[11px] font-medium",
                              currentItem.is_active
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                                : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300",
                            )}
                          >
                            {currentItem.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                          <span className="rounded-md bg-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {labelMap[currentItem.code] || currentItem.verification_type}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {methodSummary(currentItem)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {methodGuide(currentItem)}
                        </p>
                      </div>

                      {!isEditing ? (
                        <Switch
                          checked={item.is_active}
                          disabled={busy || loading}
                          onCheckedChange={(checked) => void toggleMethod(item, checked)}
                        />
                      ) : null}
                    </div>

                    {!isEditing ? (
                      <div className="mt-4 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {item.code === "bank_transfer" ? (
                            <MiniChip label={item.metadata?.bank_name || "Bank belum diatur"} />
                          ) : null}
                          {item.code === "qris_static" ? (
                            <MiniChip
                              label={item.metadata?.qr_image_url ? "QRIS siap" : "QRIS kosong"}
                            />
                          ) : null}
                          {item.code === "midtrans" ? (
                            <MiniChip label="DP & settlement auto" />
                          ) : null}
                          {item.code === "cash" ? <MiniChip label="Tanpa bukti upload" /> : null}
                          <MiniChip
                            label={ready ? "Siap dipakai" : "Perlu dilengkapi"}
                            tone={ready ? "emerald" : "amber"}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              Detail metode
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Nama tampil, instruksi, dan data verifikasi.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => startEditing(item)}
                            disabled={editingCode !== null || busy}
                            className="h-10 rounded-xl px-3 text-xs"
                          >
                            <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Detail Metode
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Lengkapi hanya field yang dipakai metode ini.
                          </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="Nama tampil">
                            <Input
                              value={currentItem.display_name}
                              onChange={(e) => updateDraft({ display_name: e.target.value })}
                              disabled={busy}
                            />
                          </Field>

                          <Field label="Aktif">
                            <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 px-3 dark:border-white/10">
                              <span className="text-sm text-slate-600 dark:text-slate-300">
                                {currentItem.is_active
                                  ? "Siap dipakai customer"
                                  : "Disembunyikan"}
                              </span>
                              <Switch
                                checked={currentItem.is_active}
                                onCheckedChange={(checked) =>
                                  updateDraft({ is_active: checked })
                                }
                                disabled={busy}
                              />
                            </div>
                          </Field>

                          {currentItem.code === "bank_transfer" ? (
                            <>
                              <Field label="Nama bank">
                                <Input
                                  value={currentItem.metadata?.bank_name || ""}
                                  onChange={(e) =>
                                    updateDraft({ metadata: { bank_name: e.target.value } })
                                  }
                                  disabled={busy}
                                />
                              </Field>
                              <Field label="Atas nama">
                                <Input
                                  value={currentItem.metadata?.account_name || ""}
                                  onChange={(e) =>
                                    updateDraft({ metadata: { account_name: e.target.value } })
                                  }
                                  disabled={busy}
                                />
                              </Field>
                              <Field label="Nomor rekening" className="md:col-span-2">
                                <Input
                                  value={currentItem.metadata?.account_number || ""}
                                  onChange={(e) =>
                                    updateDraft({ metadata: { account_number: e.target.value } })
                                  }
                                  disabled={busy}
                                />
                              </Field>
                            </>
                          ) : null}

                          {currentItem.code === "qris_static" ? (
                            <Field label="QRIS" className="md:col-span-2">
                              <div className="space-y-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                                  <SingleImageUpload
                                    value={currentItem.metadata?.qr_image_url || ""}
                                    onChange={(url) =>
                                      updateDraft({ metadata: { qr_image_url: url } })
                                    }
                                    endpoint="/admin/upload-media"
                                    label=""
                                    aspect="square"
                                  />
                                </div>
                                <Input
                                  value={currentItem.metadata?.qr_image_url || ""}
                                  onChange={(e) =>
                                    updateDraft({ metadata: { qr_image_url: e.target.value } })
                                  }
                                  disabled={busy}
                                  placeholder="Atau isi URL gambar QRIS"
                                />
                                {currentItem.metadata?.qr_image_url ? (
                                  <a
                                    href={currentItem.metadata.qr_image_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-xs font-medium text-blue-600"
                                  >
                                    <Link2 className="h-3.5 w-3.5" />
                                    Preview QRIS
                                  </a>
                                ) : null}
                              </div>
                            </Field>
                          ) : null}

                          <Field label="Instruksi" className="md:col-span-2">
                            <Textarea
                              value={currentItem.instructions}
                              onChange={(e) => updateDraft({ instructions: e.target.value })}
                              rows={3}
                              disabled={busy}
                            />
                          </Field>
                        </div>

                        <div className="mt-3">
                          {draftErrors.length > 0 ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                              {draftErrors.join(" ")}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Siap dipakai.
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelEditing}
                            disabled={busy}
                            className="h-10 flex-1 rounded-xl"
                          >
                            <X className="mr-1.5 h-3.5 w-3.5" />
                            Batal
                          </Button>
                          <Button
                            type="button"
                            onClick={() => void saveDraft()}
                            disabled={busy}
                            className="h-10 flex-1 rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
                          >
                            <Save className="mr-1.5 h-3.5 w-3.5" />
                            {busy ? "Menyimpan..." : "Simpan"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Deposit Policy
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                DP
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Hanya berlaku untuk resource timed.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <MiniChip
                label={depositSettings.dp_enabled ? "DP aktif" : "DP nonaktif"}
                tone={depositSettings.dp_enabled ? "emerald" : "slate"}
              />
              <MiniChip label={`${depositSettings.dp_percentage}% default`} />
              <MiniChip label={`${overrideCount} override`} />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2">
            <SummaryStat label="Status" value={depositSettings.dp_enabled ? "On" : "Off"} />
            <SummaryStat label="Default" value={`${depositSettings.dp_percentage}%`} />
            <SummaryStat label="Override" value={String(overrideCount)} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Atur default dulu. Override hanya untuk resource timed yang memang beda.
            </div>
            {!editingDeposit ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingDeposit(true)}
                className="h-9 rounded-lg px-3 text-xs"
              >
                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  Default tenant
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Dipakai untuk semua resource timed yang belum punya override.
                </p>
              </div>

              {!editingDeposit ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      Status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                      {depositSettings.dp_enabled ? "Aktif" : "Nonaktif"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      Persentase
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                      {depositSettings.dp_percentage}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      DP default aktif
                    </span>
                    <Switch
                      checked={depositSettings.dp_enabled}
                      onCheckedChange={(checked) =>
                        setDepositSettings((current) => ({
                          ...current,
                          dp_enabled: checked,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Persentase default</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={depositSettings.dp_percentage}
                      onChange={(event) =>
                        setDepositSettings((current) => ({
                          ...current,
                          dp_percentage: Number(event.target.value || 0),
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Ringkas</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-3 dark:bg-white/[0.04]">
                  <span>Status</span>
                  <span className="font-semibold">
                    {depositSettings.dp_enabled ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-3 dark:bg-white/[0.04]">
                  <span>Default</span>
                  <span className="font-semibold">{depositSettings.dp_percentage}%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-3 dark:bg-white/[0.04]">
                  <span>Override</span>
                  <span className="font-semibold">{overrideCount} resource</span>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs leading-5 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                Resource direct sale tidak ikut DP policy ini. Pakai override hanya
                kalau ada resource timed yang butuh DP berbeda.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDepositOverrides((current) => !current)}
            disabled={!editingDeposit}
            className="flex w-full items-center justify-between rounded-[1.2rem] border border-slate-200 bg-slate-50/70 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-900/5 p-2 dark:bg-white/10">
                <Settings2 className="h-4 w-4 text-slate-600 dark:text-slate-200" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  Override resource
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {editingDeposit
                    ? "Buka hanya kalau ada resource timed yang memang beda dari default."
                    : "Masuk edit mode dulu untuk mengubah override timed resource."}
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-500 transition-transform",
                showDepositOverrides && "rotate-180",
              )}
            />
          </button>

          {editingDeposit && showDepositOverrides ? (
            timedResources.length > 0 ? (
            <div className="space-y-3">
              {timedResources.map((resource) => {
                const override = getOverride(resource.id);
                return (
                  <div
                    key={resource.id}
                    className="rounded-[1.25rem] border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {resource.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {override?.override_dp
                            ? `${override.dp_enabled ? "DP aktif" : "DP nonaktif"} / ${override.dp_percentage}%`
                            : "Ikut default tenant"}
                        </p>
                      </div>
                      <Switch
                        checked={Boolean(override?.override_dp)}
                        onCheckedChange={(checked) =>
                          updateDepositOverride(resource, {
                            override_dp: checked,
                            dp_enabled: checked
                              ? (override?.dp_enabled ?? depositSettings.dp_enabled)
                              : depositSettings.dp_enabled,
                            dp_percentage: checked
                              ? (override?.dp_percentage ?? depositSettings.dp_percentage)
                              : depositSettings.dp_percentage,
                          })
                        }
                      />
                    </div>

                    {override?.override_dp ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            DP aktif
                          </span>
                          <Switch
                            checked={override.dp_enabled}
                            onCheckedChange={(checked) =>
                              updateDepositOverride(resource, { dp_enabled: checked })
                            }
                          />
                        </div>
                        <div>
                          <Label>Persentase</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={override.dp_percentage}
                            onChange={(event) =>
                              updateDepositOverride(resource, {
                                dp_percentage: Number(event.target.value || 0),
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                Belum ada resource timed. DP policy tidak dipakai untuk direct sale.
              </div>
            )
          ) : null}

          {editingDeposit ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingDeposit(false);
                  setShowDepositOverrides(false);
                }}
                disabled={savingDeposit}
                className="h-10 flex-1 rounded-xl"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Batal
              </Button>
              <Button
                onClick={() => void saveDepositSettings()}
                disabled={savingDeposit}
                className="h-10 flex-1 rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {savingDeposit ? "Menyimpan..." : "Simpan DP"}
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-slate-200/80 bg-white/80 px-3 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MiniChip({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "emerald" | "amber";
}) {
  const tones = {
    slate:
      "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
  };

  return (
    <span className={cn("rounded-md border px-2.5 py-1 text-[11px] font-medium", tones[tone])}>
      {label}
    </span>
  );
}
