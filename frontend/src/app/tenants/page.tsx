import { notFound, redirect } from "next/navigation";
import { DISCOVERY_PUBLIC_ENABLED } from "@/lib/feature-flags";

export default function LegacyTenantsRedirectPage() {
  if (!DISCOVERY_PUBLIC_ENABLED) notFound();
  redirect("/discovery");
}
