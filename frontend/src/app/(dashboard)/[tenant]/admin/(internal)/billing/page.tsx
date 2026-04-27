import { redirect } from "next/navigation";

export default function BillingRedirectPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const hasPlan = typeof searchParams?.plan === "string";
  const hasInterval = typeof searchParams?.interval === "string";

  if (hasPlan || hasInterval) {
    const qp = new URLSearchParams();
    if (hasPlan) qp.set("plan", String(searchParams?.plan));
    if (hasInterval) qp.set("interval", String(searchParams?.interval));
    redirect(`/admin/settings/billing/subscribe?${qp.toString()}`);
  }

  redirect("/admin/settings/billing");
}
