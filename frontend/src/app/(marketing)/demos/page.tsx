import type { Metadata } from "next";
import DemosPage from "./page.client";

export const metadata: Metadata = {
  title: "Live Demos | Bookinaja",
  description:
    "Demo live Bookinaja untuk gaming rental, studio, sport/court booking, dan coworking/meeting room. Setiap demo menampilkan credential login yang bisa langsung dipakai.",
  alternates: { canonical: "/demos" },
};

export default function Page() {
  return <DemosPage />;
}
