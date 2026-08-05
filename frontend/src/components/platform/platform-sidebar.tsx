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
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/revenue", label: "Revenue", icon: ChartColumn },
  { href: "/dashboard/tenants", label: "Tenants", icon: Building2 },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/dashboard/emails", label: "Emails", icon: Mail },
  { href: "/dashboard/discovery", label: "Discovery", icon: Sparkles },
  { href: "/dashboard/referral-withdrawals", label: "Referral Payout", icon: HandCoins },
  { href: "/dashboard/settings", label: "Settings", icon: ShieldCheck },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-[var(--admin-line)] bg-[var(--admin-surface)]">
      <div className="flex items-center gap-3 border-b border-[var(--admin-line-soft)] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Bookinaja</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Admin Center</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              <ChevronRight
                className={cn(
                  "ml-auto h-4 w-4 transition-opacity",
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-60",
                )}
              />
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--admin-line-soft)] p-3">
        <button
          onClick={() => {
            deleteCookie("auth_token");
            router.push("/login");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
