import { redirect } from "next/navigation";

export default function BusinessSettingsRedirectPage() {
  redirect("/admin/settings/page-builder?workspace=content");
}
