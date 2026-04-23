import type { Metadata } from "next";
import PricingPage from "./page.client";

export const metadata: Metadata = {
  title: "Pricing — Bookinaja",
  description:
    "Pilih paket Bookinaja untuk kebutuhan bisnis persewaan: free trial 30 hari, Starter, atau Pro. Billing fleksibel bulanan/tahunan, aktivasi cepat via Midtrans.",
  alternates: { canonical: "/pricing" },
};

export default function Page() {
  return <PricingPage />;
}
