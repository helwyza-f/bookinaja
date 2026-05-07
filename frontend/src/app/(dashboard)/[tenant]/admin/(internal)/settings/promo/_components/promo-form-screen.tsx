"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Percent,
  Save,
  Tag,
  TicketPercent,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PromoItem = {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_behavior?: "locked" | "floating";
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_discount_amount?: number | null;
  min_booking_amount?: number | null;
  usage_limit_total?: number | null;
  usage_limit_per_customer?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  valid_weekdays?: number[];
  time_start?: string | null;
  time_end?: string | null;
  resource_ids?: string[];
  is_active: boolean;
};

type ResourceItem = {
  id: string;
  name: string;
};

type PromoRedemption = {
  id: string;
  customer_name: string;
  resource_name: string;
  discount_amount: number;
  final_amount: number;
  booking_status: string;
  redeemed_at: string;
};

type PromoForm = {
  code: string;
  name: string;
  description: string;
  discount_behavior: "locked" | "floating";
  discount_type: "percentage" | "fixed";
  discount_value: string;
  max_discount_amount: string;
  min_booking_amount: string;
  usage_limit_total: string;
  usage_limit_per_customer: string;
  starts_at: string;
  ends_at: string;
  valid_weekdays: number[];
  time_start: string;
  time_end: string;
  resource_ids: string[];
  is_active: boolean;
};

const DAY_OPTIONS = [
  { value: 1, label: "Sen" },
  { value: 2, label: "Sel" },
  { value: 3, label: "Rab" },
  { value: 4, label: "Kam" },
  { value: 5, label: "Jum" },
  { value: 6, label: "Sab" },
  { value: 7, label: "Min" },
];

const EMPTY_FORM: PromoForm = {
  code: "",
  name: "",
  description: "",
  discount_behavior: "locked",
  discount_type: "percentage",
  discount_value: "",
  max_discount_amount: "",
  min_booking_amount: "",
  usage_limit_total: "",
  usage_limit_per_customer: "",
  starts_at: "",
  ends_at: "",
  valid_weekdays: [],
  time_start: "",
  time_end: "",
  resource_ids: [],
  is_active: true,
};

const formatIDR = (value?: number | null) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;

