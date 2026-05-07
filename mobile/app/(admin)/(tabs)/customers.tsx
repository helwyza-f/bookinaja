import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";

export default function AdminCustomersScreen() {
  return (
    <ScreenShell
      eyebrow="Admin Ops"
      title="Customers"
      subtitle="Customer tab akan fokus ke lookup, booking history singkat, dan konteks operasional yang dibutuhkan admin."
    >
      <InfoCard
        label="Lookup"
        value="Customer search"
        hint="Phase lanjut akan menyambungkan screen ini ke list customer dan detail lite."
      />
    </ScreenShell>
  );
}
