"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">
          Platform controls
        </div>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">Settings</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-[2rem] p-6">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-slate-500">
            Access rules
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Root domain hanya untuk platform admin. Tenant slug tetap dipakai untuk
            {" "}
            <span className="font-mono">https://{"{tenant}"}.bookinaja.com</span> dan
            tidak boleh dipakai di <span className="font-mono">bookinaja.com</span>.
          </p>
        </Card>
        <Card className="rounded-[2rem] p-6">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-slate-500">
            Backend status
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full uppercase">platform login</Badge>
            <Badge variant="outline" className="rounded-full uppercase">summary</Badge>
            <Badge variant="outline" className="rounded-full uppercase">tenants</Badge>
            <Badge variant="outline" className="rounded-full uppercase">customers</Badge>
            <Badge variant="outline" className="rounded-full uppercase">transactions</Badge>
          </div>
        </Card>
      </div>
    </main>
  );
}
