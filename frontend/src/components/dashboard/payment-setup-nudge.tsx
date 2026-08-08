"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, QrCode, Zap } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import { cn } from "@/lib/utils";

type PaymentSetupStatus = {
  needs_setup: boolean;
  show_modal: boolean;
  intends_upfront: boolean;
  has_online: boolean;
  gateway_usable: boolean;
  manual_usable: boolean;
};

type PaymentMethodItem = {
  code: string;
  display_name: string;
  category: string;
  verification_type: string;
  provider: string;
  instructions: string;
  is_active: boolean;
  sort_order: number;
  metadata?: Record<string, unknown> | null;
};

const GATEWAY_PATH = "/admin/settings/payment-gateway";
const MANUAL_PATH = "/admin/settings/payment-methods";

type View = "choices" | "manual";
type ManualType = "bank_transfer" | "qris_static";

/**
 * PaymentSetupNudge memunculkan pengingat (modal) di dashboard bila tenant
 * berniat menagih di muka tapi belum punya jalur pembayaran online yang siap
 * (gateway BYO atau metode manual dengan detail lengkap). Self-gating: hanya
 * terbuka kalau backend bilang show_modal. Menutup tanpa aksi = snooze.
 */
export function PaymentSetupNudge() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("choices");
  const [snoozing, setSnoozing] = useState(false);
  // Cegah snooze ganda saat user memilih aksi navigasi.
  const actingRef = useRef(false);

  // Form manual
  const [manualType, setManualType] = useState<ManualType>("bank_transfer");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [saving, setSaving] = useState(false);
  // Cache metode saat ini (PUT harus mengirim seluruh daftar).
  const itemsRef = useRef<PaymentMethodItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/admin/payment-setup/status")
      .then((res) => {
        const data = res.data?.data as PaymentSetupStatus | undefined;
        if (!cancelled && data?.show_modal) setOpen(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const snooze = async () => {
    setSnoozing(true);
    try {
      await api.post("/admin/payment-setup/snooze");
    } catch {
      // Diamkan: snooze gagal bukan kritis; modal tetap tertutup sesi ini.
    } finally {
      setSnoozing(false);
      setOpen(false);
    }
  };

  const goTo = (path: string) => {
    actingRef.current = true;
    setOpen(false);
    router.push(path);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    if (actingRef.current) {
      setOpen(false);
      return;
    }
    void snooze();
  };

  const enterManual = async () => {
    setView("manual");
    if (itemsRef.current) return;
    try {
      const res = await api.get("/admin/payment-methods");
      itemsRef.current = (res.data?.items || []) as PaymentMethodItem[];
    } catch {
      itemsRef.current = null;
      toast.error("Gagal memuat metode pembayaran, coba dari halaman Settings.");
    }
  };

  const saveManual = async () => {
    const items = itemsRef.current;
    if (!items) {
      toast.error("Data metode belum siap, coba lagi.");
      return;
    }
    // Validasi detail sesuai jenis.
    let patchMeta: Record<string, unknown> = {};
    if (manualType === "bank_transfer") {
      if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
        toast.error("Nama bank, nama pemilik, dan nomor rekening wajib diisi.");
        return;
      }
      patchMeta = {
        bank_name: bankName.trim(),
        account_name: accountName.trim(),
        account_number: accountNumber.trim(),
      };
    } else {
      if (!qrUrl.trim()) {
        toast.error("Upload gambar QRIS dulu.");
        return;
      }
      patchMeta = { qr_image_url: qrUrl.trim() };
    }

    // Kirim seluruh daftar; target di-aktifkan + metadata diisi (merge).
    const hasTarget = items.some((item) => item.code === manualType);
    const nextItems = items.map((item) =>
      item.code === manualType
        ? {
            ...item,
            is_active: true,
            metadata: { ...(item.metadata || {}), ...patchMeta },
          }
        : item,
    );
    // Kalau metode target pernah dihapus, tambahkan kembali dengan default.
    if (!hasTarget) {
      nextItems.push({
        code: manualType,
        display_name: manualType === "bank_transfer" ? "Transfer Bank" : "QRIS Static",
        category: "manual",
        verification_type: "manual",
        provider: manualType,
        instructions:
          manualType === "bank_transfer"
            ? "Transfer ke rekening tenant lalu kirim bukti bayar untuk diverifikasi admin."
            : "Scan QRIS tenant lalu kirim bukti bayar untuk diverifikasi admin.",
        is_active: true,
        sort_order: nextItems.length + 1,
        metadata: patchMeta,
      });
    }

    setSaving(true);
    try {
      await api.put("/admin/payment-methods", { items: nextItems });
      toast.success("Metode pembayaran online aktif.");
      actingRef.current = true;
      setOpen(false);
    } catch {
      toast.error("Gagal menyimpan. Coba dari halaman Settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {view === "choices" ? (
          <>
            <DialogHeader>
              <DialogTitle>Aktifkan pembayaran online</DialogTitle>
              <DialogDescription>
                Kamu mengaktifkan pembayaran di muka (DP / lunas), tapi belum ada
                metode online yang siap. Sampai salah satu diisi, customer hanya
                bisa membayar di tempat.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2">
              <button
                type="button"
                onClick={() => goTo(GATEWAY_PATH)}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-blue-500/10"
              >
                <Zap className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                    Verifikasi otomatis (gateway sendiri)
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    Hubungkan akun Midtrans/Xendit milikmu. Pembayaran masuk &
                    terverifikasi otomatis; dana langsung ke rekeningmu.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => void enterManual()}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-blue-500/10"
              >
                <span className="mt-0.5 flex shrink-0 gap-1">
                  <CreditCard className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  <QrCode className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                    Transfer manual / QRIS statis
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    Isi rekening atau upload QRIS di sini. Customer transfer lalu
                    kirim bukti, kamu verifikasi manual. Tanpa daftar gateway.
                  </span>
                </span>
              </button>
            </div>

            <div className="flex justify-end">
              <Button
                variant="ghost"
                onClick={() => void snooze()}
                disabled={snoozing}
              >
                Nanti saja
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView("choices")}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label="Kembali"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Terima transfer manual
              </DialogTitle>
              <DialogDescription>
                Pilih salah satu. Metode akan langsung aktif setelah disimpan.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 py-1">
              {(
                [
                  { value: "bank_transfer", label: "Transfer Bank", icon: CreditCard },
                  { value: "qris_static", label: "QRIS Statis", icon: QrCode },
                ] as const
              ).map((opt) => {
                const active = manualType === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setManualType(opt.value)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                      active
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {manualType === "bank_transfer" ? (
              <div className="grid gap-3 py-1">
                <div className="grid gap-1.5">
                  <Label>Nama bank</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="MISAL: BCA / MANDIRI"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Nama pemilik rekening</Label>
                  <Input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Sesuai buku tabungan"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Nomor rekening</Label>
                  <Input
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1234567890"
                  />
                </div>
              </div>
            ) : (
              <div className="py-1">
                <SingleImageUpload
                  value={qrUrl}
                  onChange={setQrUrl}
                  label="Gambar QRIS"
                  emptyTitle="Upload QRIS statis"
                  emptyHint="PNG/JPG • maks 5MB"
                  aspect="square"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" onClick={() => setView("choices")}>
                Kembali
              </Button>
              <Button onClick={() => void saveManual()} disabled={saving}>
                {saving ? "Menyimpan…" : "Simpan & aktifkan"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
