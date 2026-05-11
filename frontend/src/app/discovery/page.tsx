import DiscoveryPageClient from "./discovery-page-client";
import type { DiscoveryFeedResponse } from "@/lib/discovery";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
