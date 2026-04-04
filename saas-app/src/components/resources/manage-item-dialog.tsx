"use client";

import { useEffect, useState } from "react";
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
  Plus,
  Zap,
  PlusCircle,
  Gamepad2,
  Camera,
  Trophy,
  Briefcase,
  Monitor,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";

interface ManageItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: any;
  resourceId: string;
  resourceName: string;
  businessCategory: string;
  onSuccess: () => void;
}

export function ManageItemDialog({
  open,
  onOpenChange,
  editingItem,
  resourceId,
  resourceName,
  businessCategory,
  onSuccess,
}: ManageItemDialogProps) {
  // Form States
  const [name, setName] = useState("");
  const [displayPrice, setDisplayPrice] = useState("");
  const [rawPrice, setRawPrice] = useState(0);
  const [isDefault, setIsDefault] = useState(false);
  const [itemType, setItemType] = useState("main");
  const [priceUnit, setPriceUnit] = useState("hour");
  const [unitDuration, setUnitDuration] = useState<number>(60);
  const [loading, setLoading] = useState(false);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setRawPrice(editingItem.price);
      setDisplayPrice(formatIDR(editingItem.price));
      setIsDefault(editingItem.is_default);
      setItemType(
        editingItem.item_type === "console_option" ? "main" : "addon",
      );
      setPriceUnit(editingItem.price_unit || "hour");
      setUnitDuration(editingItem.unit_duration || 60);
    } else {
      resetForm();
    }
  }, [editingItem, open]);

  const resetForm = () => {
    setName("");
    setDisplayPrice("");
    setRawPrice(0);
    setIsDefault(false);
    setItemType("main");
    setPriceUnit("hour");
    setUnitDuration(60);
  };

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
      item_type: itemType === "main" ? "console_option" : "add_on",
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
    } catch (err) {
      toast.error("Gagal menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  // Content configuration based on business category
  const getContextConfig = () => {
    switch (businessCategory) {
      case "gaming_hub":
        return {
          title: "Setup Gaming",
          mainLabel: "Console / PC",
          mainIcon: <Monitor className="h-5 w-5" />,
          placeholder: "CONTOH: PS5 PRO / PC HIGH-END",
          inputLabel: "NAMA UNIT GADGET",
          addonPlaceholder: "CONTOH: STIK TAMBAHAN / HEADSET",
        };
      case "creative_space":
        return {
          title: "Paket Studio",
          mainLabel: "Tipe Ruangan",
          mainIcon: <Camera className="h-5 w-5" />,
          placeholder: "CONTOH: STUDIO GREEN SCREEN / PODCAST BOX",
          inputLabel: "NAMA TIPE RUANGAN",
          addonPlaceholder: "CONTOH: SEWA LENSA / LIGHTING EXTRA",
        };
      case "sport_center":
        return {
          title: "Opsi Lapangan",
          mainLabel: "Jenis Sewa",
          mainIcon: <Trophy className="h-5 w-5" />,
          placeholder: "CONTOH: LAPANGAN VINYL / RUMPUT SINTETIS",
          inputLabel: "NAMA JENIS FASILITAS",
          addonPlaceholder: "CONTOH: SEWA RAKET / SHUTTLECOCK",
        };
      case "social_space":
        return {
          title: "Konfigurasi Ruang",
          mainLabel: "Tipe Meja/Ruang",
          mainIcon: <Briefcase className="h-5 w-5" />,
          placeholder: "CONTOH: PRIVATE OFFICE / HOT DESK",
          inputLabel: "NAMA TIPE LAYANAN",
          addonPlaceholder: "CONTOH: PROYEKTOR / SNACK BOX",
        };
      default:
        return {
          title: "Inventory",
          mainLabel: "Unit Utama",
          mainIcon: <Zap className="h-5 w-5" />,
          placeholder: "NAMA ITEM UTAMA",
          inputLabel: "ITEM NAME",
          addonPlaceholder: "NAMA ITEM TAMBAHAN",
        };
    }
  };

  const config = getContextConfig();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2.5rem] p-8 sm:max-w-[480px] border-none shadow-2xl overflow-hidden bg-background">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter leading-none pr-4">
            MANAGE <span className="text-blue-600">{config.title}</span>
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-relaxed">
            Konfigurasi tarif dan opsi untuk unit{" "}
            <span className="text-slate-900 dark:text-white">
              {resourceName}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6 pt-4">
          {/* NAMA ITEM */}
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
              {itemType === "main"
                ? config.inputLabel
                : "NAMA ADD-ON / LAYANAN"}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder={
                itemType === "main"
                  ? config.placeholder
                  : config.addonPlaceholder
              }
              className="h-14 rounded-2xl font-bold bg-slate-50 dark:bg-slate-900 border-none px-5 text-sm focus-visible:ring-blue-600 transition-all"
              required
            />
          </div>

          {/* TIPE ITEM */}
          <div className="space-y-3">
            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
              TENTUKAN KATEGORI ITEM
            </Label>
            <RadioGroup
              value={itemType}
              onValueChange={(v) => {
                setItemType(v);
                setPriceUnit(v === "main" ? "hour" : "pcs");
                setUnitDuration(v === "main" ? 60 : 0);
              }}
              className="grid grid-cols-2 gap-3"
            >
              <div className="relative">
                <RadioGroupItem
                  value="main"
                  id="main"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="main"
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 hover:bg-slate-100 dark:hover:bg-slate-800 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/20 transition-all cursor-pointer h-24"
                >
                  <div
                    className={cn(
                      "mb-2",
                      itemType === "main" ? "text-blue-600" : "text-slate-300",
                    )}
                  >
                    {config.mainIcon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-center leading-none pr-1">
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
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 hover:bg-slate-100 dark:hover:bg-slate-800 peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-50 dark:peer-data-[state=checked]:bg-orange-900/20 transition-all cursor-pointer text-center h-24"
                >
                  <PlusCircle
                    className={cn(
                      "mb-2 h-5 w-5",
                      itemType === "addon"
                        ? "text-orange-500"
                        : "text-slate-300",
                    )}
                  />
                  <span className="text-[10px] font-black uppercase tracking-tight leading-none pr-1">
                    Add-on / Alat
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* HARGA & SATUAN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
                HARGA (RP)
              </Label>
              <Input
                value={displayPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0"
                className="h-12 rounded-xl font-black bg-slate-50 dark:bg-slate-900 border-none shadow-inner text-base"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
                SISTEM BILLING
              </Label>
              <Select
                value={priceUnit}
                onValueChange={(v) => {
                  setPriceUnit(v);
                  if (v === "hour") setUnitDuration(60);
                  if (v === "day") setUnitDuration(1440);
                }}
              >
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold text-xs uppercase italic">
                  <SelectValue placeholder="Satuan" />
                </SelectTrigger>
                <SelectContent className="rounded-xl font-bold uppercase">
                  {itemType === "main" ? (
                    <>
                      <SelectItem value="hour">Per Jam</SelectItem>
                      <SelectItem value="session">Per Sesi</SelectItem>
                      <SelectItem value="day">Per Hari</SelectItem>
                    </>
                  ) : (
                    <SelectItem value="pcs">Per Pcs / Unit</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* DURASI (Dinamis muncul jika Per Sesi) */}
          {itemType === "main" && priceUnit === "session" && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-blue-600 px-1 italic">
                DURASI SEWA PER SESI (MENIT)
              </Label>
              <Input
                type="number"
                value={unitDuration}
                onChange={(e) => setUnitDuration(Number(e.target.value))}
                className="h-12 rounded-xl font-black bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900 text-base"
                placeholder="Misal: 120"
                required
              />
            </div>
          )}

          {/* DEFAULT TOGGLE */}
          {itemType === "main" && (
            <div className="flex items-center space-x-3 p-4 rounded-2xl border-2 border-dashed bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900 transition-all">
              <input
                type="checkbox"
                id="def"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
              />
              <Label
                htmlFor="def"
                className="text-[10px] font-black uppercase italic text-slate-700 dark:text-slate-200 cursor-pointer leading-none pr-1"
              >
                JADIKAN PILIHAN UTAMA (DEFAULT)
              </Label>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-16 rounded-[2rem] bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 font-black uppercase tracking-widest text-[11px] shadow-xl text-white transition-all active:scale-95 border-b-8 border-slate-800 dark:border-blue-800"
          >
            {loading
              ? "SAVING..."
              : editingItem
                ? "UPDATE CONFIGURATION"
                : "ADD TO INVENTORY"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
