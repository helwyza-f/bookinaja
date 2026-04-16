import type { Metadata } from "next";
import FAQPage from "./page.client";

export const metadata: Metadata = {
  title: "FAQ — Bookinaja",
  description:
    "Jawaban cepat seputar Bookinaja: tenant/subdomain, booking, POS, billing Midtrans, keamanan, dan dukungan.",
  alternates: { canonical: "/faq" },
};

export default function Page() {
  return <FAQPage />;
}

