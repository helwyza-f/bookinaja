import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";

export default function AdminTodayScreen() {
  return (
    <ScreenShell
      eyebrow="Admin Ops"
      title="Hari Ini"
      subtitle="Today board akan menjadi entry utama untuk booking queue, sesi mendekat, verifikasi payment, dan aksi operasional cepat."
    >
      <InfoCard
        label="Next"
        value="Operational board"
        hint="Fase admin core nanti akan memprioritaskan actionable queue, bukan dashboard naratif."
      />
    </ScreenShell>
  );
}
