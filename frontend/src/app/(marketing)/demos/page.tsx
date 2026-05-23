import type { Metadata } from "next";
import DemosPage from "./page.client";

export const metadata: Metadata = {
  title: "Demo per Jenis Bisnis | Bookinaja",
  description:
    "Pilih demo Bookinaja yang paling dekat dengan bisnis kamu: gaming rental, studio creative, sport courts, atau office space.",
  alternates: { canonical: "/demos" },
};

export default function Page() {
  return <DemosPage />;
}
