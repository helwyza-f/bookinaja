import {
  Banknote,
  CalendarRange,
  ClipboardList,
  CreditCard,
  Grid2x2,
  LayoutDashboard,
  MonitorPlay,
  Settings,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export type ShellNavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export type ShellUtilityItem = {
  key: "upgrade" | "settings";
  label: string;
  icon: LucideIcon;
};

export const primaryShellNavItems: ShellNavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "calendar", label: "Kalender", href: "/admin/bookings/calendar", icon: CalendarRange },
  { key: "bookings", label: "Bookings", href: "/admin/bookings", icon: ClipboardList },
  { key: "pos", label: "POS", href: "/admin/pos", icon: MonitorPlay },
  { key: "resources", label: "Resources", href: "/admin/resources", icon: Grid2x2 },
  { key: "menu", label: "Menu", href: "/admin/fnb", icon: Utensils },
  { key: "expenses", label: "Pengeluaran", href: "/admin/expenses", icon: Banknote },
  { key: "customers", label: "Customers", href: "/admin/customers", icon: Users },
];

export const shellUtilityItems: ShellUtilityItem[] = [
  { key: "upgrade", label: "Upgrade", icon: CreditCard },
  { key: "settings", label: "Settings", icon: Settings },
];

export function getSettingsDefaultRoute() {
  return "/admin/settings/akun";
}

export function getWorkspaceFallbackRoute() {
  return "/admin/dashboard";
}
