import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";

export default function AdminBookingsScreen() {
  return (
    <ScreenShell
      eyebrow="Admin Ops"
      title="Bookings"
      subtitle="List booking mobile akan fokus ke status, payment state, dan jalan masuk cepat ke booking controller."
    >
      <InfoCard
        label="Queue"
        value="Realtime booking list"
        hint="List akan dioptimalkan dengan FlashList dan targeted query invalidation."
      />
    </ScreenShell>
  );
}
