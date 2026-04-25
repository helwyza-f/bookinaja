"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { format, parseISO } from "date-fns";
import {
  CalendarIcon,
  ReceiptText,
  Save,
  Upload,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ExpenseRecord = {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  vendor?: string;
  notes?: string;
  receipt_url?: string;
  created_at?: string;
  updated_at?: string;
};

type ExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense: ExpenseRecord | null;
  onSuccess: () => void;
};

const categoryOptions = [
  "Operasional",
  "Gaji",
  "Marketing",
  "Maintenance",
  "Inventory",
  "Lainnya",
];

const formatMoneyInput = (value: string) => {
  const raw = value.replace(/\D/g, "");
  if (!raw) return "";
  return new Intl.NumberFormat("id-ID").format(Number(raw));
};

export function ExpenseDialog({
  open,
  onOpenChange,
  editingExpense,
  onSuccess,
}: ExpenseDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Operasional");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(new Date());
  const [receiptUrl, setReceiptUrl] = useState("");

  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title || "");
      setCategory(editingExpense.category || "Operasional");
      setAmount(String(editingExpense.amount || ""));
      setExpenseDate(
        editingExpense.expense_date
          ? parseISO(editingExpense.expense_date)
          : new Date(),
      );
      setReceiptUrl(editingExpense.receipt_url || "");
      return;
    }

    resetForm();
  }, [editingExpense, open]);

  const resetForm = () => {
    setTitle("");
    setCategory("Operasional");
    setAmount("");
    setExpenseDate(new Date());
    setReceiptUrl("");
  };

  const handleReceiptUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File terlalu besar, maksimal 2MB");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setIsUploading(true);
    try {
      const res = await api.post("/expenses/upload-receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setReceiptUrl(res.data.url || "");
      toast.success("Foto struk berhasil diupload");
    } catch {
      toast.error("Gagal mengupload foto struk");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim() || !amount || !expenseDate) {
      toast.error("Lengkapi data wajib");
      return;
    }

    const parsedAmount = Number(amount.replace(/\D/g, ""));
    if (!parsedAmount) {
      toast.error("Nominal tidak valid");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: title.trim(),
      category,
      amount: parsedAmount,
      expense_date: format(expenseDate, "yyyy-MM-dd"),
      payment_method: "Cash",
      receipt_url: receiptUrl.trim(),
    };

    try {
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, payload);
        toast.success("Expense diperbarui");
      } else {
        await api.post("/expenses", payload);
        toast.success("Expense disimpan");
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Gagal menyimpan expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] overflow-hidden border-none bg-white p-0 shadow-2xl dark:bg-slate-950 rounded-[1.75rem] sm:max-w-2xl lg:max-w-5xl">
        <div className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white dark:border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.26),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_32%)]" />
          <div className="relative flex items-start justify-between gap-4 px-4 py-4 md:px-5">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.35em] text-blue-200">
                Expense Entry
              </p>
              <DialogTitle className="mt-1 text-lg font-[1000] italic uppercase tracking-tighter leading-none text-white md:text-2xl">
                {editingExpense ? "Edit" : "New"}{" "}
                <span className="text-blue-400">Expense.</span>
              </DialogTitle>
              <p className="mt-2 max-w-xl text-[10px] font-medium text-slate-300 md:text-sm">
                Catat pengeluaran bisnis secara cepat, rapi, dan tetap enak dibaca di mobile maupun desktop.
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 rounded-full text-white hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[86vh] overflow-y-auto p-4 md:p-5"
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-5">
            <div className="space-y-4">
              <FieldGroup label="Keterangan">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: bayar listrik bulan ini"
                  className="h-11 rounded-2xl border-none bg-slate-50 px-4 font-bold uppercase italic shadow-inner focus-visible:ring-2 focus-visible:ring-blue-600 dark:bg-slate-900"
                  autoComplete="off"
                  required
                />
              </FieldGroup>

              <div className="grid gap-3 sm:grid-cols-2">
                <FieldGroup label="Nominal">
                  <Input
                    value={formatMoneyInput(amount)}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    inputMode="numeric"
                    className="h-11 rounded-2xl border-none bg-slate-50 px-4 font-[1000] italic text-blue-600 shadow-inner focus-visible:ring-2 focus-visible:ring-blue-600 dark:bg-slate-900"
                    required
                  />
                </FieldGroup>

                <FieldGroup label="Tanggal">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-11 w-full justify-between rounded-2xl border-none bg-slate-50 px-4 font-bold italic shadow-inner dark:bg-slate-900",
                          !expenseDate && "text-slate-400",
                        )}
                      >
                        <span className="text-[10px] uppercase tracking-widest">
                          {expenseDate
                            ? format(expenseDate, "dd MMM yyyy")
                            : "Pilih tanggal"}
                        </span>
                        <CalendarIcon className="h-4 w-4 text-blue-600" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-auto overflow-hidden rounded-3xl border-none p-0 shadow-2xl"
                    >
                      <Calendar
                        mode="single"
                        selected={expenseDate}
                        onSelect={(date) => date && setExpenseDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </FieldGroup>
              </div>

              <FieldGroup label="Kategori">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 rounded-2xl border-none bg-slate-50 px-4 font-bold italic shadow-inner focus:ring-2 focus:ring-blue-600 dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none font-black uppercase italic shadow-2xl">
                    {categoryOptions.map((item) => (
                      <SelectItem key={item} value={item} className="text-xs">
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                      Foto Struk
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase italic tracking-tighter text-slate-950 dark:text-white">
                      Bukti transaksi
                    </p>
                  </div>
                  {receiptUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setReceiptUrl("")}
                      className="h-8 rounded-xl px-3 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/5 dark:hover:text-white"
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>

                {receiptUrl ? (
                  <div className="mt-3 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white dark:border-white/5 dark:bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptUrl}
                      alt="Receipt preview"
                      className="h-56 w-full object-cover sm:h-72"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 flex w-full flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-slate-300 bg-white px-4 py-8 text-center transition-colors hover:border-blue-500/50 hover:bg-blue-50/30 dark:border-white/5 dark:bg-slate-950 dark:hover:bg-blue-950/10"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
                      <ReceiptText className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase italic tracking-tighter text-slate-950 dark:text-white">
                        Upload foto struk
                      </p>
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                        PNG / JPG, max 2MB
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white">
                      {isUploading ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      Choose file
                    </div>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void handleReceiptUpload(file);
                    e.currentTarget.value = "";
                  }}
                  disabled={isUploading}
                />
              </div>
            </div>

            <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-slate-900/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Quick Summary
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase italic tracking-tighter text-slate-950 dark:text-white">
                    Expense snapshot
                  </p>
                </div>
                <ReceiptText className="h-5 w-5 text-blue-600" />
              </div>

              <MiniStat
                label="Amount"
                value={amount ? `Rp ${formatMoneyInput(amount)}` : "-"}
              />
              <MiniStat
                label="Date"
                value={expenseDate ? format(expenseDate, "dd MMM yyyy") : "-"}
              />
              <MiniStat label="Category" value={category} />
              <MiniStat
                label="Receipt"
                value={receiptUrl ? "Uploaded" : "Not uploaded"}
              />

              <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-white p-4 dark:border-white/5 dark:bg-slate-950">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Notes
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Simpan pengeluaran seperlunya. Dialog ini sengaja dibuat ringkas supaya cepat diisi dari HP.
                </p>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 mt-5 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-white/5 dark:bg-slate-950/95 md:-mx-5 md:px-5">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-11 flex-1 rounded-2xl font-black uppercase italic text-[9px] tracking-widest text-slate-400 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/5 dark:hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 flex-[2] rounded-2xl bg-blue-600 px-4 font-[1000] uppercase italic text-[10px] tracking-widest text-white shadow-lg border-b-4 border-blue-800 hover:bg-blue-500 active:scale-95"
              >
                {isSubmitting ? (
                  "Saving..."
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" strokeWidth={3} />
                    Save Expense
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
        {label}
      </Label>
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.1rem] bg-white px-3.5 py-3 shadow-sm dark:bg-slate-950">
      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
        {label}
      </span>
      <span className="max-w-[60%] truncate text-[10px] font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
        {value}
      </span>
    </div>
  );
}
