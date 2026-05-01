"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO, startOfMonth } from "date-fns";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { hasPermission, type AdminSessionUser } from "@/lib/admin-access";
import {
  ExpenseDialog,
  type ExpenseRecord,
} from "@/components/expenses/expense-dialog";
import { toast } from "sonner";
import {
  Banknote,
  Calendar as CalendarIcon,
  ChevronRight,
  PencilLine,
  Plus,
  ReceiptText,
  Search,
  Trash2,
} from "lucide-react";

type ExpenseSummary = {
  total: number;
  entries: number;
};

const categoryOptions = [
  "all",
  "Operasional",
  "Gaji",
  "Marketing",
  "Maintenance",
  "Inventory",
  "Lainnya",
];

const defaultFrom = () => format(startOfMonth(new Date()), "yyyy-MM-dd");
const defaultTo = () => format(new Date(), "yyyy-MM-dd");

export default function ExpensesPage() {
  const router = useRouter();
  const [items, setItems] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    total: 0,
    entries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(
    null,
  );
  const [adminUser, setAdminUser] = useState<AdminSessionUser | null>(null);
  const canCreateExpenses = hasPermission(adminUser, "expenses.create");
  const canUpdateExpenses = hasPermission(adminUser, "expenses.update");
  const canDeleteExpenses = hasPermission(adminUser, "expenses.delete");

  const formatIDR = (value: number) =>
    new Intl.NumberFormat("id-ID").format(value || 0);

  const formatExpenseDate = (value: string) => {
    const parsed = parseISO(value);
    if (!isValid(parsed)) return "-";
    return format(parsed, "dd MMM yyyy");
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, expensesRes, summaryRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/expenses", {
          params: {
            limit: 100,
            category: category === "all" ? undefined : category,
            from,
            to,
          },
        }),
        api.get("/expenses/summary", {
          params: {
            category: category === "all" ? undefined : category,
            from,
            to,
          },
        }),
      ]);

      setAdminUser(meRes.data?.user || null);
      setItems(Array.isArray(expensesRes.data) ? expensesRes.data : []);
      setSummary(summaryRes.data || { total: 0, entries: 0 });
    } catch {
      toast.error("Gagal memuat pengeluaran");
    } finally {
      setLoading(false);
    }
  }, [category, from, to]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const haystack = [
        item.title,
        item.category,
        item.vendor,
        item.payment_method,
        item.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setFrom(defaultFrom());
    setTo(defaultTo());
  };

  const isFilterActive =
    Boolean(search) ||
    category !== "all" ||
    from !== defaultFrom() ||
    to !== defaultTo();

  const handleDelete = async (expense: ExpenseRecord) => {
    if (!canDeleteExpenses) return;
    if (!confirm(`Hapus pengeluaran "${expense.title}"?`)) return;

    try {
      await api.delete(`/expenses/${expense.id}`);
      toast.success("PENGELUARAN DIHAPUS");
      void fetchData();
    } catch {
      toast.error("Gagal menghapus pengeluaran");
    }
  };

  const openCreate = () => {
    if (!canCreateExpenses) return;
    setEditingExpense(null);
    setOpen(true);
  };

  const openEdit = (expense: ExpenseRecord) => {
    if (!canUpdateExpenses) return;
    setEditingExpense(expense);
    setOpen(true);
  };

  const openDetail = (id: string) => {
    router.push(`/admin/expenses/${id}`);
  };

  const stats = [
    {
      label: "Total Expense",
      value: `Rp ${formatIDR(Number(summary.total || 0))}`,
      icon: Banknote,
      tone: "bg-slate-950 text-white dark:bg-white dark:text-slate-950",
    },
    {
      label: "Entries",
      value: String(summary.entries || filteredItems.length),
      icon: ReceiptText,
      tone: "bg-white text-slate-950 dark:bg-slate-900 dark:text-white",
    },
  ];

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 pb-20 px-3 pt-5 font-plus-jakarta animate-in fade-in duration-300 md:px-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between md:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <Banknote size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Pengeluaran
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-3xl">
              Expense Ledger
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Catat biaya operasional, struk, dan kategori pengeluaran.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-stretch">
          {stats.map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm",
                item.tone,
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
                {loading ? (
                  <Skeleton className="mt-1 h-4 w-24 rounded-full bg-slate-100 dark:bg-white/10" />
                ) : (
                  <p className="mt-1 truncate text-sm font-semibold leading-none">
                    {item.value}
                  </p>
                )}
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 dark:bg-black/5">
                <item.icon className="h-4 w-4" />
              </div>
            </div>
          ))}

          <Button
            onClick={openCreate}
            disabled={!canCreateExpenses}
            className="col-span-2 h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm gap-2 transition-all hover:bg-blue-700 active:scale-95 sm:col-span-1 sm:w-auto"
          >
            <Plus size={15} /> Add Expense
          </Button>
        </div>
        </div>

        <div className="p-4">
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.4fr)_0.95fr_0.95fr_0.95fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul, vendor, notes..."
              className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm font-medium focus-visible:ring-4 focus-visible:ring-blue-600/10 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm font-medium dark:border-white/10 dark:bg-white/5">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="rounded-xl font-medium">
              {categoryOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "all" ? "All Categories" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DatePopover label="From" value={from} onChange={setFrom} />
          <DatePopover label="To" value={to} onChange={setTo} />

          <Button
            onClick={resetFilters}
            variant="ghost"
            className={cn(
              "h-10 rounded-xl px-4 text-sm font-semibold lg:w-auto",
              isFilterActive
                ? "text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                : "text-slate-300",
            )}
          >
            Reset
          </Button>
        </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-[1.4rem] bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-20 w-full rounded-[1.4rem] bg-slate-100 dark:bg-white/5" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-slate-200 bg-white p-8 text-center dark:border-white/5 dark:bg-slate-900">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-slate-50 text-slate-300 dark:bg-white/5">
            <ReceiptText className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
            Belum ada pengeluaran
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Catat biaya bisnis supaya pengeluaran tetap rapi dan gampang
            ditelusuri.
          </p>
          <Button
            onClick={openCreate}
            className="mt-5 rounded-2xl bg-blue-600 px-4 font-black uppercase italic text-[9px] tracking-widest text-white"
          >
            Add First Expense
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {filteredItems.map((expense) => (
              <Card
                key={expense.id}
                onClick={() => openDetail(expense.id)}
            className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 dark:border-white/10 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-full border-none bg-blue-600/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                        {expense.category}
                      </Badge>
                      <span className="text-[11px] font-medium text-slate-400">
                        {expense.receipt_url ? "receipt" : "no receipt"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-950 dark:text-white">
                        {expense.title}
                      </h3>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      {formatExpenseDate(expense.expense_date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-slate-400">
                      Amount
                    </div>
                    <div className="mt-1 text-sm font-semibold text-blue-600">
                      Rp {formatIDR(expense.amount)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                    <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(expense);
                    }}
                    variant="outline"
                    disabled={!canUpdateExpenses}
                    className="h-8 flex-1 rounded-xl border-slate-200 px-3 text-xs font-semibold dark:border-white/10"
                  >
                    <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                    <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(expense);
                    }}
                    variant="ghost"
                    disabled={!canDeleteExpenses}
                    className="h-8 rounded-2xl px-3 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950 md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 dark:border-white/5">
                  <TableHead className="pl-5 text-xs font-semibold text-slate-500">
                    Title
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    Category
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    Date
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500">
                    Amount
                  </TableHead>
                  <TableHead className="pr-5 text-right text-xs font-semibold text-slate-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((expense) => (
                  <TableRow
                    key={expense.id}
                    onClick={() => openDetail(expense.id)}
                    className="cursor-pointer border-slate-100 dark:border-white/5 hover:bg-blue-50/30 dark:hover:bg-blue-950/10"
                  >
                    <TableCell className="pl-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-950 dark:text-white">
                            {expense.title}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-400">
                            <span>{expense.receipt_url ? "receipt ready" : "no receipt"}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="rounded-full border-none bg-blue-600/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-slate-500">
                      {formatExpenseDate(expense.expense_date)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-blue-600">
                      Rp {formatIDR(expense.amount)}
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(expense);
                          }}
                          variant="outline"
                          disabled={!canUpdateExpenses}
                          size="icon"
                          className="h-9 w-9 rounded-xl border-slate-200 dark:border-white/10"
                        >
                          <PencilLine className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(expense);
                          }}
                          variant="ghost"
                          disabled={!canDeleteExpenses}
                          size="icon"
                          className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <ExpenseDialog
        open={open}
        onOpenChange={setOpen}
        editingExpense={editingExpense}
        onSuccess={fetchData}
      />
    </div>
  );
}

function DatePopover({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = value ? parseISO(value) : undefined;
  const labelValue =
    selected && isValid(selected) ? format(selected, "dd MMM yyyy") : "Select date";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-10 justify-between rounded-xl border-slate-200 bg-slate-50 px-4 text-sm font-medium dark:border-white/10 dark:bg-white/5"
        >
          <span className="text-xs text-slate-500">
            {label}
          </span>
          <span className="ml-3 truncate">{labelValue}</span>
          <CalendarIcon className="ml-3 h-4 w-4 text-blue-600" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden rounded-3xl border-none p-0 shadow-2xl"
        align="start"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
