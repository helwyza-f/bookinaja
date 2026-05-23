import DiscoveryPageClient from "./discovery-page-client";
import type { DiscoveryFeedResponse } from "@/lib/discovery";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Jelajah Bisnis | Bookinaja",
  description:
    "Lihat website bisnis yang sudah memakai Bookinaja, cari kategori yang cocok, lalu buka halaman booking tenant.",
  alternates: { canonical: "/discovery" },
};

async function getInitialDiscoveryFeed(): Promise<DiscoveryFeedResponse | null> {
  const apiURL =
    process.env.NEXT_PUBLIC_API_URL || "http://api.bookinaja.local:8080/api/v1";

  try {
    const res = await fetch(`${apiURL}/public/discover/feed`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as DiscoveryFeedResponse;
  } catch {
    return null;
  }
}

export default async function DiscoveryPage() {
  const initialFeed = await getInitialDiscoveryFeed();
  return <DiscoveryPageClient initialFeed={initialFeed} />;
}
