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
  type MidtransNotificationLog,
  type PlatformCustomer,
  type PlatformTenantBalance,
  type PlatformTenantDetail,
  type PlatformTransaction,
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
  const [transactionType, setTransactionType] = useState("all");
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
    return customers.filter((item) => {
      const tierOk =
        customerTier === "all" || (item.tier || "").toLowerCase() === customerTier;
      const queryOk = [item.name, item.phone, item.email, item.tier, item.tenant_name].some((v) =>
        String(v || "").toLowerCase().includes(q),
      );
      return tierOk && queryOk;
    });
  }, [customerQuery, customerTier, customers]);

  const filteredTransactions = useMemo(() => {
    const q = transactionQuery.toLowerCase();
    return transactions.filter((item) => {
      const created = item.created_at ? parseISO(item.created_at) : null;
      const passDate =
        (!transactionFrom || !created || !isBefore(created, parseISO(`${transactionFrom}T00:00:00`))) &&
        (!transactionTo || !created || !isAfter(created, parseISO(`${transactionTo}T23:59:59`)));
      const passType =
        transactionType === "all" || (item.source_type || "unknown") === transactionType;
      const passStatus =
        transactionStatus === "all" ||
        (item.transaction_status || item.status || "").toLowerCase() === transactionStatus;
      const passQuery = [item.order_id, item.plan, item.billing_interval, item.source_type].some((v) =>
        String(v || "").toLowerCase().includes(q),
      );
      return passDate && passType && passStatus && passQuery;
    });
  }, [transactionFrom, transactionQuery, transactionStatus, transactionTo, transactionType, transactions]);

  const filteredNotifications = useMemo(() => {
    const q = logQuery.toLowerCase();
    return notifications.filter((item) => {
      const received = item.received_at ? parseISO(item.received_at) : null;
      const passDate =
        (!logFrom || !received || !isBefore(received, parseISO(`${logFrom}T00:00:00`))) &&
        (!logTo || !received || !isAfter(received, parseISO(`${logTo}T23:59:59`)));
      const passStatus =
        logStatus === "all" || (item.processing_status || "").toLowerCase() === logStatus;
      const passQuery = [item.order_id, item.transaction_id, item.transaction_status, item.source_type].some(
        (v) => String(v || "").toLowerCase().includes(q),
      );
      return passDate && passStatus && passQuery;
    });
  }, [logFrom, logQuery, logStatus, logTo, notifications]);

  if (!detail) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="text-sm text-slate-500">Loading tenant detail...</div>
      </main>
    );
  }

  const subscriptionRevenue = Number(detail.subscription_revenue || 0);
  const bookingBalance = Number(balance?.balance ?? detail.booking_revenue ?? 0);
  const bookingTransactions = Number(detail.booking_transactions_count || 0);

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
          <section className="space-y-4">
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
                placeholder="Search summary..."
                className="h-12 rounded-2xl"
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Subscription Revenue", `Rp ${subscriptionRevenue.toLocaleString("id-ID")}`],
                  ["Booking Balance", `Rp ${bookingBalance.toLocaleString("id-ID")}`],
                  ["Customers", String(detail.customers_count || 0)],
                  ["Booking Tx", String(bookingTransactions)],
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
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Subscription
                  </div>
                  <div className="mt-2 text-xl font-black">{detail.subscription_status || "-"}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Plan: {detail.plan || "-"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Booking balance
                  </div>
                  <div className="mt-2 text-xl font-black">
                    Rp {bookingBalance.toLocaleString("id-ID")}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Saldo tenant yang masih tersimpan di Bookinaja.
                  </div>
                </div>
              </div>
            </Card>
          </section>
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
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {item.tier || "unknown"} • {item.tenant_name || detail.name}
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
              <div className="grid gap-3 md:grid-cols-5">
                <Input
                  value={transactionQuery}
                  onChange={(e) => setTransactionQuery(e.target.value)}
                  placeholder="Search transaction..."
                  className="h-12 rounded-2xl"
                />
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
                >
                  <option value="all">All source</option>
                  <option value="subscription">Subscription</option>
                  <option value="booking">Booking</option>
                </select>
                <select
                  value={transactionStatus}
                  onChange={(e) => setTransactionStatus(e.target.value)}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
                >
                  <option value="all">All status</option>
                  <option value="pending">Pending</option>
                  <option value="settlement">Settlement</option>
                  <option value="capture">Capture</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <Input value={transactionFrom} onChange={(e) => setTransactionFrom(e.target.value)} type="date" className="h-12 rounded-2xl" />
                <Input value={transactionTo} onChange={(e) => setTransactionTo(e.target.value)} type="date" className="h-12 rounded-2xl" />
              </div>
            </Card>
            {filteredTransactions.map((item) => (
              <Card key={`${item.id}-${item.created_at}`} className="rounded-[2rem] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-black">{item.order_id}</div>
                    <div className="text-sm text-slate-500">
                      {(item.source_type || "unknown").toUpperCase()} • {item.plan || item.billing_interval || "-"} • {item.created_at}
                    </div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {item.transaction_status || item.status || "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="rounded-full uppercase">
                      {item.source_type || "unknown"}
                    </Badge>
                    <div className="mt-2 font-black">
                      Rp {(item.amount || 0).toLocaleString("id-ID")}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
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
                <Input value={logFrom} onChange={(e) => setLogFrom(e.target.value)} type="date" className="h-12 rounded-2xl" />
                <Input value={logTo} onChange={(e) => setLogTo(e.target.value)} type="date" className="h-12 rounded-2xl" />
              </div>
            </Card>
            {filteredNotifications.map((item) => (
              <Card key={item.id} className="rounded-[2rem] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-black">{item.order_id}</div>
                    <div className="text-sm text-slate-500">
                      {item.received_at} • {item.transaction_status || "-"} • {item.payment_type || "-"}
                    </div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {item.transaction_id || "-"} • {item.fraud_status || "-"} • {item.source_type || "unknown"}
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
                  </div>
                </div>
                {item.error_message ? (
                  <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
                    {item.error_message}
                  </div>
                ) : null}
              </Card>
            ))}
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
