"use client";

import { useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import {
  CheckCircle2,
  Edit3,
  Landmark,
  Link2,
  QrCode,
  Save,
  Wallet,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import { toast } from "sonner";

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
    instructions:
      "Pembayaran diterima langsung oleh admin atau kasir tenant.",
    is_active: true,
    sort_order: 4,
    metadata: {},
  },
];

const iconMap = {
  qris_static: QrCode,
  cash: Wallet,
  default: Landmark,
};

const labelMap: Record<string, string> = {
  bank_transfer: "Transfer bank manual",
  qris_static: "QRIS static manual",
  cash: "Bayar langsung di lokasi",
  midtrans: "Gateway otomatis",
};

export default function PaymentMethodsSettingsPage() {
  const [items, setItems] = useState<PaymentMethodItem[]>(defaults);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draftItem, setDraftItem] = useState<PaymentMethodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/admin/payment-methods")
      .then((res) => {
        setItems(res.data?.items?.length ? res.data.items : defaults);
      })
      .catch(() => toast.error("Gagal memuat metode pembayaran"))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = useMemo(
    () => items.filter((item) => item.is_active).length,
    [items],
  );

  const getMethodValidationErrors = (item: PaymentMethodItem) => {
    const errors: string[] = [];

    if (!item.display_name.trim()) {
      errors.push("Nama tampil wajib diisi.");
    }

    if (!item.instructions.trim()) {
      errors.push("Instruksi pembayaran wajib diisi.");
    }

    if (item.code === "bank_transfer") {
      if (!item.metadata?.bank_name?.trim()) {
        errors.push("Nama bank wajib diisi.");
      }
      if (!item.metadata?.account_name?.trim()) {
        errors.push("Nama pemilik rekening wajib diisi.");
      }
      if (!item.metadata?.account_number?.trim()) {
        errors.push("Nomor rekening wajib diisi.");
      }
    }

    if (item.code === "qris_static" && !item.metadata?.qr_image_url?.trim()) {
      errors.push("URL gambar QRIS wajib diisi.");
    }

    return errors;
  };

  const startEditing = (item: PaymentMethodItem) => {
    setEditingCode(item.code);
    setDraftItem({
      ...item,
      metadata: { ...(item.metadata || {}) },
    });
  };

  const cancelEditing = () => {
    setEditingCode(null);
    setDraftItem(null);
  };

  const updateDraft = (patch: Partial<PaymentMethodItem>) => {
    setDraftItem((current) => {
      if (!current) {
        return current;
      }

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

  const saveDraft = async () => {
    if (!draftItem) {
      return;
    }

    const errors = draftItem.is_active ? getMethodValidationErrors(draftItem) : [];
    if (errors.length > 0) {
      toast.error("Lengkapi data metode pembayaran sebelum menyimpan.");
      return;
    }

    const nextItems = items.map((item) =>
      item.code === draftItem.code ? draftItem : item,
    );

    setSaving(true);
    try {
      await api.put("/admin/payment-methods", { items: nextItems });
      setItems(nextItems);
      setEditingCode(null);
      setDraftItem(null);
      toast.success("Metode pembayaran berhasil diperbarui");
    } catch (error) {
      const err = error as AxiosError<{ error?: string }>;
      toast.error(
        err.response?.data?.error || "Gagal menyimpan metode pembayaran",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleDraftMethod = (checked: boolean) => {
    if (!draftItem) {
      return;
    }

    if (!checked) {
      updateDraft({ is_active: false });
      return;
    }

    const errors = getMethodValidationErrors({
      ...draftItem,
      is_active: true,
    });

    if (errors.length > 0) {
      toast.error(`Lengkapi ${draftItem.display_name} sebelum diaktifkan.`);
      return;
    }

    updateDraft({ is_active: true });
  };

  const draftErrors =
    draftItem && draftItem.is_active ? getMethodValidationErrors(draftItem) : [];

  const renderCompactDetails = (item: PaymentMethodItem) => {
    if (item.code === "bank_transfer") {
      const bankSummary = [
        item.metadata?.bank_name,
        item.metadata?.account_number,
        item.metadata?.account_name,
      ]
        .filter(Boolean)
        .join(" • ");

      return bankSummary || "Rekening belum diatur.";
    }

    if (item.code === "qris_static") {
      return item.metadata?.qr_image_url
        ? "QRIS static sudah terpasang."
        : "QRIS belum diatur.";
    }

    return item.instructions;
  };

  const renderCompactMeta = (item: PaymentMethodItem) => {
    if (item.code === "bank_transfer") {
      return [
        { label: "Bank", value: item.metadata?.bank_name || "-" },
        { label: "Rekening", value: item.metadata?.account_number || "-" },
        { label: "A/N", value: item.metadata?.account_name || "-" },
      ];
    }

    if (item.code === "qris_static") {
      return [
        {
          label: "QRIS",
          value: item.metadata?.qr_image_url ? "Tersambung" : "Belum diatur",
        },
        {
          label: "Link",
          value: item.metadata?.qr_image_url ? "Siap dipakai customer" : "-",
        },
      ];
    }

    return [
      {
        label: "Tipe",
        value: labelMap[item.code] || item.category,
      },
    ];
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f0f17]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Payment Settings
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Metode pembayaran tenant
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Atur metode pembayaran yang muncul di customer dan POS untuk DP
              maupun pelunasan. Edit hanya saat diperlukan, sisanya tetap ringkas
              untuk dipantau.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
            <div className="text-slate-500">Metode aktif</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
              {activeCount}
            </div>
          </div>
        </div>
      </Card>

      {items.map((item) => {
        const isEditing = editingCode === item.code && draftItem;
        const currentItem = isEditing ? draftItem : item;
        const Icon =
          item.code === "qris_static"
            ? iconMap.qris_static
            : item.code === "cash"
              ? iconMap.cash
              : iconMap.default;

        return (
          <Card
            key={item.code}
            className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition dark:border-white/10 dark:bg-[#0f0f17]"
          >
            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                        {currentItem.display_name}
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          currentItem.is_active
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10"
                        }`}
                      >
                        {currentItem.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
                        {currentItem.verification_type === "auto"
                          ? "Auto verification"
                          : "Manual verification"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {currentItem.verification_type === "auto"
                        ? "Pembayaran diverifikasi otomatis oleh gateway."
                        : "Pembayaran menunggu verifikasi admin setelah customer melakukan pembayaran."}
                    </p>
                    {!isEditing ? (
                      <>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {renderCompactMeta(currentItem).map((meta) => (
                            <div
                              key={`${currentItem.code}-${meta.label}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/5"
                            >
                              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                                {meta.label}
                              </p>
                              <p className="mt-1 font-medium text-slate-700 dark:text-slate-200">
                                {meta.value}
                              </p>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                          {renderCompactDetails(currentItem)}
                        </p>
                      </>
                    ) : null}
                  </div>
                </div>

                {!isEditing ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => startEditing(item)}
                    disabled={loading || saving || editingCode !== null}
                    className="h-11 rounded-2xl px-4"
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">Aktif</span>
                    <Switch
                      checked={currentItem.is_active}
                      onCheckedChange={toggleDraftMethod}
                      disabled={saving}
                    />
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nama Tampil</Label>
                      <Input
                        value={currentItem.display_name}
                        onChange={(e) =>
                          updateDraft({ display_name: e.target.value })
                        }
                        disabled={saving}
                      />
                    </div>

                    {currentItem.code === "bank_transfer" ? (
                      <>
                        <div className="space-y-2">
                          <Label>Nama Bank</Label>
                          <Input
                            value={currentItem.metadata?.bank_name || ""}
                            onChange={(e) =>
                              updateDraft({
                                metadata: { bank_name: e.target.value },
                              })
                            }
                            disabled={saving}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nama Pemilik Rekening</Label>
                          <Input
                            value={currentItem.metadata?.account_name || ""}
                            onChange={(e) =>
                              updateDraft({
                                metadata: { account_name: e.target.value },
                              })
                            }
                            disabled={saving}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Nomor Rekening</Label>
                          <Input
                            value={currentItem.metadata?.account_number || ""}
                            onChange={(e) =>
                              updateDraft({
                                metadata: { account_number: e.target.value },
                              })
                            }
                            disabled={saving}
                          />
                        </div>
                      </>
                    ) : null}

                    {currentItem.code === "qris_static" ? (
                      <div className="space-y-2 md:col-span-2">
                        <Label>Upload Gambar QRIS</Label>
                        <SingleImageUpload
                          value={currentItem.metadata?.qr_image_url || ""}
                          onChange={(url) =>
                            updateDraft({
                              metadata: { qr_image_url: url },
                            })
                          }
                          endpoint="/admin/upload-media"
                          label=""
                          aspect="square"
                        />
                        <div className="space-y-2">
                          <Label>Atau isi URL Gambar QRIS</Label>
                          <Input
                            value={currentItem.metadata?.qr_image_url || ""}
                            onChange={(e) =>
                              updateDraft({
                                metadata: { qr_image_url: e.target.value },
                              })
                            }
                            disabled={saving}
                          />
                        </div>
                        {currentItem.metadata?.qr_image_url ? (
                          <a
                            href={currentItem.metadata.qr_image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-medium text-blue-600"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Preview link QRIS
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="space-y-2 md:col-span-2">
                      <Label>Instruksi Pembayaran</Label>
                      <Textarea
                        value={currentItem.instructions}
                        onChange={(e) =>
                          updateDraft({ instructions: e.target.value })
                        }
                        rows={4}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {draftErrors.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                      <p className="font-medium">
                        Lengkapi data berikut sebelum metode ini diaktifkan:
                      </p>
                      <ul className="mt-2 list-disc pl-5">
                        {draftErrors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                      <CheckCircle2 className="h-4 w-4" />
                      Konfigurasi metode ini sudah lengkap.
                    </div>
                  )}

                  <div className="mt-4 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEditing}
                      disabled={saving}
                      className="h-11 rounded-2xl px-5"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Batal
                    </Button>
                    <Button
                      type="button"
                      onClick={saveDraft}
                      disabled={saving}
                      className="h-11 rounded-2xl bg-blue-600 px-5 text-white hover:bg-blue-500"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
