"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type { DiscoveryFeedResponse } from "@/lib/discovery";
import {
  defaultTenantProfile,
  type TenantProfile,
} from "../../admin/(internal)/settings/bisnis/sections/types";
import {
  buildGrowthPostDrafts,
  type GrowthPostRecord,
  getGrowthHealth,
  getMarketplaceFeedEntries,
  getMarketplaceSamples,
} from "./growth-data";

export function useGrowthWorkspace() {
  const [profile, setProfile] = useState<TenantProfile>(defaultTenantProfile);
  const [marketplaceFeed, setMarketplaceFeed] = useState<DiscoveryFeedResponse | null>(null);
  const [posts, setPosts] = useState<GrowthPostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, feedRes, postsRes] = await Promise.all([
        api.get("/admin/profile"),
        api.get("/admin/growth/feed").catch(() => ({ data: null })),
        api.get("/admin/growth/posts").catch(() => ({ data: { items: [] } })),
      ]);
      setProfile({ ...defaultTenantProfile, ...profileRes.data });
      setMarketplaceFeed(feedRes.data || null);
      setPosts(postsRes.data?.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const growthHealth = useMemo(() => getGrowthHealth(profile), [profile]);
  const drafts = useMemo(
    () => buildGrowthPostDrafts(profile, marketplaceFeed, posts),
    [profile, marketplaceFeed, posts],
  );
  const marketplaceSamples = useMemo(
    () => getMarketplaceSamples(marketplaceFeed, 8),
    [marketplaceFeed],
  );
  const feedEntries = useMemo(
    () => getMarketplaceFeedEntries(marketplaceFeed, 20),
    [marketplaceFeed],
  );

  return {
    profile,
    setProfile,
    marketplaceFeed,
    posts,
    marketplaceSamples,
    feedEntries,
    growthHealth,
    drafts,
    loading,
    reload,
  };
}
