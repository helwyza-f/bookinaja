"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  ArrowUpRight,
  Plus,
  Search,
} from "lucide-react";
import { format, isSameDay, isSameMonth, parseISO, startOfDay } from "date-fns";
import { id } from "date-fns/locale";
import { hasPermission } from "@/lib/admin-access";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
import {
  AdminSurfaceEmpty,
  AdminSurfaceError,
} from "@/components/dashboard/admin-surface-state";
import { PageShell } from "@/components/dashboard/page-shell";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import {
  tenantBookingsChannel,
  tenantDashboardChannel,
} from "@/lib/realtime/channels";
import {
  BOOKING_EVENT_PREFIXES,
  type RealtimeEvent,
  matchesRealtimePrefix,
} from "@/lib/realtime/event-types";

type BookingRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  resource_name: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status?: string;
  deposit_override_active?: boolean;
  deposit_amount?: number;
  balance_due?: number;
  total_resource: number;
  total_fnb: number;
};

function getBookingDate(value: string) {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed;
}

function getBookingTotal(booking: BookingRow) {
  return Number(booking.total_resource || 0) + Number(booking.total_fnb || 0);
}

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function isOperationallyActive(booking: BookingRow) {
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const balanceDue = Number(booking.balance_due || 0);
  return (
    status === "active" ||
    status === "ongoing" ||
    (status === "completed" &&
      (balanceDue > 0 || ["pending", "partial_paid", "unpaid", "failed", "expired"].includes(paymentStatus)))
  );
}

function getPaymentMeta(booking: BookingRow) {
  const status = String(booking.payment_status || "").toLowerCase();
  const depositAmount = Number(booking.deposit_amount || 0);
  const balanceDue = Number(booking.balance_due || 0);
  const hasDepositOverride = Boolean(booking.deposit_override_active);

  if (status === "awaiting_verification") {
    return { label: "Verifikasi", className: "bg-amber-500 text-white" };
  }
  if (status === "settled" || (status === "paid" && balanceDue === 0)) {
    return { label: "Lunas", className: "bg-emerald-500 text-white" };
  }
  if (status === "partial_paid" || (status === "paid" && depositAmount > 0)) {
    return { label: "DP masuk", className: "bg-blue-600 text-white" };
  }
  if (status === "pending") {
    return {
      label: hasDepositOverride ? "Tanpa DP" : depositAmount > 0 ? "Menunggu DP" : "Bayar nanti",
      className: hasDepositOverride ? "bg-amber-500 text-white" : "bg-orange-500 text-white",
    };
  }
  return { label: "Belum dibayar", className: "bg-slate-500 text-white" };
}

