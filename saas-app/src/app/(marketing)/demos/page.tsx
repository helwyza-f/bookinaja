import type { Metadata } from "next";
import DemosPage from "./page.client";

export const metadata: Metadata = {
  title: "Live Demos — Bookinaja",
  description:
    "Eksplorasi demo live Bookinaja untuk berbagai industri: gaming rental, studio, sport/court booking, dan coworking/meeting room.",
  alternates: { canonical: "/demos" },
};

export default function Page() {
  return <DemosPage />;
}

