import type { Metadata } from "next";
import LandingPage from "./page.client";

export const metadata: Metadata = {
  title: "Bookinaja — Sistem Operasi Bisnis Persewaan",
  description:
    "Kelola booking, unit/resource, POS/kasir, dan staff dalam satu platform SaaS berbasis tenant (subdomain). Terima pembayaran digital dan pantau bisnis secara realtime.",
  alternates: { canonical: "/" },
};

export default function Page() {
  return <LandingPage />;
}