function getStatusMeta(booking: BookingRow) {
  const status = String(booking.status || "").toLowerCase();
  if (isOperationallyActive(booking) && status === "completed") {
    return { label: "Perlu pelunasan", className: "bg-amber-500 text-white" };
  }
  if (status === "active" || status === "ongoing") {
    return { label: "Aktif", className: "bg-emerald-500 text-white" };
  }
  if (status === "confirmed") {
    return { label: "Confirmed", className: "bg-blue-600 text-white" };
  }
  return {
    label: booking.status || "pending",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
}

function patchBookingFromEvent(prev: BookingRow[], event: RealtimeEvent) {
  const bookingID = String(event.refs?.booking_id || event.entity_id || "");
  if (!bookingID) return prev;

  let found = false;
  const next = prev.map((booking) => {
    if (booking.id !== bookingID) return booking;
    found = true;
    return {
      ...booking,
      status: String(event.summary?.status ?? booking.status),
      payment_status: String(event.summary?.payment_status ?? booking.payment_status ?? ""),
      deposit_override_active:
        typeof event.summary?.deposit_override_active === "boolean"
          ? Boolean(event.summary.deposit_override_active)
          : booking.deposit_override_active,
      resource_name: String(event.summary?.resource_name ?? booking.resource_name ?? ""),
      customer_name: String(event.summary?.customer_name ?? booking.customer_name ?? ""),
      start_time: String(event.summary?.start_time ?? booking.start_time),
      end_time: String(event.summary?.end_time ?? booking.end_time),
      balance_due:
        typeof event.summary?.balance_due === "number"
          ? Number(event.summary.balance_due)
          : booking.balance_due,
    };
  });

  return found ? next : prev;
}

export default function BookingCalendarPage() {
  const router = useRouter();
  const { user: adminUser } = useAdminSession();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [visibleMonth, setVisibleMonth] = useState<Date>(startOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get("/bookings");
      setBookings(res.data || []);
    } catch {
      setLoadError(true);
      toast.error("Gagal mengambil data booking");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const { connected: realtimeConnected, status: realtimeStatus } = useRealtime({
    enabled: Boolean(adminUser?.tenant_id),
    channels: adminUser?.tenant_id
      ? [tenantBookingsChannel(adminUser.tenant_id), tenantDashboardChannel(adminUser.tenant_id)]
      : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      setBookings((current) => patchBookingFromEvent(current, event));
      if (event.type === "booking.created") {
        void fetchBookings();
      }
    },
    onReconnect: fetchBookings,
  });

  const canCreateBookings = hasPermission(adminUser, "bookings.create");

  const countsByDay = useMemo(() => {
    const counts = new Map<string, number>();
    bookings.forEach((booking) => {
      const key = format(getBookingDate(booking.start_time), "yyyy-MM-dd");
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [bookings]);

  const selectedDayBookings = useMemo(
    () =>
      bookings
        .filter((booking) => isSameDay(getBookingDate(booking.start_time), selectedDate))
        .sort((a, b) => getBookingDate(a.start_time).getTime() - getBookingDate(b.start_time).getTime()),
    [bookings, selectedDate],
  );

  const monthBookings = useMemo(
    () => bookings.filter((booking) => isSameMonth(getBookingDate(booking.start_time), visibleMonth)),
    [bookings, visibleMonth],
  );

  const groupedAgenda = useMemo(() => {
    const groups = new Map<string, BookingRow[]>();
    selectedDayBookings.forEach((booking) => {
      const key = booking.resource_name || "Tanpa resource";
      groups.set(key, [...(groups.get(key) || []), booking]);
    });
    return [...groups.entries()];
  }, [selectedDayBookings]);

  const metrics = useMemo(() => {
    const revenue = selectedDayBookings.reduce((sum, booking) => sum + getBookingTotal(booking), 0);
    const active = selectedDayBookings.filter(isOperationallyActive).length;
    const verification = selectedDayBookings.filter(
      (booking) => String(booking.payment_status || "").toLowerCase() === "awaiting_verification",
    ).length;
    return {
      total: selectedDayBookings.length,
      active,
      verification,
      revenue,
    };
  }, [selectedDayBookings]);

  const DayButtonWithCount = useCallback(
    (props: ComponentProps<typeof CalendarDayButton>) => {
      const key = format(props.day.date, "yyyy-MM-dd");
      const count = countsByDay.get(key) || 0;
      const isSelected = Boolean(props.modifiers.selected);
      const isToday = Boolean(props.modifiers.today);

      return (
        <CalendarDayButton
          {...props}
          className={cn(
            "h-full w-full min-w-0 rounded-none bg-transparent text-slate-700 shadow-none ring-0 transition-colors dark:text-slate-200",
            isToday &&
              !isSelected &&
              "bg-slate-50 dark:bg-slate-900",
            "data-[selected-single=true]:bg-[var(--bookinaja-600)] dark:data-[selected-single=true]:bg-[var(--bookinaja-600)]",
            "data-[selected-single=true]:shadow-none data-[selected-single=true]:ring-0",
            "data-[selected-single=true]:text-white dark:data-[selected-single=true]:text-white",
            props.className,
          )}
        >
          <span
            className={cn(
              "text-sm font-semibold leading-none transition-colors",
              isSelected
                ? "text-white"
                : isToday
                  ? "text-slate-950 dark:text-white"
                  : "text-slate-700 dark:text-slate-200",
            )}
          >
            {props.children}
          </span>
          {count > 0 ? (
            <span
              className={cn(
                "absolute inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--bookinaja-500)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ring-1 ring-white/90 dark:ring-slate-950",
                isSelected ? "right-1 top-1" : "right-1.5 top-1.5",
              )}
            >
              {count > 3 ? "3+" : count}
            </span>
          ) : null}
        </CalendarDayButton>
      );
    },
    [countsByDay],
  );

  if (loadError) {
    return (
      <AdminSurfaceError
        title="Gagal memuat kalender booking"
        description="Data booking belum berhasil dimuat, jadi kalender dan agenda harian belum akurat."
        action={
          <Button
            onClick={() => void fetchBookings()}
            variant="outline"
            className="rounded-xl"
          >
            Coba lagi
          </Button>
        }
      />
    );
  }

  return (
    <PageShell
      eyebrow="Admin"
      title="Kalender"
      description="Pilih tanggal di kalender, lalu lihat booking yang jatuh pada hari itu."
      className="max-w-none space-y-4 px-3 pb-20 pt-4 font-plus-jakarta md:px-4"
      actions={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
            <div className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              {monthBookings.length} booking bulan ini
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/bookings")}
            className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <Search size={16} className="mr-2" />
            Daftar booking
          </Button>
          <Button
            onClick={() => canCreateBookings && router.push("/admin/bookings/new?mode=scheduled")}
            disabled={!canCreateBookings}
            className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white hover:bg-[var(--bookinaja-700)] dark:bg-white dark:text-slate-950"
          >
            <Plus size={16} strokeWidth={4} className="mr-2" />
            Booking baru
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-4">
          <Card className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-950">
            <Skeleton className="h-[620px] w-full rounded-2xl bg-slate-100 dark:bg-white/5" />
          </Card>
          <Skeleton className="h-24 rounded-2xl bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-56 rounded-2xl bg-slate-100 dark:bg-white/5" />
        </div>
      ) : bookings.length === 0 ? (
        <AdminSurfaceEmpty
          title="Belum ada booking"
          description="Kalender akan otomatis terisi setelah tenant mulai menerima booking."
          action={
            canCreateBookings ? (
              <Button
                onClick={() => router.push("/admin/bookings/new?mode=scheduled")}
                className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Buat booking baru
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                  Kalender utama
                </p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {format(visibleMonth, "MMMM yyyy", { locale: id })}
                </h2>
              </div>
              <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
                <div className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-[var(--bookinaja-700)] dark:border-slate-800 dark:bg-slate-900 dark:text-[var(--bookinaja-200)]">
                  {monthBookings.length} booking
                </div>
                <div className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  {format(selectedDate, "dd MMM yyyy", { locale: id })}
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              <Calendar
                mode="single"
                locale={id}
                selected={selectedDate}
                month={visibleMonth}
                onMonthChange={setVisibleMonth}
                onSelect={(date) => date && setSelectedDate(startOfDay(date))}
                components={{ DayButton: DayButtonWithCount }}
                className="w-full bg-transparent p-0 [--cell-size:3.9rem] sm:[--cell-size:4.2rem] xl:[--cell-size:4.75rem]"
                classNames={{
                  root: "w-full rounded-[1.5rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
                  months: "w-full",
                  month: "w-full min-w-0 gap-0 bg-white p-0 dark:bg-slate-950",
                  table: "w-full table-fixed border-collapse",
                  nav: "absolute inset-x-0 top-0 flex items-center justify-between px-2 sm:px-3",
                  button_previous:
                    "size-8 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
                  button_next:
                    "size-8 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
                  month_caption:
                    "mb-0 flex h-14 w-full items-center justify-center border-b border-slate-100 px-10 dark:border-slate-800",
                  caption_label:
                    "text-lg font-semibold tracking-tight text-slate-950 dark:text-white",
                  weekdays:
                    "border-b border-slate-100 dark:border-slate-800",
                  weekday:
                    "h-10 whitespace-nowrap px-0 text-center align-middle text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500",
                  week: "border-b border-slate-100 last:border-b-0 dark:border-slate-800",
                  day: "relative h-[var(--cell-size)] overflow-hidden border-r border-slate-100 p-0 align-middle last:border-r-0 dark:border-slate-800",
                  outside:
                    "text-slate-300 dark:text-slate-700 aria-selected:text-slate-300 dark:aria-selected:text-slate-700",
                  today: "text-slate-950 dark:text-white",
                }}
              />
            </div>
          </Card>

          <Card className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-800">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Hari dipilih
              </p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: id })}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Booking untuk tanggal yang dipilih tampil di daftar ini.
              </p>
            </div>

            <div className="px-4 py-4 sm:px-5">
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    Daftar booking
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {metrics.total} booking · {groupedAgenda.length} resource
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    Revenue
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    Rp {formatIDR(metrics.revenue)}
                  </div>
                </div>
              </div>

              <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                {selectedDayBookings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm leading-6 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Belum ada booking di tanggal ini. Pilih hari lain untuk melihat aktivitas yang lebih ramai.
                  </div>
                ) : (
                  selectedDayBookings.map((booking) => {
                    const statusMeta = getStatusMeta(booking);
                    const paymentMeta = getPaymentMeta(booking);
                    return (
                      <Link
                        key={booking.id}
                        href={`/admin/bookings/${booking.id}`}
                        prefetch={false}
                        className="block rounded-2xl border border-slate-200 bg-slate-50/90 p-4 transition hover:border-[var(--bookinaja-300)] hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold text-slate-950 dark:text-white">
                                {booking.customer_name}
                              </div>
                              <Badge className={cn("rounded-full border-0 text-[11px]", statusMeta.className)}>
                                {statusMeta.label}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <span>
                                {format(getBookingDate(booking.start_time), "HH:mm", { locale: id })} -{" "}
                                {format(getBookingDate(booking.end_time), "HH:mm", { locale: id })}
                              </span>
                              <span>{booking.resource_name}</span>
                            </div>
                            <div className="mt-2">
                              <Badge className={cn("rounded-full border-0 text-[11px]", paymentMeta.className)}>
                                {paymentMeta.label}
                              </Badge>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-950 dark:text-white">
                              Rp {formatIDR(getBookingTotal(booking))}
                            </div>
                            <div className="mt-2 inline-flex items-center text-xs font-medium text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                              Detail
                              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
