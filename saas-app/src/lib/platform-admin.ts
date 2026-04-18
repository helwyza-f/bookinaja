import api from "@/lib/api";

export type PlatformTenant = {
  id: string;
  name: string;
  slug: string;
  business_category?: string;
  business_type?: string;
  plan?: string;
  subscription_status?: string;
  subscription_current_period_start?: string;
  subscription_current_period_end?: string;
  address?: string;
  whatsapp_number?: string;
  instagram_url?: string;
  tiktok_url?: string;
  meta_title?: string;
  meta_description?: string;
  open_time?: string;
  close_time?: string;
  owner_name?: string;
  owner_email?: string;
  status?: "active" | "inactive" | "trial" | "suspended";
  customers_count?: number;
  transactions_count?: number;
  revenue?: number;
  last_activity?: string;
};

export type PlatformTenantDetail = PlatformTenant & {
  bookings_count?: number;
  subscription_current_period_start?: string;
  subscription_current_period_end?: string;
};

export type PlatformCustomer = {
  id: string;
  tenant_slug: string;
  tenant_name?: string;
  tenant_id?: string;
  name: string;
  phone?: string;
  email?: string;
  tier?: string;
  visits?: number;
  spend?: number;
  last_booking?: string;
  last_visit?: string;
  updated_at?: string;
};

export type PlatformTransaction = {
  db_id?: string;
  id: string;
  tenant_id?: string;
  tenant_slug: string;
  tenant_name?: string;
  code: string;
  order_id?: string;
  plan?: string;
  billing_interval?: string;
  amount: number;
  currency?: string;
  status: string;
  created_at: string;
  updated_at?: string;
};

export type PlatformTenantBalance = {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  owner_name: string;
  owner_email: string;
  balance: number;
  pending_credit: number;
  pending_debit: number;
  ledger_entries: number;
  last_ledger_at?: string;
};

export type MidtransNotificationLog = {
  id: string;
  tenant_id?: string;
  booking_id?: string;
  tenant_slug?: string;
  tenant_name?: string;
  order_id: string;
  transaction_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  gross_amount: number;
  signature_valid: boolean;
  processing_status: string;
  error_message?: string;
  received_at: string;
  processed_at?: string;
};

export type PlatformRevenueBreakdown = {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  owner_name: string;
  owner_email: string;
  revenue: number;
  paid_orders: number;
  pending_orders: number;
};

export type PlatformRevenuePoint = {
  period: string;
  revenue: number;
  cashflow: number;
  orders: number;
};

const mockTenants: PlatformTenant[] = [
  {
    id: "tenant_001",
    name: "Bookinaja Playzone",
    slug: "playzone",
    owner_email: "owner@playzone.id",
    status: "active",
    customers_count: 428,
    transactions_count: 1842,
    revenue: 125400000,
    last_activity: "2 menit lalu",
  },
  {
    id: "tenant_002",
    name: "Mini Golf Arena",
    slug: "minigolf",
    owner_email: "admin@minigolf.id",
    status: "trial",
    customers_count: 114,
    transactions_count: 312,
    revenue: 28750000,
    last_activity: "18 menit lalu",
  },
];

const mockCustomers: PlatformCustomer[] = [
  { id: "cust_001", tenant_slug: "playzone", name: "Fahry", phone: "08xxxx", visits: 16, spend: 2450000, last_booking: "2026-04-17" },
  { id: "cust_002", tenant_slug: "playzone", name: "Salsa", phone: "08yyyy", visits: 8, spend: 960000, last_booking: "2026-04-16" },
];

const mockTransactions: PlatformTransaction[] = [
  { id: "txn_001", tenant_slug: "playzone", code: "BKJ-20260417-01", amount: 180000, status: "settlement", created_at: "2026-04-17T08:15:00Z" },
  { id: "txn_002", tenant_slug: "minigolf", code: "BKJ-20260417-02", amount: 90000, status: "pending", created_at: "2026-04-17T07:40:00Z" },
];

