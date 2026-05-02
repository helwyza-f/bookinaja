import { redirect } from "next/navigation";

export default function LegacyTenantsRedirectPage() {
  redirect("/discovery");
}
