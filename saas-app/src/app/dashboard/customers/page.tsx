"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, UserRound, Phone, Coins, Mail, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPlatformCustomers, getPlatformTenants, type PlatformCustomer, type PlatformTenant } from "@/lib/platform-admin";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<PlatformCustomer[]>([]);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [query, setQuery] = useState("");
  const params = useSearchParams();
  const initialTenant = params.get("tenant") || "all";
  const [tenantFilter, setTenantFilter] = useState(initialTenant);

  useEffect(() => {
    getPlatformCustomers().then(setCustomers);
    getPlatformTenants().then(setTenants);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return customers.filter((customer) => {
      const matchesTenant = tenantFilter === "all" || customer.tenant_slug === tenantFilter;
      const matchesQuery = [
        customer.name,
        customer.phone,
        customer.email,
        customer.tenant_slug,
        customer.tier,
      ].some((v) => (v || "").toLowerCase().includes(q));
      return matchesTenant && matchesQuery;
    });
  }, [customers, query, tenantFilter]);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">
          CRM snapshot
        </div>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">Customers</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <Card className="rounded-[2rem] p-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer..."
              className="h-12 rounded-2xl pl-11"
            />
          </div>
        </Card>
        <Card className="rounded-[2rem] p-5">
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue placeholder="Filter tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.slug}>
                  {tenant.slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((customer) => (
          <Card key={`${customer.id}-${customer.tenant_slug}`} className="rounded-[2rem] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black">{customer.name}</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <Phone className="h-4 w-4" />
                  {customer.phone || "-"}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="h-4 w-4" />
                  {customer.email || "-"}
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <Building2 className="mr-1 inline h-3 w-3" />
                  {customer.tenant_name || customer.tenant_slug}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                  <Coins className="h-4 w-4 text-emerald-500" />
                  Rp {(customer.spend || 0).toLocaleString("id-ID")} • {customer.visits || 0} visits
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  Tier: {customer.tier || "-"} • Last visit: {customer.last_visit || "-"}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}

