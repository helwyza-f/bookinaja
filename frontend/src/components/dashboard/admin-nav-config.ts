import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  Link2,
  Printer,
  Grid2x2,
  LayoutDashboard,
  Megaphone,
  MonitorPlay,
  Users,
  UsersRound,
  Banknote,
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
  { label: "Pengeluaran", icon: Banknote, href: "/admin/expenses" },
  { label: "Customers", icon: Users, href: "/admin/customers" },
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
  {
    label: "Nota & Printer",
    href: "/admin/settings/nota",
    icon: Printer,
    hint: "Struk, WhatsApp, printer",
  },
  {
    label: "Referral",
    href: "/admin/settings/referral",
    icon: Link2,
    hint: "Kode referral & bonus",
  },
];
