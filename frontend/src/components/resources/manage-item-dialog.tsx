"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  PlusCircle,
  Camera,
  Trophy,
  Briefcase,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";

const TIME_UNIT_OPTIONS = [
  { value: "hour", label: "Per Jam", minutes: 60 },
  { value: "session", label: "Per Sesi", minutes: 60 },
  { value: "day", label: "Per Hari", minutes: 1440 },
  { value: "week", label: "Per Minggu", minutes: 10080 },
  { value: "month", label: "Per Bulan", minutes: 43200 },
  { value: "year", label: "Per Tahun", minutes: 525600 },
];

const getUnitMinutes = (unit: string) =>
  TIME_UNIT_OPTIONS.find((option) => option.value === unit)?.minutes || 60;

interface ManageItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ResourceItemConfig | null;
  resourceId: string;
  resourceName: string;
  businessCategory: string;
  operatingMode?: string;
  onSuccess: () => void;
}

export type ResourceItemConfig = {
  id: string;
  name: string;
  price: number;
  price_unit?: string;
  unit_duration?: number;
  is_default?: boolean;
  item_type?: string;
};

export function ManageItemDialog({
  open,
  onOpenChange,
  editingItem,
  resourceId,
  resourceName,
  businessCategory,
  operatingMode = "timed",
  onSuccess,
}: ManageItemDialogProps) {
  // Form States
  const [name, setName] = useState("");
  const [displayPrice, setDisplayPrice] = useState("");
  const [rawPrice, setRawPrice] = useState(0);
  const [isDefault, setIsDefault] = useState(false);
  const [itemType, setItemType] = useState("main"); // "main" atau "addon"
  const [priceUnit, setPriceUnit] = useState("hour");
  const [unitDuration, setUnitDuration] = useState<number>(60);
  const [loading, setLoading] = useState(false);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);
  const resetForm = useCallback(() => {
    setName("");
    setDisplayPrice("");
    setRawPrice(0);
    setIsDefault(false);
    setItemType("main");
    setPriceUnit(operatingMode === "direct_sale" ? "pcs" : "hour");
    setUnitDuration(operatingMode === "direct_sale" ? 0 : 60);
  }, [operatingMode]);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setRawPrice(editingItem.price);
      setDisplayPrice(formatIDR(editingItem.price));
      setIsDefault(Boolean(editingItem.is_default));
      // Mapping dari backend type ke UI state
      setItemType(editingItem.item_type === "main_option" ? "main" : "add_on");
      const defaultUnit = operatingMode === "direct_sale" ? "pcs" : "hour";
      setPriceUnit(editingItem.price_unit || defaultUnit);
      setUnitDuration(editingItem.unit_duration || (defaultUnit === "pcs" ? 0 : 60));
    } else {
      resetForm();
    }
  }, [editingItem, open, operatingMode, resetForm]);

  const handlePriceChange = (val: string) => {
    const numeric = parseInt(val.replace(/\D/g, "")) || 0;
    setRawPrice(numeric);
    setDisplayPrice(formatIDR(numeric));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: name.toUpperCase(),
      price: rawPrice,
      price_unit: priceUnit,
      unit_duration: itemType === "main" ? Number(unitDuration) : 0,
      is_default: itemType === "addon" ? false : isDefault,
      // Universal mapping: console_option diganti menjadi main_option
      item_type: itemType === "main" ? "main_option" : "add_on",
    };

    try {
      if (editingItem) {
        await api.put(`/resources-all/items/${editingItem.id}`, payload);
        toast.success("Konfigurasi berhasil diperbarui");
      } else {
        await api.post(`/resources-all/${resourceId}/items`, payload);
        toast.success("Item baru berhasil ditambahkan");
      }
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Gagal menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  const getContextConfig = () => {
    switch (businessCategory) {
      case "gaming_hub":
        return {
          title: "Setup Gaming",
          mainLabel: "Unit Utama",
          mainIcon: <Monitor className="h-5 w-5" />,
          placeholder: "CONTOH: PC HIGH-END / PS5 PRO",
          inputLabel: "NAMA UNIT UTAMA",
          addonPlaceholder: "CONTOH: STIK TAMBAHAN / HEADSET",
        };
      case "creative_space":
        return {
          title: "Paket Studio",
          mainLabel: "Tipe Paket",
          mainIcon: <Camera className="h-5 w-5" />,
          placeholder: "CONTOH: PAKET PODCAST / STUDIO GREEN SCREEN",
          inputLabel: "NAMA TIPE PAKET",
          addonPlaceholder: "CONTOH: SEWA LENSA / LIGHTING EXTRA",
        };
      case "sport_center":
        return {
          title: "Opsi Fasilitas",
          mainLabel: "Jenis Sewa",
          mainIcon: <Trophy className="h-5 w-5" />,
          placeholder: "CONTOH: LAPANGAN VINYL / SINTETIS",
          inputLabel: "NAMA JENIS SEWA",
          addonPlaceholder: "CONTOH: SEWA RAKET / SHUTTLECOCK",
        };
      case "social_space":
        return {
          title: "Opsi Ruang",
          mainLabel: "Konfigurasi",
          mainIcon: <Briefcase className="h-5 w-5" />,
          placeholder: "CONTOH: MEJA PRIVATE / MEETING ROOM",
          inputLabel: "NAMA KONFIGURASI RUANG",
          addonPlaceholder: "CONTOH: PROYEKTOR / SNACK BOX",
        };
      default:
        return {
          title: "Inventory",
          mainLabel: "Unit Utama",
          mainIcon: <Zap className="h-5 w-5" />,
          placeholder: "NAMA ITEM UTAMA",
          inputLabel: "NAMA ITEM UTAMA",
          addonPlaceholder: "NAMA LAYANAN TAMBAHAN",
        };
    }
  };

  const config = getContextConfig();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[94vw] flex-col overflow-hidden rounded-[2rem] border-none bg-background p-4 shadow-2xl sm:w-auto sm:max-w-[500px] sm:p-6">
        <DialogHeader className="shrink-0 space-y-2 text-left">
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter leading-none">
            MANAGE <span className="text-blue-600">{config.title}</span>
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-relaxed">
            Konfigurasi tarif utama dan layanan tambahan untuk{" "}
            <span className="text-slate-900 dark:text-white font-black px-1 underline decoration-blue-600">
              {resourceName}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="min-h-0 space-y-5 overflow-y-auto pt-4 overscroll-contain">
          {/* TIPE ITEM (DIATAS AGAR KONTEKS JELAS) */}
          <div className="space-y-3">
            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
              KATEGORI PILIHAN
            </Label>
            <RadioGroup
              value={itemType}
              onValueChange={(v) => {
                setItemType(v);
                const mainUnit = operatingMode === "direct_sale" ? "pcs" : "hour";
                setPriceUnit(v === "main" ? mainUnit : "pcs");
                setUnitDuration(v === "main" ? (mainUnit === "pcs" ? 0 : 60) : 0);
              }}
              className="grid grid-cols-2 gap-2.5"
            >
              <div className="relative">
                <RadioGroupItem
                  value="main"
                  id="main"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="main"
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/20 transition-all cursor-pointer h-20"
                >
                  <div
                    className={cn(
                      "mb-2",
                      itemType === "main" ? "text-blue-600" : "text-slate-300",
                    )}
                  >
                    {config.mainIcon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-center leading-none">
                    {config.mainLabel}
                  </span>
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem
                  value="addon"
                  id="addon"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="addon"
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-50 dark:peer-data-[state=checked]:bg-orange-900/20 transition-all cursor-pointer text-center h-20"
                >
                  <PlusCircle
                    className={cn(
                      "mb-2 h-5 w-5",
                      itemType === "addon"
                        ? "text-orange-500"
                        : "text-slate-300",
                    )}
                  />
                  <span className="text-[10px] font-black uppercase tracking-tight leading-none">
                    Layanan / Alat
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* NAMA ITEM */}
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
              {itemType === "main"
                ? config.inputLabel
                : "NAMA LAYANAN TAMBAHAN"}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder={
                itemType === "main"
                  ? config.placeholder
                  : config.addonPlaceholder
              }
              className="h-12 rounded-2xl font-bold bg-slate-50 dark:bg-slate-900 border-none px-4 text-sm focus-visible:ring-blue-600 transition-all"
              required
            />
          </div>

          {/* HARGA & SATUAN */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
                HARGA (RP)
              </Label>
              <Input
                value={displayPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0"
                className="h-11 rounded-xl font-black bg-slate-50 dark:bg-slate-900 border-none shadow-inner text-base"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
                METODE BILLING
              </Label>
              <Select
                value={priceUnit}
                onValueChange={(v) => {
                  setPriceUnit(v);
                  if (v !== "session") setUnitDuration(getUnitMinutes(v));
                }}
              >
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold text-[10px] uppercase italic">
                  <SelectValue placeholder="Satuan" />
                </SelectTrigger>
                <SelectContent className="rounded-xl font-bold uppercase">
                  {itemType === "main" ? (
                    <>
                      {operatingMode === "direct_sale" ? (
                        <SelectItem value="pcs">Per Pcs / Unit</SelectItem>
                      ) : (
                        <>
                          {TIME_UNIT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <SelectItem value="pcs">Per Pcs / Unit</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* DURASI SESI (Dinamis) */}
          {itemType === "main" && operatingMode !== "direct_sale" && priceUnit === "session" && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-blue-600 px-1 italic">
                DURASI PER SESI (MENIT)
              </Label>
              <Input
                type="number"
                value={unitDuration}
                onChange={(e) => setUnitDuration(Number(e.target.value))}
                className="h-11 rounded-xl font-black bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900 text-base"
                required
              />
            </div>
          )}

          {itemType === "main" && operatingMode !== "direct_sale" && priceUnit !== "session" && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5">
              Durasi otomatis: {unitDuration.toLocaleString("id-ID")} menit per{" "}
              {TIME_UNIT_OPTIONS.find((option) => option.value === priceUnit)
                ?.label.toLowerCase()
                .replace("per ", "") || "unit"}
              .
            </div>
          )}

          {itemType === "main" && operatingMode === "direct_sale" && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5">
              Resource direct sale tidak memakai durasi sesi. Item utama akan
              langsung masuk katalog POS sebagai item jual.
            </div>
          )}

          {/* DEFAULT CHECKBOX */}
          {itemType === "main" && (
            <div className="flex items-center space-x-3 p-3.5 rounded-2xl border-2 border-dashed bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900 transition-all">
              <input
                type="checkbox"
                id="def"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
              />
              <Label
                htmlFor="def"
                className="text-[10px] font-black uppercase italic text-slate-700 dark:text-slate-200 cursor-pointer leading-none"
              >
                Jadikan Paket Default
              </Label>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-[2rem] bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 font-black uppercase tracking-[0.2em] text-[9px] shadow-xl text-white transition-all active:scale-95 border-b-8 border-slate-800 dark:border-blue-800"
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : editingItem ? (
              "SIMPAN PERUBAHAN"
            ) : (
              "TAMBAHKAN KE UNIT"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Komponen Loader simpel untuk button
function Loader2({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}
