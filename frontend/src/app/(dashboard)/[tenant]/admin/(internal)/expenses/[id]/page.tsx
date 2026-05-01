"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Clock3,
  PencilLine,
  ReceiptText,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import { ExpenseDialog, type ExpenseRecord } from "@/components/expenses/expense-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hasPermission, type AdminSessionUser } from "@/lib/admin-access";

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = Array.isArray(params.id) ? params.id[0] : String(params.id || "");
  const [expense, setExpense] = useState<ExpenseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminSessionUser | null>(null);
  const canUpdateExpenses = hasPermission(adminUser, "expenses.update");
  const canDeleteExpenses = hasPermission(adminUser, "expenses.delete");

  const formatIDR = (value: number) =>
    new Intl.NumberFormat("id-ID").format(value || 0);

  const formatExpenseDate = (value: string) => {
    const parsed = parseISO(value);
    if (!isValid(parsed)) return "-";
    return format(parsed, "dd MMM yyyy");
  };

  const fetchDetail = useCallback(async () => {
    if (!expenseId) return;

    setLoading(true);
    try {
      const res = await api.get(`/expenses/${expenseId}`);
      setExpense(res.data || null);
    } catch {
      toast.error("Gagal memuat detail pengeluaran");
      setExpense(null);
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setAdminUser(res.data?.user || null))
      .catch(() => setAdminUser(null));
  }, []);

  useEffect(() => {
    void fetchDetail();
    const onFocus = () => void fetchDetail();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchDetail]);

  const handleDelete = async () => {
    if (!canDeleteExpenses) return;
    if (!expense) return;
    if (!confirm(`Hapus pengeluaran "${expense.title}"?`)) return;

    setDeleting(true);
    try {
      await api.delete(`/expenses/${expense.id}`);
      toast.success("PENGELUARAN DIHAPUS");
      router.push("/admin/expenses");
    } catch {
      toast.error("Gagal menghapus pengeluaran");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-3 pb-20 font-plus-jakarta md:px-4">
        <Skeleton className="h-10 w-40 rounded-2xl bg-slate-100 dark:bg-white/5" />
        <Skeleton className="h-16 w-full rounded-[1.5rem] bg-slate-100 dark:bg-white/5" />
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <Skeleton className="h-80 rounded-[1.6rem] bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-80 rounded-[1.6rem] bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center gap-3 px-3 pb-20 text-center font-plus-jakarta md:px-4">
        <ReceiptText className="h-10 w-10 text-slate-300" />
        <h1 className="text-xl font-[1000] italic uppercase tracking-tighter text-slate-950 dark:text-white">
          Expense not found
        </h1>
        <Button
          onClick={() => router.push("/admin/expenses")}
          className="rounded-2xl bg-blue-600 px-4 font-black uppercase italic text-[9px] tracking-widest text-white"
        >
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 pb-20 pt-5 font-plus-jakarta animate-in fade-in duration-300 md:px-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950 sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/expenses")}
            className="h-8 px-0 text-xs font-semibold text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-3xl">
              Expense Detail
            </h1>
            <Badge className="rounded-full border-none bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-600">
              {expense.category}
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-slate-500">
            {expense.title}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Button
            onClick={() => canUpdateExpenses && setOpen(true)}
            disabled={!canUpdateExpenses}
            className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm gap-2 hover:bg-blue-700"
          >
            <PencilLine className="h-4 w-4" />
            Edit
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting || !canDeleteExpenses}
            variant="ghost"
            className="h-10 rounded-xl px-4 text-sm font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950 md:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">
                Amount
              </p>
              <div className="text-3xl font-semibold tracking-tight text-blue-600 md:text-4xl">
                Rp {formatIDR(expense.amount)}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
              <Calendar className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetaItem
              icon={<Calendar className="h-4 w-4" />}
              label="Expense Date"
              value={formatExpenseDate(expense.expense_date)}
            />
            <MetaItem
              icon={<ReceiptText className="h-4 w-4" />}
              label="Payment Method"
              value={expense.payment_method || "Cash"}
            />
            <MetaItem
              icon={<Camera className="h-4 w-4" />}
              label="Receipt"
              value={expense.receipt_url ? "Uploaded" : "Not uploaded"}
            />
            <MetaItem
              icon={<Clock3 className="h-4 w-4" />}
              label="Created At"
              value={
                expense.created_at
                  ? formatExpenseDate(expense.created_at)
                  : "-"
              }
            />
          </div>

          <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Category" value={expense.category || "-"} />
              <Field label="Vendor" value={expense.vendor || "-"} />
            </div>
            <Field label="Notes" value={expense.notes || "-"} />
            <Field
              label="Record ID"
              value={expense.id}
              mono
            />
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Receipt Preview
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                Bukti Transaksi
              </h2>
            </div>
            <Badge
              className={cn(
                "rounded-lg border-none px-3 py-1 text-[9px] font-black uppercase italic tracking-widest",
                expense.receipt_url
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
              )}
            >
              {expense.receipt_url ? "Available" : "Empty"}
            </Badge>
          </div>

          {expense.receipt_url ? (
            <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-50 dark:border-white/5 dark:bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={expense.receipt_url}
                alt={expense.title}
                className="h-[22rem] w-full object-cover"
              />
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-3 py-2 dark:border-white/5">
                <p className="truncate text-[10px] font-black uppercase italic tracking-widest text-slate-400">
                  Receipt image
                </p>
                <Button
                  variant="ghost"
                  asChild
                  className="h-8 rounded-xl px-3 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                >
                  <a href={expense.receipt_url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex min-h-[22rem] flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 text-center dark:border-white/5 dark:bg-slate-950/40">
              <ReceiptText className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
                No receipt uploaded
              </p>
              <p className="mt-1 max-w-xs text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                Add a photo from the edit form if you want proof attached.
              </p>
            </div>
          )}
        </Card>
      </div>

      <ExpenseDialog
        open={open}
        onOpenChange={setOpen}
        editingExpense={expense}
        onSuccess={fetchDetail}
      />
    </div>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-white/5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 dark:bg-slate-900 dark:text-white",
          mono && "font-mono not-italic tracking-normal normal-case break-all",
        )}
      >
        {value}
      </p>
    </div>
  );
}
