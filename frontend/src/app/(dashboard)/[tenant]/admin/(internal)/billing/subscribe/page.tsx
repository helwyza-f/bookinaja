import { redirect } from "next/navigation";

export default function BillingSubscribeRedirectPage() {
  redirect("/admin/settings/billing/subscribe");
}
