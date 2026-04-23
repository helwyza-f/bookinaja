"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  CalendarDays,
  Grid2x2,
  LayoutDashboard,
  MonitorPlay,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";

type MobileNavMode = "operational" | "owner" | "settings";

type MobileNavProps = {
  mode: MobileNavMode;
  role?: string;
};

const operationalItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarDays },
  { label: "POS", href: "/admin/pos", icon: MonitorPlay },
  { label: "Resources", href: "/admin/resources", icon: Grid2x2 },
  { label: "Customers", href: "/admin/customers", icon: Users },
];

const ownerItems = [
  { label: "Owner", href: "/admin/owner", icon: ShieldCheck },
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarDays },
  { label: "Reports", href: "/admin/settings/analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const settingsItems = [
  { label: "Business", href: "/admin/settings", icon: Grid2x2 },
  { label: "Staff", href: "/admin/settings/staff", icon: Users },
  { label: "CRM", href: "/admin/settings/crm", icon: ShoppingBag },
  { label: "Analytics", href: "/admin/settings/analytics", icon: BarChart3 },
  { label: "Billing", href: "/admin/settings/billing", icon: Wallet },
];

export function MobileNav({ mode, role }: MobileNavProps) {
  const pathname = usePathname();
  const items =
    mode === "owner"
      ? ownerItems
      : mode === "settings"
        ? settingsItems
        : role === "owner"
          ? [
              operationalItems[0],
              operationalItems[1],
              operationalItems[2],
              operationalItems[3],
              { label: "Owner", href: "/admin/owner", icon: ShieldCheck },
            ]
          : operationalItems;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden px-3 pb-3">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-[#080808]/95">
        <div className="grid grid-cols-5 gap-1">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-[1.1rem] px-2 py-2 transition-all",
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5",
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-[8px] font-black uppercase tracking-[0.18em] leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
