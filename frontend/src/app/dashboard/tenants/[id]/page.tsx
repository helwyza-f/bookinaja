"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { isAfter, isBefore, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Wallet,
  Users,
  CreditCard,
  CalendarCheck,
  Search,
  Mail,
  Phone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  StatCard,
  StatusPill,
  SectionCard,
  EmptyState,
  formatIDR,
  formatCompactIDR,
} from "@/components/platform/admin-kit";
import { formatPlanLabel, formatSubscriptionStatusLabel } from "@/lib/plan-access";
import {
  getPlatformTenantBalance,
  getPlatformTenantCustomers,
  getPlatformTenantDetail,
  setPlatformTenantPlan,
  getPlatformTenantNotifications,
  getPlatformTenantTransactions,
  type MidtransNotificationLog,
  type PlatformCustomer,
  type PlatformTenantBalance,
  type PlatformTenantDetail,
  type PlatformTransaction,
} from "@/lib/platform-admin";

const PLANS = ["free", "trial", "starter", "pro", "scale"] as const;
type Plan = (typeof PLANS)[number];

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;

  const [detail, setDetail] = useState<PlatformTenantDetail | null>(null);
  const [balance, setBalance] = useState<PlatformTenantBalance | null>(null);
  const [customers, setCustomers] = useState<PlatformCustomer[]>([]);
  const [transactions, setTransactions] = useState<PlatformTransaction[]>([]);
  const [notifications, setNotifications] = useState<MidtransNotificationLog[]>([]);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);

  const [customerQuery, setCustomerQuery] = useState("");
  const [transactionQuery, setTransactionQuery] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("all");
  const [transactionFrom, setTransactionFrom] = useState("");
  const [transactionTo, setTransactionTo] = useState("");
  const [logQuery, setLogQuery] = useState("");
  const [logStatus, setLogStatus] = useState("all");

  useEffect(() => {
    if (!tenantId) return;
    getPlatformTenantDetail(tenantId).then(setDetail);
    getPlatformTenantBalance(tenantId).then(setBalance);
    getPlatformTenantCustomers(tenantId).then((c) => setCustomers(Array.isArray(c) ? c : []));
    getPlatformTenantTransactions(tenantId).then((t) => setTransactions(Array.isArray(t) ? t : []));
    getPlatformTenantNotifications(tenantId).then((n) =>
      setNotifications(Array.isArray(n) ? n : []),
    );
  }, [tenantId]);

  const applyPlan = async (plan: Plan) => {
    if (!tenantId || savingPlan) return;
    setSavingPlan(plan);
    try {
      await setPlatformTenantPlan(tenantId, plan);
      const fresh = await getPlatformTenantDetail(tenantId);
      setDetail(fresh);
      toast.success(`Plan tenant diubah ke ${formatPlanLabel(plan)}`);
    } catch {
      toast.error("Gagal mengubah plan tenant");
    } finally {
      setSavingPlan(null);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    const q = customerQuery.toLowerCase();
    return customers.filter((item) =>
      [item.name, item.phone, item.email, item.tier].some((v) =>
        String(v || "").toLowerCase().includes(q),
      ),
    );
  }, [customerQuery, customers]);

  const filteredTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    const q = transactionQuery.toLowerCase();
    return transactions.filter((item) => {
      const created = item.created_at ? parseISO(item.created_at) : null;
      const passDate =
        (!transactionFrom || !created || !isBefore(created, parseISO(`${transactionFrom}T00:00:00`))) &&
        (!transactionTo || !created || !isAfter(created, parseISO(`${transactionTo}T23:59:59`)));
      const passStatus =
        transactionStatus === "all" ||
        (item.transaction_status || item.status || "").toLowerCase() === transactionStatus;
      const passQuery = [item.order_id, item.plan, item.source_type].some((v) =>
        String(v || "").toLowerCase().includes(q),
      );
      return passDate && passStatus && passQuery;
    });
  }, [transactionFrom, transactionQuery, transactionStatus, transactionTo, transactions]);

  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    const q = logQuery.toLowerCase();
    return notifications.filter((item) => {
      const passStatus =
        logStatus === "all" || (item.processing_status || "").toLowerCase() === logStatus;
      const passQuery = [item.order_id, item.transaction_id, item.transaction_status].some((v) =>
        String(v || "").toLowerCase().includes(q),
      );
      return passStatus && passQuery;
    });
  }, [logQuery, logStatus, notifications]);

  if (!detail) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <Link
          href="/dashboard/tenants"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <div className="mt-6 text-sm text-slate-400">Memuat detail tenant…</div>
      </main>
    );
  }

  const subscriptionRevenue = Number(detail.subscription_revenue || 0);
  const bookingBalance = Number(balance?.balance ?? detail.booking_revenue ?? 0);
  const currentPlan = (detail.plan || "").toLowerCase();

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard/tenants"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke tenant
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {detail.name}
              </h1>
              <StatusPill status={detail.status || detail.subscription_status} />
            </div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {detail.slug}
              {detail.owner_name ? ` · ${detail.owner_name}` : ""}
              {detail.owner_email ? ` · ${detail.owner_email}` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Subscription revenue"
          value={formatCompactIDR(subscriptionRevenue)}
          icon={CreditCard}
        />
        <StatCard label="Booking balance" value={formatCompactIDR(bookingBalance)} icon={Wallet} />
        <StatCard
          label="Customer"
          value={(detail.customers_count || 0).toLocaleString("id-ID")}
          icon={Users}
        />
        <StatCard
          label="Booking"
          value={(detail.bookings_count || 0).toLocaleString("id-ID")}
          icon={CalendarCheck}
        />
      </section>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="gap-4">
        <TabsList variant="line" className="h-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customer ({filteredCustomers.length})</TabsTrigger>
          <TabsTrigger value="transactions">Transaksi ({filteredTransactions.length})</TabsTrigger>
          <TabsTrigger value="logs">Log Midtrans ({filteredNotifications.length})</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Subscription">
              <dl className="space-y-3 text-sm">
                <Row label="Status">
                  <StatusPill
                    status={detail.status || detail.subscription_status}
                    label={formatSubscriptionStatusLabel(
                      detail.status || detail.subscription_status,
                    )}
                  />
                </Row>
                <Row label="Plan aktif">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatPlanLabel(detail.plan)}
                  </span>
                </Row>
                <Row label="Revenue subscription">
                  <span className="font-medium tabular-nums text-slate-900 dark:text-white">
                    {formatIDR(subscriptionRevenue)}
                  </span>
                </Row>
                <Row label="Booking balance">
                  <span className="font-medium tabular-nums text-slate-900 dark:text-white">
                    {formatIDR(bookingBalance)}
                  </span>
                </Row>
              </dl>
            </SectionCard>

            <SectionCard title="Ubah plan">
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                trial = 14 hari Pro · free = tanpa langganan · starter/pro/scale = aktif 30 hari.
              </p>
              <div className="flex flex-wrap gap-2">
                {PLANS.map((plan) => {
                  const isCurrent = currentPlan === plan;
                  return (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => applyPlan(plan)}
                      disabled={Boolean(savingPlan)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition disabled:opacity-50 ${
                        isCurrent
                          ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300"
                          : "border-[var(--admin-line)] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                      }`}
                    >
                      {savingPlan === plan ? "…" : plan}
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* Customers tab */}
        <TabsContent value="customers" className="space-y-4">
          <SectionCard bodyClassName="p-0">
            <div className="border-b border-[var(--admin-line-soft)] p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Cari customer…"
                  className="h-10 rounded-lg pl-9"
                />
              </div>
            </div>
            {filteredCustomers.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={Users} title="Belum ada customer" />
              </div>
            ) : (
              <Table className="rounded-none border-0 bg-transparent shadow-none">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead className="text-right">Kunjungan</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {item.name}
                        </div>
                        {item.tier ? (
                          <div className="text-xs capitalize text-slate-400">{item.tier}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col gap-0.5 text-xs">
                          {item.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {item.phone}
                            </span>
                          ) : null}
                          {item.email ? (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3 text-slate-400" />
                              {item.email}
                            </span>
                          ) : null}
                          {!item.phone && !item.email ? "—" : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {(item.visits || 0).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-slate-900 dark:text-white">
                        {formatIDR(item.spend)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </TabsContent>

        {/* Transactions tab */}
        <TabsContent value="transactions" className="space-y-4">
          <SectionCard bodyClassName="p-0">
            <div className="flex flex-col gap-2 border-b border-[var(--admin-line-soft)] p-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={transactionQuery}
                  onChange={(e) => setTransactionQuery(e.target.value)}
                  placeholder="Cari transaksi…"
                  className="h-10 rounded-lg pl-9"
                />
              </div>
              <Select value={transactionStatus} onValueChange={setTransactionStatus}>
                <SelectTrigger className="h-10 w-36 rounded-lg">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="settlement">Settlement</SelectItem>
                  <SelectItem value="capture">Capture</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={transactionFrom}
                onChange={(e) => setTransactionFrom(e.target.value)}
                type="date"
                className="h-10 w-36 rounded-lg"
              />
              <Input
                value={transactionTo}
                onChange={(e) => setTransactionTo(e.target.value)}
                type="date"
                className="h-10 w-36 rounded-lg"
              />
            </div>
            {filteredTransactions.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={CreditCard} title="Belum ada transaksi" />
              </div>
            ) : (
              <Table className="rounded-none border-0 bg-transparent shadow-none">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Sumber</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((item) => (
                    <TableRow key={`${item.id}-${item.created_at}`}>
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {item.order_id || item.code || item.id}
                      </TableCell>
                      <TableCell className="capitalize text-slate-600 dark:text-slate-300">
                        {item.source_type || "—"}
                      </TableCell>
                      <TableCell>
                        <StatusPill
                          status={String(item.transaction_status || item.status || "pending")}
                          label={String(item.transaction_status || item.status || "pending")}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-slate-900 dark:text-white">
                        {formatIDR(item.amount)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-400">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </TabsContent>

        {/* Logs tab */}
        <TabsContent value="logs" className="space-y-4">
          <SectionCard bodyClassName="p-0">
            <div className="flex flex-col gap-2 border-b border-[var(--admin-line-soft)] p-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={logQuery}
                  onChange={(e) => setLogQuery(e.target.value)}
                  placeholder="Cari log…"
                  className="h-10 rounded-lg pl-9"
                />
              </div>
              <Select value={logStatus} onValueChange={setLogStatus}>
                <SelectTrigger className="h-10 w-36 rounded-lg">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filteredNotifications.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={CreditCard} title="Belum ada log" />
              </div>
            ) : (
              <Table className="rounded-none border-0 bg-transparent shadow-none">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Transaksi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Diterima</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {item.order_id}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                        {item.transaction_id || "—"}
                        {item.payment_type ? ` · ${item.payment_type}` : ""}
                      </TableCell>
                      <TableCell>
                        <StatusPill
                          status={item.signature_valid ? "active" : "suspended"}
                          label={item.processing_status}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-slate-900 dark:text-white">
                        {formatIDR(item.gross_amount)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-400">
                        {item.received_at
                          ? new Date(item.received_at).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
