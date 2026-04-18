"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { isAfter, isBefore, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getPlatformTenantBalance,
  getPlatformTenantCustomers,
  getPlatformTenantDetail,
  getPlatformTenantNotifications,
  getPlatformTenantTransactions,
  type PlatformCustomer,
  type PlatformTenantDetail,
  type PlatformTransaction,
  type MidtransNotificationLog,
  type PlatformTenantBalance,
} from "@/lib/platform-admin";

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;
  const [detail, setDetail] = useState<PlatformTenantDetail | null>(null);
  const [balance, setBalance] = useState<PlatformTenantBalance | null>(null);
  const [customers, setCustomers] = useState<PlatformCustomer[]>([]);
  const [transactions, setTransactions] = useState<PlatformTransaction[]>([]);
  const [notifications, setNotifications] = useState<MidtransNotificationLog[]>([]);
  const [overviewQuery, setOverviewQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerTier, setCustomerTier] = useState("all");
  const [transactionQuery, setTransactionQuery] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("all");
  const [transactionFrom, setTransactionFrom] = useState("");
  const [transactionTo, setTransactionTo] = useState("");
  const [logQuery, setLogQuery] = useState("");
  const [logStatus, setLogStatus] = useState("all");
  const [logFrom, setLogFrom] = useState("");
  const [logTo, setLogTo] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    getPlatformTenantDetail(tenantId).then(setDetail);
    getPlatformTenantBalance(tenantId).then(setBalance);
    getPlatformTenantCustomers(tenantId).then(setCustomers);
    getPlatformTenantTransactions(tenantId).then(setTransactions);
    getPlatformTenantNotifications(tenantId).then(setNotifications);
  }, [tenantId]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.toLowerCase();
    return customers.filter(
      (item) =>
        (customerTier === "all" || (item.tier || "").toLowerCase() === customerTier) &&
        [item.name, item.phone, item.email, item.tier].some((v) =>
          String(v || "").toLowerCase().includes(q),
        ),
    );
  }, [customerQuery, customerTier, customers]);

  const filteredTransactions = useMemo(() => {
    const q = transactionQuery.toLowerCase();
    return transactions.filter((item) => {
      const created = item.created_at ? parseISO(item.created_at) : null;
      const passDate =
        (!transactionFrom || !created || !isBefore(created, parseISO(`${transactionFrom}T00:00:00`))) &&
        (!transactionTo || !created || !isAfter(created, parseISO(`${transactionTo}T23:59:59`)));
      const passStatus =
        transactionStatus === "all" || (item.status || "").toLowerCase() === transactionStatus;
      const passQuery = [item.order_id, item.status, item.plan, item.billing_interval].some((v) =>
        String(v || "").toLowerCase().includes(q),
      );
      return passDate && passStatus && passQuery;
    });
  }, [transactionFrom, transactionQuery, transactionStatus, transactionTo, transactions]);

  const filteredNotifications = useMemo(() => {
    const q = logQuery.toLowerCase();
    return notifications.filter((item) => {
      const received = item.received_at ? parseISO(item.received_at) : null;
      const passDate =
        (!logFrom || !received || !isBefore(received, parseISO(`${logFrom}T00:00:00`))) &&
        (!logTo || !received || !isAfter(received, parseISO(`${logTo}T23:59:59`)));
      const passStatus =
        logStatus === "all" || (item.processing_status || "").toLowerCase() === logStatus;
      const passQuery = [item.order_id, item.transaction_id, item.processing_status, item.transaction_status].some((v) =>
        String(v || "").toLowerCase().includes(q),
      );
      return passDate && passStatus && passQuery;
    });
  }, [logFrom, logQuery, logStatus, logTo, notifications]);

  const getBookingIdFromOrderId = (orderId?: string) => {
    if (!orderId?.startsWith("book-")) return "";
    const trimmed = orderId.replace(/^book-/, "");
    const [idPart] = trimmed.split("-dp");
    const [duePart] = idPart.split("-due");
    return duePart;
  };

  if (!detail) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="text-sm text-slate-500">Loading tenant detail...</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">
            Tenant scope
          </div>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">{detail.name}</h1>
          <div className="mt-2 text-sm text-slate-500">
            {detail.slug} • {detail.owner_name} • {detail.owner_email}
          </div>
        </div>
        <Link
          href="/dashboard/tenants"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold"
        >
          Back to tenants
        </Link>
      </div>

      <Tabs
        overview={
          <Card className="space-y-4 rounded-[2rem] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-tight">Overview</h2>
              <Badge variant="outline" className="rounded-full uppercase">
                Snapshot
              </Badge>
            </div>
            <Input
              value={overviewQuery}
              onChange={(e) => setOverviewQuery(e.target.value)}
              placeholder="Search overview fields..."
              className="h-12 rounded-2xl"
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Balance", `Rp ${(balance?.balance ?? detail.revenue ?? 0).toLocaleString("id-ID")}`],
                ["Customers", String(detail.customers_count || 0)],
                ["Transactions", String(detail.transactions_count || 0)],
                ["Bookings", String(detail.bookings_count || 0)],
              ]
                .filter(([label, value]) =>
                  `${label} ${value}`.toLowerCase().includes(overviewQuery.toLowerCase()),
                )
                .map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                      {label}
                    </div>
                    <div className="mt-2 text-xl font-black">{value}</div>
                  </div>
                ))}
            </div>
          </Card>
        }
        customers={
          <section className="space-y-3">
            <Card className="space-y-3 rounded-[2rem] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-tight">Customers</h2>
                <Badge variant="outline" className="rounded-full uppercase">
                  {filteredCustomers.length}
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Search customer..."
                  className="h-12 rounded-2xl"
                />
                <select
                  value={customerTier}
                  onChange={(e) => setCustomerTier(e.target.value)}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
                >
                  <option value="all">All tiers</option>
                  <option value="vip">VIP</option>
                  <option value="regular">Regular</option>
                  <option value="new">New</option>
                </select>
              </div>
            </Card>
            {filteredCustomers.map((item) => (
              <Card key={item.id} className="rounded-[2rem] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-black">{item.name}</div>
                    <div className="text-sm text-slate-500">
                      {item.phone || "-"} • {item.email || "-"}
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <div>Visits: {item.visits || 0}</div>
                    <div>Spend: Rp {(item.spend || 0).toLocaleString("id-ID")}</div>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        }
        transactions={
          <section className="space-y-3">
            <Card className="space-y-3 rounded-[2rem] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-tight">Transactions</h2>
                <Badge variant="outline" className="rounded-full uppercase">
                  {filteredTransactions.length}
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  value={transactionQuery}
                  onChange={(e) => setTransactionQuery(e.target.value)}
                  placeholder="Search transaction..."
                  className="h-12 rounded-2xl"
                />
                <select
                  value={transactionStatus}
                  onChange={(e) => setTransactionStatus(e.target.value)}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
                >
                  <option value="all">All status</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="settlement">Settlement</option>
                  <option value="capture">Capture</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <Input
                  value={transactionFrom}
                  onChange={(e) => setTransactionFrom(e.target.value)}
                  type="date"
                  className="h-12 rounded-2xl"
                />
                <Input
                  value={transactionTo}
                  onChange={(e) => setTransactionTo(e.target.value)}
                  type="date"
                  className="h-12 rounded-2xl"
                />
              </div>
            </Card>
            {filteredTransactions.map((item) => {
              const bookingId = getBookingIdFromOrderId(item.order_id);
              return (
                <Card key={`${item.id}-${item.created_at}`} className="rounded-[2rem] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-black">{item.order_id}</div>
                      <div className="text-sm text-slate-500">
                        {item.plan || "-"} • {item.billing_interval || "-"} • {item.created_at}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="rounded-full uppercase">
                        {item.status}
                      </Badge>
                      {bookingId ? (
                        <Link
                          href={`/${detail.slug}/admin/bookings/${bookingId}`}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                        >
                          Booking detail
                        </Link>
                      ) : null}
                      <div className="font-black">
                        Rp {(item.amount || 0).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </section>
        }
        logs={
          <section className="space-y-3">
            <Card className="space-y-3 rounded-[2rem] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-tight">Midtrans logs</h2>
                <Badge variant="outline" className="rounded-full uppercase">
                  {filteredNotifications.length}
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  value={logQuery}
                  onChange={(e) => setLogQuery(e.target.value)}
                  placeholder="Search logs..."
                  className="h-12 rounded-2xl"
                />
                <select
                  value={logStatus}
                  onChange={(e) => setLogStatus(e.target.value)}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
                >
                  <option value="all">All status</option>
                  <option value="received">Received</option>
                  <option value="processed">Processed</option>
                  <option value="ignored">Ignored</option>
                  <option value="failed">Failed</option>
                </select>
                <Input
                  value={logFrom}
                  onChange={(e) => setLogFrom(e.target.value)}
                  type="date"
                  className="h-12 rounded-2xl"
                />
                <Input
                  value={logTo}
                  onChange={(e) => setLogTo(e.target.value)}
                  type="date"
                  className="h-12 rounded-2xl"
                />
              </div>
            </Card>
            {filteredNotifications.map((item) => {
              const bookingId = item.booking_id || getBookingIdFromOrderId(item.order_id);
              return (
                <Card key={item.id} className="rounded-[2rem] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-black">{item.order_id}</div>
                      <div className="text-sm text-slate-500">
                        {item.received_at} • {item.transaction_status || "-"} • {item.payment_type || "-"}
                      </div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {item.transaction_id || "-"} • {item.fraud_status || "-"}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={item.signature_valid ? "default" : "destructive"}
                        className="rounded-full uppercase"
                      >
                        {item.processing_status}
                      </Badge>
                      <div className="mt-2 font-black">
                        Rp {(item.gross_amount || 0).toLocaleString("id-ID")}
                      </div>
                      {bookingId ? (
                        <Link
                          href={`/${detail.slug}/admin/bookings/${bookingId}`}
                          className="mt-2 inline-flex rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                        >
                          Booking detail
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {item.error_message ? (
                    <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
                      {item.error_message}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </section>
        }
      />
    </main>
  );
}

function Tabs({
  overview,
  customers,
  transactions,
  logs,
}: {
  overview: ReactNode;
  customers: ReactNode;
  transactions: ReactNode;
  logs: ReactNode;
}) {
  const [active, setActive] = useState<"overview" | "customers" | "transactions" | "logs">("overview");
  const items = [
    { key: "overview" as const, label: "Overview" },
    { key: "customers" as const, label: "Customers" },
    { key: "transactions" as const, label: "Transactions" },
    { key: "logs" as const, label: "Midtrans Logs" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-[2rem] border border-slate-200 bg-white p-2">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => setActive(item.key)}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
              active === item.key ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {active === "overview" && overview}
      {active === "customers" && customers}
      {active === "transactions" && transactions}
      {active === "logs" && logs}
    </div>
  );
}

