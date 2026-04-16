"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type CustomerRow = {
  id: string;
  tenant_slug: string;
  tenant_name: string;
  name: string;
  phone: string;
  tier: string;
  total_visits: number;
  total_spent: number;
};

export default function DashboardCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/platform/customers", { params: { limit: 50 } });
        setCustomers(res.data?.customers || []);
      } catch (error: unknown) {
        const message =
          typeof error === "object" && error && "response" in error
            ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
            : null;
        toast.error(message || "Gagal memuat customer global");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () =>
      customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(query.toLowerCase()) ||
          customer.phone.includes(query) ||
          customer.tenant_slug.toLowerCase().includes(query.toLowerCase()),
      ),
    [customers, query],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Platform CRM</div>
          <h1 className="text-3xl font-black tracking-tight">Global Customers</h1>
        </div>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, tenant..." className="max-w-md" />
      </div>
      <Card className="overflow-hidden rounded-[2rem] p-4">
        <div className="space-y-3">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : filtered.map((customer) => (
            <div key={customer.id} className="rounded-2xl border p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold">{customer.name}</div>
                <div className="text-xs text-muted-foreground">{customer.phone} · {customer.tenant_name} ({customer.tenant_slug})</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{customer.tier}</Badge>
                <span className="text-xs text-muted-foreground">{new Intl.NumberFormat("id-ID").format(customer.total_spent)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
