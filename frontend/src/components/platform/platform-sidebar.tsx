"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { deleteCookie } from "cookies-next";
import {
  LayoutDashboard,
  Building2,
  Users,
  ReceiptText,
  ChartColumn,
  ShieldCheck,
  HandCoins,
  Sparkles,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/revenue", label: "Revenue", icon: ChartColumn },
  { href: "/dashboard/tenants", label: "Tenants", icon: Building2 },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/dashboard/discovery", label: "Discovery", icon: Sparkles },
  { href: "/dashboard/referral-withdrawals", label: "Referral Payout", icon: HandCoins },
  { href: "/dashboard/settings", label: "Settings", icon: ShieldCheck },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-20 items-center justify-between border-b border-slate-200 px-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">
            Bookinaja
          </div>
          <div className="text-sm font-black uppercase tracking-tight text-slate-900">
            Admin Center
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-2xl px-4 py-3 transition-colors",
                active
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
              <ChevronRight className={cn("h-4 w-4 transition-transform", active ? "translate-x-0" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100")} />
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <button
          onClick={() => {
            deleteCookie("auth_token");
            router.push("/login");
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
