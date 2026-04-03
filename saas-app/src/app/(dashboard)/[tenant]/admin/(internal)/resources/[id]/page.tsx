"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  Layers,
  Edit3,
  Star,
  PlusCircle,
  MapPin,
  Clock,
  Package,
  Gamepad2,
  Video,
  Trophy,
  Camera,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [resource, setResource] = useState<any>(null);
  const [businessCategory, setBusinessCategory] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form States
  const [name, setName] = useState("");
  const [displayPrice, setDisplayPrice] = useState("");
  const [rawPrice, setRawPrice] = useState(0);
  const [isDefault, setIsDefault] = useState(false);
  const [itemType, setItemType] = useState("main");
  const [priceUnit, setPriceUnit] = useState("hour");

  const fetchData = async () => {
    try {
      const resItems = await api.get(`/resources-all/${params.id}/items`);
      setItems(resItems.data || []);

      const resDetail = await api.get(`/resources-all`);
      const category = resDetail.data?.business_category || "";
      const currentRes =
        resDetail.data?.resources?.find((r: any) => r.id === params.id) ||
        resDetail.data?.find((r: any) => r.id === params.id);

      setBusinessCategory(category);
      setResource(currentRes);
    } catch (err) {
      toast.error("Gagal sinkron data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  const handlePriceChange = (val: string) => {
    const numeric = parseInt(val.replace(/\D/g, "")) || 0;
    setRawPrice(numeric);
    setDisplayPrice(formatIDR(numeric));
  };

  const resetForm = () => {
    setEditingItem(null);
    setName("");
    setDisplayPrice("");
    setRawPrice(0);
    setIsDefault(false);
    setItemType("main");
    setPriceUnit("hour");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: name.toUpperCase(),
      price_per_hour: rawPrice,
      price_unit: priceUnit,
      is_default: itemType === "addon" ? false : isDefault,
      item_type: itemType === "main" ? "console_option" : "add_on",
    };

    try {
      if (editingItem) {
        await api.put(`/resources-all/items/${editingItem.id}`, payload);
        toast.success("DATA DIPERBARUI!");
      } else {
        await api.post(`/resources-all/${params.id}/items`, payload);
        toast.success("BARANG DITAMBAHKAN!");
      }
      setOpen(false);
      fetchData();
      resetForm();
    } catch (err) {
      toast.error("GAGAL SIMPAN");
    }
  };

  const handleSetDefault = async (item: any) => {
    try {
      await api.put(`/resources-all/items/${item.id}`, {
        ...item,
        is_default: true,
      });
      toast.success("SET SEBAGAI DEFAULT");
      fetchData();
    } catch (err) {
      toast.error("GAGAL UPDATE");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus barang secara permanen?")) return;
    try {
      await api.delete(`/resources-all/items/${id}`);
      toast.success("DIHAPUS");
      fetchData();
    } catch (err) {
      toast.error("GAGAL");
    }
  };

  const mainItems = items.filter(
    (i) => i.item_type === "console_option" || i.item_type === "main",
  );
  const addonItems = items.filter(
    (i) => i.item_type === "add_on" || i.item_type === "addon",
  );

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case "hour":
        return "/ JAM";
      case "session":
        return "/ SESI";
      case "day":
        return "/ HARI";
      case "pcs":
        return "/ PCS";
      default:
        return "/ UNIT";
    }
  };

  const getContextConfig = () => {
    switch (businessCategory) {
      case "gaming_hub":
        return {
          mainLabel: "Console / PC",
          mainIcon: <Gamepad2 className="h-5 w-5" />,
          placeholder: "CONTOH: PS5 SLIM / PC RTX 4090",
          inputLabel: "NAMA CONSOLE / UNIT",
        };
      case "creative_space":
        return {
          mainLabel: "Studio / Ruang",
          mainIcon: <Camera className="h-5 w-5" />,
          placeholder: "CONTOH: STUDIO A / GREEN SCREEN ROOM",
          inputLabel: "NAMA RUANGAN / TIPE",
        };
      case "sport_center":
        return {
          mainLabel: "Tipe Lapangan",
          mainIcon: <Trophy className="h-5 w-5" />,
          placeholder: "CONTOH: LAPANGAN FUTSAL / COURT 1",
          inputLabel: "NAMA JENIS LAPANGAN",
        };
      default:
        return {
          mainLabel: "Unit Utama",
          mainIcon: <Clock className="h-5 w-5" />,
          placeholder: "CONTOH: UNIT 01 / RESOURCE A",
          inputLabel: "NAMA ITEM UTAMA",
        };
    }
  };

  const config = getContextConfig();

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500 px-4 selection:bg-blue-600/30 font-plus-jakarta">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-6 gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="font-black text-slate-400 uppercase text-[9px] tracking-widest p-0 h-auto hover:bg-transparent hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="mr-1 h-3 w-3" /> KEMBALI
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none pr-4">
              KONFIGURASI <span className="text-blue-600">UNIT</span>
            </h1>
            <Badge className="bg-slate-900 text-white border-none rounded-lg py-1 px-3 flex items-center gap-1.5 shadow-lg shadow-slate-200 shrink-0">
              <MapPin className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] font-black tracking-widest uppercase italic pr-1">
                {resource?.name || "LOADING..."}
              </span>
            </Badge>
          </div>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="h-12 px-6 rounded-xl bg-blue-600 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-100 transition-all hover:scale-105 active:scale-95">
              <Plus className="mr-2 h-4 w-4 stroke-[3]" /> TAMBAH ITEM
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem] p-8 sm:max-w-[450px] border-none shadow-2xl overflow-hidden bg-background">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter leading-none pr-4">
                MANAGE <span className="text-blue-600">INVENTORY</span>
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-relaxed">
                Atur ketersediaan opsi untuk unit{" "}
                <span className="text-slate-900">{resource?.name}</span>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-6 pt-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
                  {itemType === "main"
                    ? config.inputLabel
                    : "NAMA BARANG / TAMBAHAN"}
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder={
                    itemType === "main"
                      ? config.placeholder
                      : "MISAL: INDOMIE GORENG / SEWA LENSA"
                  }
                  className="h-14 rounded-2xl font-bold bg-slate-50 border-none px-5 text-sm focus-visible:ring-blue-600 transition-all"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
                  TIPE ITEM
                </Label>
                <RadioGroup
                  value={itemType}
                  onValueChange={(v) => {
                    setItemType(v);
                    setPriceUnit(v === "main" ? "hour" : "pcs");
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
                      className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-50 bg-slate-50 p-4 hover:bg-slate-100 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 transition-all cursor-pointer h-24"
                    >
                      <div
                        className={cn(
                          "mb-2",
                          itemType === "main"
                            ? "text-blue-600"
                            : "text-slate-300",
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
                      className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-50 bg-slate-50 p-4 hover:bg-slate-100 peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-50 transition-all cursor-pointer text-center h-24"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
                    HARGA (Rp)
                  </Label>
                  <Input
                    value={displayPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="0"
                    className="h-12 rounded-xl font-black bg-slate-50 border-none shadow-inner text-base"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
                    PER SATUAN
                  </Label>
                  <Select value={priceUnit} onValueChange={setPriceUnit}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase italic">
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

              {itemType === "main" && (
                <div className="flex items-center space-x-3 p-4 rounded-2xl border-2 border-dashed bg-blue-50/50 border-blue-100 transition-all">
                  <input
                    type="checkbox"
                    id="def"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                  />
                  <Label
                    htmlFor="def"
                    className="text-[10px] font-black uppercase italic text-slate-700 cursor-pointer leading-none pr-1"
                  >
                    SET AS DEFAULT CONFIGURATION
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-16 rounded-[2rem] bg-slate-900 hover:bg-black font-black uppercase tracking-widest text-[11px] shadow-xl text-white transition-all active:scale-95 border-b-8 border-slate-800"
              >
                {editingItem ? "UPDATE ASSET INFO" : "SAVE NEW ASSET"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* RENDER MAIN ASSETS */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 px-2">
          <div className="h-1.5 w-10 bg-blue-600 rounded-full" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 italic pr-4">
            {config.mainLabel.toUpperCase()} OPTIONS
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mainItems.length > 0 ? (
            mainItems.map((item) => (
              <Card
                key={item.id}
                className={cn(
                  "group rounded-[2.5rem] border-none p-6 transition-all duration-300 bg-white shadow-sm overflow-visible",
                  item.is_default
                    ? "ring-2 ring-blue-600 shadow-xl shadow-blue-100 scale-[1.02]"
                    : "border border-slate-100 hover:shadow-xl hover:border-blue-100",
                )}
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-3 shadow-inner",
                      item.is_default
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-slate-50 text-slate-300",
                    )}
                  >
                    {config.mainIcon}
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    {!item.is_default && (
                      <Button
                        onClick={() => handleSetDefault(item)}
                        variant="ghost"
                        className="h-9 w-9 p-0 text-slate-300 hover:text-yellow-500 bg-slate-50/50 rounded-xl"
                      >
                        <Star className="h-4.5 w-4.5" />
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        setEditingItem(item);
                        setName(item.name);
                        setItemType("main");
                        setRawPrice(item.price_per_hour);
                        setDisplayPrice(formatIDR(item.price_per_hour));
                        setIsDefault(item.is_default);
                        setPriceUnit(item.price_unit || "hour");
                        setOpen(true);
                      }}
                      variant="ghost"
                      className="h-9 w-9 p-0 text-slate-300 hover:text-blue-600 bg-slate-50/50 rounded-xl"
                    >
                      <Edit3 className="h-4.5 w-4.5" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(item.id)}
                      variant="ghost"
                      className="h-9 w-9 p-0 text-slate-300 hover:text-red-500 bg-slate-50/50 rounded-xl"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* pr-6 untuk menjamin font italic tidak kepotong oleh Badge */}
                    <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 pr-2 leading-tight">
                      {item.name}
                    </h4>
                    {item.is_default && (
                      <Badge className="bg-blue-600 text-white border-none text-[8px] font-black px-2 py-0.5 rounded-lg shadow-sm shrink-0">
                        DEFAULT
                      </Badge>
                    )}
                  </div>
                  <p className="text-base font-black text-blue-600 italic tracking-tight flex items-center gap-1.5">
                    Rp {formatIDR(item.price_per_hour)}
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black non-italic">
                      {getUnitLabel(item.price_unit)}
                    </span>
                  </p>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center rounded-[2.5rem] bg-slate-50/50 border border-dashed border-slate-200">
              <p className="text-xs font-black text-slate-400 uppercase italic tracking-widest pr-4">
                No options registered yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RENDER ADD-ONS */}
      <div className="space-y-5 pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="h-1.5 w-10 bg-orange-500 rounded-full" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 italic pr-4">
            ADD-ONS & SERVICES
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addonItems.length > 0 ? (
            addonItems.map((item) => (
              <Card
                key={item.id}
                className="group rounded-[2.5rem] border border-slate-100 p-6 bg-slate-50/30 hover:bg-white hover:shadow-2xl transition-all duration-300 overflow-visible"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-white text-slate-200 group-hover:text-orange-500 group-hover:shadow-lg transition-all shadow-inner">
                    <Package className="h-6 w-6 stroke-[2.5]" />
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Button
                      onClick={() => {
                        setEditingItem(item);
                        setName(item.name);
                        setItemType("addon");
                        setRawPrice(item.price_per_hour);
                        setDisplayPrice(formatIDR(item.price_per_hour));
                        setIsDefault(item.is_default);
                        setPriceUnit("pcs");
                        setOpen(true);
                      }}
                      variant="ghost"
                      className="h-9 w-9 p-0 text-slate-300 hover:text-blue-600 bg-white rounded-xl shadow-sm"
                    >
                      <Edit3 className="h-4.5 w-4.5" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(item.id)}
                      variant="ghost"
                      className="h-9 w-9 p-0 text-slate-300 hover:text-red-500 bg-white rounded-xl shadow-sm"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 pr-6 truncate leading-tight">
                    {item.name}
                  </h4>
                  <p className="text-base font-black text-orange-600 italic tracking-tight">
                    Rp {formatIDR(item.price_per_hour)}
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black non-italic ml-1.5">
                      / PCS
                    </span>
                  </p>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center rounded-[2.5rem] bg-slate-50/50 border border-dashed border-slate-200">
              <p className="text-xs font-black text-slate-400 uppercase italic tracking-widest pr-4">
                No add-ons registered yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
