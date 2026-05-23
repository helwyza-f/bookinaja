import { redirect } from "next/navigation";
import { getCentralAdminAuthUrl } from "@/lib/tenant";

type TenantAdminLoginPageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    next?: string;
    reason?: string;
    plan?: string;
    interval?: string;
    welcome?: string;
  }>;
};

export default async function TenantAdminLoginPage({
  params,
  searchParams,
}: TenantAdminLoginPageProps) {
  const { tenant } = await params;
  const qp = await searchParams;

  redirect(
    getCentralAdminAuthUrl({
      tenantSlug: tenant,
      next: qp.next || "/admin/dashboard",
      reason: qp.reason,
      plan: qp.plan,
      interval: qp.interval,
      welcome: qp.welcome,
    }),
  );
}
