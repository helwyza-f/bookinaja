import type { Metadata } from "next";
import DocumentationPage from "./page.client";

export const metadata: Metadata = {
  title: "Documentation — Bookinaja",
  description:
    "Panduan lengkap platform Bookinaja: konsep tenant/subdomain, fitur inti, getting started, POS/kasir, billing subscription via Midtrans, dan ringkasan API internal.",
  alternates: { canonical: "/documentation" },
};

export default function Page() {
  return <DocumentationPage />;
}

