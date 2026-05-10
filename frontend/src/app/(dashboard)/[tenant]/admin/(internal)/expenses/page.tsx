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
import { DashboardPanel } from "@/components/dashboard/analytics-kit";
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
  type LucideIcon,
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

function formatCompactRange(from: string, to: string) {
  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  if (!isValid(fromDate) || !isValid(toDate)) return "-";

  const sameYear = format(fromDate, "yyyy") === format(toDate, "yyyy");
  const sameMonth = format(fromDate, "yyyy-MM") === format(toDate, "yyyy-MM");

  if (sameMonth) {
    return `${format(fromDate, "d")} - ${format(toDate, "d MMM yyyy")}`;
  }

  if (sameYear) {
    return `${format(fromDate, "d MMM")} - ${format(toDate, "d MMM yyyy")}`;
  }

  return `${format(fromDate, "d MMM yyyy")} - ${format(toDate, "d MMM yyyy")}`;
}

function CompactMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  loading = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: "indigo" | "emerald" | "amber" | "slate";
  loading?: boolean;
}) {
  const toneMap = {
    indigo: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]",
    },
    emerald: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    amber: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    },
    slate: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300",
    },
  } as const;

  const colors = toneMap[tone];

  return (
    <Card className={cn("rounded-xl border p-3 sm:p-4", colors.shell)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            {loading ? "..." : value}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
            {hint}
          </div>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11",
            colors.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

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
      toast.success("Pengeluaran berhasil dihapus");
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
      label: "Pengeluaran",
      value: `Rp ${formatIDR(Number(summary.total || 0))}`,
      icon: Banknote,
      tone: "indigo" as const,
      hint: "Filter",
    },
    {
      label: "Catatan",
      value: String(summary.entries || filteredItems.length),
      icon: ReceiptText,
      tone: "emerald" as const,
      hint: "Catatan",
    },
    {
      label: "Kategori",
      value: category === "all" ? "Semua" : category,
      icon: Search,
      tone: "amber" as const,
      hint: "Aktif",
    },
  ];

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-3 pb-20 pt-4 font-plus-jakarta animate-in fade-in duration-300 md:px-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <Banknote className="h-3.5 w-3.5 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]" />
              Expenses
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                Expenses
              </h1>
            </div>
          </div>
          <Button
            onClick={openCreate}
            disabled={!canCreateExpenses}
            className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-[var(--bookinaja-700)] dark:bg-white dark:text-slate-950"
          >
            <Plus size={15} className="mr-2" />
            Tambah
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-2 md:gap-3 xl:grid-cols-4">
        {stats.map((item) => (
          <CompactMetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            hint={item.hint}
            icon={item.icon}
            tone={item.tone}
            loading={loading}
          />
        ))}
        <CompactMetricCard
          label="Rentang"
          value={formatCompactRange(from, to)}
          hint="Periode"
          icon={CalendarIcon}
          tone="slate"
          loading={loading}
        />
      </div>

      <DashboardPanel
        eyebrow="Filter"
        title="Cari pengeluaran"
        description="Saring kategori dan periode."
      >
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.4fr)_0.95fr_0.95fr_0.95fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul, vendor, notes"
              className="h-10 rounded-lg border-slate-200 bg-slate-50 pl-10 text-sm font-medium dark:border-slate-800 dark:bg-slate-900/30"
            />
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-slate-50 text-sm font-medium dark:border-slate-800 dark:bg-slate-900/30">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent className="rounded-xl font-medium">
              {categoryOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "all" ? "Semua kategori" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DatePopover label="Dari" value={from} onChange={setFrom} />
          <DatePopover label="Sampai" value={to} onChange={setTo} />

          <Button
            onClick={resetFilters}
            variant="ghost"
            className={cn(
              "h-10 rounded-lg px-4 text-sm font-medium lg:w-auto",
              isFilterActive
                ? "text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
              : "text-slate-300",
            )}
          >
            Reset
          </Button>
        </div>
      </DashboardPanel>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-lg bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-20 w-full rounded-lg bg-slate-100 dark:bg-white/5" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-50 text-slate-300 dark:bg-slate-900">
            <ReceiptText className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
            Belum ada pengeluaran
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Catat biaya bisnis supaya arus pengeluaran tetap rapi dan mudah ditelusuri.
          </p>
          <Button
            onClick={openCreate}
            className="mt-5 rounded-lg bg-[var(--bookinaja-600)] px-4 text-sm font-medium text-white hover:bg-[var(--bookinaja-700)]"
          >
            Tambah Pengeluaran
          </Button>
        </div>
      ) : (
        <DashboardPanel
          eyebrow="Expense Records"
          title="Daftar pengeluaran"
          description="Record pengeluaran aktif."
        >
          <div className="grid gap-3 md:hidden">
            {filteredItems.map((expense) => (
              <Card
                key={expense.id}
                onClick={() => openDetail(expense.id)}
                className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-[color:rgba(59,130,246,0.22)] dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-full border-none bg-[var(--bookinaja-50)] px-2 py-0.5 text-[10px] font-semibold text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-200)]">
                        {expense.category}
                      </Badge>
                      <span className="text-[11px] font-medium text-slate-400">
                        {expense.receipt_url ? "struk tersedia" : "tanpa struk"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {expense.title}
                      </h3>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--bookinaja-600)]" />
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      {formatExpenseDate(expense.expense_date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                      Nilai
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                      Rp {formatIDR(expense.amount)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
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
                    className="h-8 rounded-lg px-3 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 dark:border-white/5">
                  <TableHead className="pl-5 text-xs font-semibold text-slate-500">
                    Judul
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    Kategori
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    Tanggal
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500">
                    Nilai
                  </TableHead>
                  <TableHead className="pr-5 text-right text-xs font-semibold text-slate-500">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((expense) => (
                  <TableRow
                    key={expense.id}
                    onClick={() => openDetail(expense.id)}
                    className="cursor-pointer border-slate-100 hover:bg-[var(--bookinaja-50)]/70 dark:border-white/10 dark:hover:bg-[color:rgba(59,130,246,0.08)]"
                  >
                    <TableCell className="pl-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-950 dark:text-white">
                            {expense.title}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-400">
                            <span>{expense.receipt_url ? "struk siap" : "tanpa struk"}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="rounded-full border-none bg-[var(--bookinaja-50)] px-2 py-0.5 text-[10px] font-semibold text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-200)]">
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-slate-500">
                      {formatExpenseDate(expense.expense_date)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
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
        </DashboardPanel>
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
    selected && isValid(selected) ? format(selected, "dd MMM yyyy") : "Pilih tanggal";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-10 justify-between rounded-lg border-slate-200 bg-slate-50 px-4 text-sm font-medium dark:border-slate-800 dark:bg-slate-900/30"
        >
          <span className="text-xs text-slate-500">
            {label}
          </span>
          <span className="ml-3 truncate">{labelValue}</span>
          <CalendarIcon className="ml-3 h-4 w-4 text-[var(--bookinaja-600)]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950"
        align="start"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
          initialFocus
          className="[--cell-size:2.55rem]"
        />
      </PopoverContent>
    </Popover>
  );
}
