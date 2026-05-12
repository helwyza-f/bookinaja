import type { Metadata } from "next";
import PricingPage from "./page.client";

export const metadata: Metadata = {
  title: "Pricing - Bookinaja",
  description:
    "Pilih paket Bookinaja untuk kebutuhan bisnis booking: Free Trial 30 hari, Starter, Pro, dan Scale yang segera hadir. Fokus sekarang ada di operasional yang makin rapi dan kontrol tim yang lebih kuat.",
  alternates: { canonical: "/pricing" },
};

export default function Page() {
  return <PricingPage />;
}
