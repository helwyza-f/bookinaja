import api from "@/lib/api";

export type PlatformTenant = {
  id: string;
  name: string;
  slug: string;
  owner_email?: string;
  status?: "active" | "inactive" | "trial" | "suspended";
  customers_count?: number;
  transactions_count?: number;
  revenue?: number;
  last_activity?: string;
};

export type PlatformCustomer = {
  id: string;
  tenant_slug: string;
  name: string;
  phone?: string;
  visits?: number;
  spend?: number;
  last_booking?: string;
};

export type PlatformTransaction = {
  id: string;
  tenant_slug: string;
  code: string;
  amount: number;
  status: string;
  created_at: string;
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

export function getPlatformCustomers() {
  return safeGet<PlatformCustomer[]>("/platform/customers", mockCustomers);
}

export function getPlatformTransactions() {
  return safeGet<PlatformTransaction[]>("/platform/transactions", mockTransactions);
}
