import { PlatformAdminShell } from "@/components/admin/platform-admin-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformAdminShell>{children}</PlatformAdminShell>;
}
