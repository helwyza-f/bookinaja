import type { Metadata } from "next";
import PricingPage from "./page.client";

export const metadata: Metadata = {
  title: "Pricing — Bookinaja",
  description:
    "Pilih paket Bookinaja untuk kebutuhan bisnis persewaan: trial 30 hari, Starter, Pro, atau Scale. Billing fleksibel bulanan atau tahunan untuk operasional yang makin rapi.",
  alternates: { canonical: "/pricing" },
};

export default function Page() {
  return <PricingPage />;
}
