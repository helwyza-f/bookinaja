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
    <aside className="flex h-full w-72 flex-col border-r border-slate-200/80 bg-white/86 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1220]/82">
      <div className="border-b border-slate-200/80 px-6 py-5 dark:border-white/10">
        <div className="relative overflow-hidden rounded-[1.8rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_58%,#0ea5e9_100%)] p-4 text-white shadow-[0_24px_70px_rgba(37,99,235,0.28)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_30%)]" />
          <div className="relative flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-100">
            Bookinaja
          </div>
          <div className="text-sm font-black uppercase tracking-tight text-white">
            Admin Center
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/14 text-white ring-1 ring-white/20 backdrop-blur">
          <ShieldCheck className="h-5 w-5" />
        </div>
          </div>
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
                "group flex items-center justify-between rounded-2xl border px-4 py-3 transition-all",
                active
                  ? "border-blue-500/20 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_58%,#0ea5e9_100%)] text-white shadow-[0_20px_50px_rgba(37,99,235,0.24)]"
                  : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-white/80 hover:text-slate-900 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/[0.04]",
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

      <div className="border-t border-slate-200/80 p-4 dark:border-white/10">
        <button
          onClick={() => {
            deleteCookie("auth_token");
            router.push("/login");
          }}
          className="flex w-full items-center gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100/80 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