async function safeGet<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await api.get(url);
    return (res.data?.data ?? res.data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export async function getPlatformSummary() {
  const [tenants, customers, transactions] = await Promise.all([
    getPlatformTenants(),
    getPlatformCustomers(),
    getPlatformTransactions(),
  ]);

  return {
    tenants,
    customers,
    transactions,
    totals: {
      tenants: tenants.length,
      activeTenants: tenants.filter((t) => t.status === "active").length,
      customers: customers.length,
      transactions: transactions.length,
      revenue: transactions.reduce((sum, item) => sum + item.amount, 0),
    },
  };
}

export function getPlatformTenants() {
  return safeGet<PlatformTenant[]>("/platform/tenants", mockTenants);
}

export function getPlatformTenantDetail(tenantId: string) {
  return safeGet<PlatformTenantDetail>(`/platform/tenants/${tenantId}`, {
    id: tenantId,
    name: "",
    slug: "",
  });
}

export function getPlatformTenantCustomers(tenantId: string) {
  return safeGet<PlatformCustomer[]>(`/platform/tenants/${tenantId}/customers`, []);
}

export function getPlatformTenantTransactions(tenantId: string) {
  return safeGet<PlatformTransaction[]>(`/platform/tenants/${tenantId}/transactions`, []);
}

export function getPlatformTenantNotifications(tenantId: string, limit = 100) {
  return safeGet<MidtransNotificationLog[]>(
    `/platform/tenants/${tenantId}/notif-history?limit=${limit}`,
    [],
  );
}

export function getPlatformCustomers() {
  return safeGet<PlatformCustomer[]>("/platform/customers", mockCustomers);
}

export function getPlatformTransactions() {
  return safeGet<PlatformTransaction[]>("/platform/transactions", mockTransactions);
}

export function getPlatformRevenue(params?: { tenant?: string; from?: string; to?: string }) {
  const search = new URLSearchParams();
  if (params?.tenant) search.set("tenant", params.tenant);
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return safeGet<Record<string, number>>(`/platform/revenue${suffix}`, {
    revenue: 0,
    pending_cashflow: 0,
    transactions: 0,
    paid_transactions: 0,
    pending_transactions: 0,
  });
}

export function getPlatformRevenueBreakdown(params?: { from?: string; to?: string }) {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return safeGet<PlatformRevenueBreakdown[]>(`/platform/revenue/breakdown${suffix}`, []);
}

export function getPlatformRevenueTimeseries(params?: {
  tenant?: string;
  interval?: "week" | "month";
  from?: string;
  to?: string;
}) {
  const search = new URLSearchParams();
  if (params?.tenant) search.set("tenant", params.tenant);
  if (params?.interval) search.set("interval", params.interval);
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return safeGet<PlatformRevenuePoint[]>(`/platform/revenue/timeseries${suffix}`, []);
}

export function getPlatformRevenueCSVUrl(params?: { tenant?: string; from?: string; to?: string }) {
  const search = new URLSearchParams();
  if (params?.tenant) search.set("tenant", params.tenant);
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  return `/platform/revenue/export${search.toString() ? `?${search.toString()}` : ""}`;
}

export function getPlatformTenantBalances() {
  return safeGet<PlatformTenantBalance[]>("/platform/tenants/balances", []);
}

export function getPlatformTenantBalance(tenantId: string) {
  return safeGet<PlatformTenantBalance>(`/platform/tenants/${tenantId}/balance`, {
    tenant_id: tenantId,
    tenant_slug: "",
    tenant_name: "",
    owner_name: "",
    owner_email: "",
    balance: 0,
    pending_credit: 0,
    pending_debit: 0,
    ledger_entries: 0,
  });
}

export function getMidtransNotificationLogs(params?: { tenant?: string; limit?: number }) {
  const search = new URLSearchParams();
  if (params?.tenant) search.set("tenant", params.tenant);
  if (params?.limit) search.set("limit", String(params.limit));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return safeGet<MidtransNotificationLog[]>(`/platform/midtrans-notifications${suffix}`, []);
}
