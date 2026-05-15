import type { Metadata } from "next";
import PricingPage from "./page.client";

export const metadata: Metadata = {
  title: "Pricing - Bookinaja",
  description:
    "Pilih paket Bookinaja untuk mulai lebih rapi, lebih tenang, dan lebih siap berkembang. Mulai dari Free Trial 30 hari, lalu lanjut ke Starter, Pro, atau Scale sesuai tahap bisnismu.",
  alternates: { canonical: "/pricing" },
};

export default function Page() {
  return <PricingPage />;
}
