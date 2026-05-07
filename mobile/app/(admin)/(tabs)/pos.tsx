import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";

export default function AdminPosScreen() {
  return (
    <ScreenShell
      eyebrow="Admin Ops"
      title="POS"
      subtitle="POS di mobile akan dibuat sebagai quick operational actions: active sessions, F&B add, add-on add, dan pelunasan."
    >
      <InfoCard
        label="POS"
        value="Quick actions"
        hint="Surface ini tidak akan membawa semua kompleksitas POS desktop, hanya yang paling operasional."
      />
    </ScreenShell>
  );
}
