"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { RealtimeEvent } from "@/lib/realtime/event-types";
import { getRealtimeManager } from "@/lib/realtime/manager";

type UseRealtimeOptions = {
  enabled?: boolean;
  channels: string[];
  onEvent?: (event: RealtimeEvent) => void;
  onReconnect?: () => void;
};

export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting";

export function useRealtime({
  enabled = true,
  channels,
  onEvent,
  onReconnect,
}: UseRealtimeOptions) {
  const subscriptionIDRef = useRef(`rt-${Math.random().toString(36).slice(2)}`);
  const normalizedChannels = Array.from(
    new Set(channels.map((channel) => channel.trim()).filter(Boolean)),
  ).sort();
  const channelKey = normalizedChannels.join("|");
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<RealtimeStatus>(
    enabled && normalizedChannels.length > 0 ? "connecting" : "idle",
  );
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const handleEvent = useEffectEvent((event: RealtimeEvent) => {
    onEvent?.(event);
  });
  const handleReconnect = useEffectEvent(() => {
    onReconnect?.();
  });

  useEffect(() => {
    const manager = getRealtimeManager();
    return manager.listenStatus((snapshot) => {
      setConnected(snapshot.connected);
      setStatus(snapshot.status);
    });
  }, []);

  useEffect(() => {
    const channelsForEffect = channelKey ? channelKey.split("|") : [];

    if (!enabled || channelsForEffect.length === 0) {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setConnected(false);
      setStatus("idle");
      return;
    }

    const manager = getRealtimeManager();
    unsubscribeRef.current?.();
    unsubscribeRef.current = manager.subscribe(subscriptionIDRef.current, {
      channels: channelsForEffect,
      onEvent: handleEvent,
      onReconnect: handleReconnect,
    });

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [channelKey, enabled]);

  return { connected, status };
}
