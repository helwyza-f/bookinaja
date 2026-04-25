import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  Grid2x2,
  LayoutDashboard,
  Megaphone,
  MonitorPlay,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  hint?: string;
};

export const operationalNavItems: AdminNavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Bookings", icon: CalendarDays, href: "/admin/bookings" },
  { label: "POS / Kasir", icon: MonitorPlay, href: "/admin/pos" },
  { label: "Resources", icon: Grid2x2, href: "/admin/resources" },
  { label: "F&B / Menu", icon: Utensils, href: "/admin/fnb" },
  { label: "Customers", icon: Users, href: "/admin/customers" },
];

export const ownerNavItems: AdminNavItem[] = [
  { label: "Owner", href: "/admin/owner", icon: ShieldCheck },
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarDays },
  { label: "Reports", href: "/admin/settings/analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export const settingsNavItems: AdminNavItem[] = [
  {
    label: "Konfigurasi Bisnis",
    href: "/admin/settings/bisnis",
    icon: BriefcaseBusiness,
    hint: "Brand, SEO, landing",
  },
  {
    label: "Manajemen Pegawai",
    href: "/admin/settings/staff",
    icon: UsersRound,
    hint: "Staff, RBAC, aktivitas",
  },
  {
    label: "CRM & Marketing",
    href: "/admin/settings/crm",
    icon: Megaphone,
    hint: "Migrasi & blast WA",
  },
  {
    label: "Laporan & Analitik",
    href: "/admin/settings/analytics",
    icon: BarChart3,
    hint: "Grafik & export",
  },
  {
    label: "Subscription & Billing",
    href: "/admin/settings/billing",
    icon: CreditCard,
    hint: "Paket SaaS & Midtrans",
  },
];