function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toPayloadDateTime(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toForm(item?: PromoItem | null): PromoForm {
  if (!item) return EMPTY_FORM;
  return {
    code: item.code || "",
    name: item.name || "",
    description: item.description || "",
    discount_behavior: item.discount_behavior || "locked",
    discount_type: item.discount_type || "percentage",
    discount_value: String(item.discount_value || ""),
    max_discount_amount: item.max_discount_amount ? String(item.max_discount_amount) : "",
    min_booking_amount: item.min_booking_amount ? String(item.min_booking_amount) : "",
    usage_limit_total: item.usage_limit_total ? String(item.usage_limit_total) : "",
    usage_limit_per_customer: item.usage_limit_per_customer
      ? String(item.usage_limit_per_customer)
      : "",
    starts_at: toLocalDateTime(item.starts_at),
    ends_at: toLocalDateTime(item.ends_at),
    valid_weekdays: item.valid_weekdays || [],
    time_start: item.time_start || "",
    time_end: item.time_end || "",
    resource_ids: item.resource_ids || [],
    is_active: item.is_active,
  };
}

export function PromoFormScreen({
  promoId,
}: {
  promoId?: string;
}) {
  const router = useRouter();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [redemptions, setRedemptions] = useState<PromoRedemption[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const requests = [api.get("/resources-all")];
        if (promoId) {
          requests.push(api.get(`/admin/settings/promos/${promoId}`));
          requests.push(api.get(`/admin/settings/promos/${promoId}/redemptions`));
        }
        const responses = await Promise.all(requests);
        const resourceRes = responses[0];
        const resourceItems = Array.isArray(resourceRes.data?.resources)
          ? resourceRes.data.resources
          : Array.isArray(resourceRes.data)
            ? resourceRes.data
            : [];
        setResources(resourceItems);

        if (promoId) {
          const detailRes = responses[1] as { data: PromoItem };
          const redemptionRes = responses[2] as { data?: { items?: PromoRedemption[] } };
          setForm(toForm(detailRes.data));
          setRedemptions(redemptionRes.data?.items || []);
          setShowAdvanced(
            Boolean(
              detailRes.data.valid_weekdays?.length ||
                detailRes.data.time_start ||
                detailRes.data.time_end ||
                detailRes.data.resource_ids?.length ||
                detailRes.data.min_booking_amount ||
                detailRes.data.usage_limit_total ||
                detailRes.data.usage_limit_per_customer,
            ),
          );
        }
      } catch {
        toast.error("Gagal memuat form promo");
        router.push("/admin/settings/promo");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [promoId, router]);

  const advancedSummary = useMemo(() => {
    const chips: string[] = [];
    chips.push(form.valid_weekdays.length ? `${form.valid_weekdays.length} hari dipilih` : "Semua hari");
    chips.push(form.time_start && form.time_end ? `${form.time_start} - ${form.time_end}` : "Sepanjang hari");
    chips.push(form.resource_ids.length ? `${form.resource_ids.length} resource dipilih` : "Semua resource");
    if (form.min_booking_amount) chips.push(`Min ${formatIDR(Number(form.min_booking_amount))}`);
    if (form.usage_limit_total) chips.push(`Kuota total ${form.usage_limit_total}`);
    if (form.usage_limit_per_customer) chips.push(`Per customer ${form.usage_limit_per_customer}`);
    return chips;
  }, [form]);

  const requiredReady =
    form.code.trim() !== "" &&
    form.name.trim() !== "" &&
    form.discount_value.trim() !== "";

  const submit = async () => {
    if (!requiredReady) {
      toast.error("Lengkapi semua field wajib dulu.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        discount_behavior: form.discount_behavior,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value || 0),
        max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
        min_booking_amount: form.min_booking_amount ? Number(form.min_booking_amount) : null,
        usage_limit_total: form.usage_limit_total ? Number(form.usage_limit_total) : null,
        usage_limit_per_customer: form.usage_limit_per_customer
          ? Number(form.usage_limit_per_customer)
          : null,
        starts_at: toPayloadDateTime(form.starts_at),
        ends_at: toPayloadDateTime(form.ends_at),
        valid_weekdays: form.valid_weekdays,
        time_start: form.time_start || null,
        time_end: form.time_end || null,
        resource_ids: form.resource_ids,
        is_active: form.is_active,
      };

      if (promoId) {
        await api.put(`/admin/settings/promos/${promoId}`, payload);
      } else {
        await api.post("/admin/settings/promos", payload);
      }

      toast.success(promoId ? "Promo diperbarui." : "Promo dibuat.");
      router.push("/admin/settings/promo");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal menyimpan promo");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Card className="rounded-[2rem] p-8">Memuat form promo...</Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-20 sm:space-y-6 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.push("/admin/settings/promo")} className="rounded-2xl px-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
        <Badge variant="outline">{promoId ? "Edit promo" : "Promo baru"}</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0b0b]">
          <div className="border-b border-slate-100 p-5 dark:border-white/5">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
              <TicketPercent className="h-3.5 w-3.5" />
              Promo Customer
            </div>
            <h1 className="mt-3 text-2xl font-[950] tracking-tight text-slate-950 dark:text-white">
              {promoId ? "Edit voucher booking" : "Buat voucher booking"}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Isi yang wajib dulu. Sisanya opsional dan hanya dipakai kalau kamu perlu rule lebih spesifik.
            </p>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kode promo" required hint="Contoh: WEEKDAY10">
                <Input
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="WEEKDAY10"
                />
              </Field>
              <Field label="Status" optional hint="Boleh langsung aktif atau simpan dulu sebagai nonaktif.">
                <div className="flex h-10 items-center justify-between rounded-xl border border-slate-200 px-3 dark:border-white/10">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {form.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </Field>
            </div>

            <Field label="Nama promo" required hint="Nama internal agar kamu mudah mengenalinya.">
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Promo weekday siang"
              />
            </Field>

            <Field label="Deskripsi" optional hint="Catatan singkat buat tim, tidak wajib.">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Dipakai untuk jam sepi Senin - Jumat."
                className="min-h-[88px]"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Perilaku diskon" optional hint="Locked aman untuk booking awal. Floating membuat diskon ikut naik saat total booking bertambah, tanpa mengubah DP yang sudah ditetapkan.">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "locked", label: "Locked" },
                    { key: "floating", label: "Floating" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, discount_behavior: option.key as PromoForm["discount_behavior"] }))}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
                        form.discount_behavior === option.key
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                          : "border-slate-200 dark:border-white/10",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Tipe diskon" required hint="Pilih potongan persen atau nominal rupiah.">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "percentage", label: "Persen", icon: Percent },
                    { key: "fixed", label: "Nominal", icon: TicketPercent },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, discount_type: option.key as PromoForm["discount_type"] }))}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
                        form.discount_type === option.key
                          ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200"
                          : "border-slate-200 dark:border-white/10",
                      )}
                    >
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field
                label={form.discount_type === "percentage" ? "Nilai diskon (%)" : "Nilai diskon (Rp)"}
                required
                hint={form.discount_type === "percentage" ? "Contoh: 10 berarti diskon 10%." : "Contoh: 20000 berarti potongan Rp20.000."}
              >
                <Input
                  type="number"
                  min="0"
                  value={form.discount_value}
                  onChange={(e) => setForm((prev) => ({ ...prev, discount_value: e.target.value }))}
                  placeholder={form.discount_type === "percentage" ? "10" : "20000"}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Maksimal diskon" optional hint="Pakai kalau diskon persen tidak boleh terlalu besar.">
                <Input
                  type="number"
                  min="0"
                  value={form.max_discount_amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, max_discount_amount: e.target.value }))}
                  placeholder="Kosongkan kalau tidak perlu"
                />
              </Field>
              <Field label="Minimum booking" optional hint="Promo baru berlaku kalau total booking minimal nilai ini.">
                <Input
                  type="number"
                  min="0"
                  value={form.min_booking_amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, min_booking_amount: e.target.value }))}
                  placeholder="Kosongkan kalau tidak perlu"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mulai berlaku" optional hint="Kalau kosong, promo langsung bisa dipakai setelah aktif.">
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, starts_at: e.target.value }))}
                />
              </Field>
              <Field label="Berakhir" optional hint="Kalau kosong, promo tidak punya tanggal akhir.">
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, ends_at: e.target.value }))}
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              className="flex w-full items-center justify-between rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-left dark:border-white/10"
            >
              <div>
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  Aturan tambahan
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Hari, jam, resource, dan kuota. Semua ini opsional.
                </div>
              </div>
              <Badge variant="outline">{showAdvanced ? "Terbuka" : "Opsional"}</Badge>
            </button>

            {!showAdvanced ? (
              <div className="flex flex-wrap gap-2">
                {advancedSummary.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}

            {showAdvanced ? (
              <div className="space-y-5 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Batas penggunaan total" optional hint="Misalnya 100 berarti promo hanya bisa dipakai 100 kali.">
                    <Input
                      type="number"
                      min="0"
                      value={form.usage_limit_total}
                      onChange={(e) => setForm((prev) => ({ ...prev, usage_limit_total: e.target.value }))}
                      placeholder="Kosongkan kalau tidak dibatasi"
                    />
                  </Field>
                  <Field label="Batas per customer" optional hint="Misalnya 1 berarti satu customer hanya boleh pakai sekali.">
                    <Input
                      type="number"
                      min="0"
                      value={form.usage_limit_per_customer}
                      onChange={(e) => setForm((prev) => ({ ...prev, usage_limit_per_customer: e.target.value }))}
                      placeholder="Kosongkan kalau tidak dibatasi"
                    />
                  </Field>
                </div>

                <Field label="Hari berlaku" optional hint="Kalau tidak dipilih, promo berlaku setiap hari.">
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((day) => {
                      const active = form.valid_weekdays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              valid_weekdays: active
                                ? prev.valid_weekdays.filter((item) => item !== day.value)
                                : [...prev.valid_weekdays, day.value].sort(),
                            }))
                          }
                          className={cn(
                            "rounded-full border px-3 py-2 text-xs font-bold transition-all",
                            active
                              ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200"
                              : "border-slate-200 dark:border-white/10",
                          )}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Jam mulai" optional hint="Isi bersama jam selesai kalau promo hanya berlaku di jam tertentu.">
                    <div className="relative">
                      <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="time"
                        step="1"
                        value={form.time_start}
                        onChange={(e) => setForm((prev) => ({ ...prev, time_start: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </Field>
                  <Field label="Jam selesai" optional hint="Kalau salah satu diisi, isi dua-duanya.">
                    <div className="relative">
                      <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="time"
                        step="1"
                        value={form.time_end}
                        onChange={(e) => setForm((prev) => ({ ...prev, time_end: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </Field>
                </div>

                <Field label="Resource berlaku" optional hint="Kalau tidak dipilih, promo berlaku di semua resource.">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {resources.map((resource) => {
                      const active = form.resource_ids.includes(resource.id);
                      return (
                        <button
                          key={resource.id}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              resource_ids: active
                                ? prev.resource_ids.filter((item) => item !== resource.id)
                                : [...prev.resource_ids, resource.id],
                            }))
                          }
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all",
                            active
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                              : "border-slate-200 dark:border-white/10",
                          )}
                        >
                          {resource.name}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            ) : null}

            <div className="flex gap-3">
              <Button
                onClick={() => void submit()}
                disabled={saving}
                className="flex-1 rounded-2xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Promo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/settings/promo")}
                className="rounded-2xl"
              >
                Batal
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0b0b]">
            <div className="border-b border-slate-100 p-5 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    Checklist
                  </div>
                  <div className="text-xl font-[950] text-slate-950 dark:text-white">
                    Mana yang wajib?
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <ChecklistItem ready={form.code.trim() !== ""} label="Kode promo terisi" />
              <ChecklistItem ready={form.name.trim() !== ""} label="Nama promo terisi" />
              <ChecklistItem ready={form.discount_value.trim() !== ""} label="Nilai diskon terisi" />
              <ChecklistItem ready className="opacity-80" label="Field lain aman dibiarkan kosong kalau belum perlu" />
            </div>
          </Card>

          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0b0b]">
            <div className="border-b border-slate-100 p-5 dark:border-white/5">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Usage
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                Histori pemakaian promo
              </div>
            </div>
            <div className="space-y-3 p-5">
              {!promoId ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  Simpan promo dulu. Setelah dipakai customer, histori akan muncul di sini.
                </div>
              ) : redemptions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  Belum ada booking yang memakai promo ini.
                </div>
              ) : (
                redemptions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-950 dark:text-white">
                          {item.customer_name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.resource_name} · {new Date(item.redeemed_at).toLocaleString("id-ID")}
                        </div>
                      </div>
                      <Badge className="bg-emerald-600 text-white">
                        -{formatIDR(item.discount_amount)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        Total {formatIDR(item.final_amount)}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {item.booking_status || "booking"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  required,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {label}
        </Label>
        {required ? <Badge className="bg-red-500 text-white">Wajib</Badge> : null}
        {optional ? <Badge variant="outline">Opsional</Badge> : null}
      </div>
      {children}
      {hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

function ChecklistItem({
  ready,
  label,
  className,
}: {
  ready: boolean;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-white/10", className)}>
      <CheckCircle2 className={cn("h-4 w-4", ready ? "text-emerald-500" : "text-slate-300 dark:text-slate-600")} />
      <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  );
}
