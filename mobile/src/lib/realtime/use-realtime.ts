import { useEffect, useMemo, useRef, useState } from "react";
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

function createSubscriptionId() {
  return `rt-${Math.random().toString(36).slice(2, 10)}`;
}

export function useRealtime({
  enabled = true,
  channels,
  onEvent,
  onReconnect,
}: UseRealtimeOptions) {
  const subscriptionIdRef = useRef<string>(createSubscriptionId());
  const normalizedChannels = useMemo(
    () =>
      Array.from(new Set(channels.map((channel) => channel.trim()).filter(Boolean))).sort(),
    [channels],
  );
  const channelKey = normalizedChannels.join("|");
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<RealtimeStatus>(
    enabled && normalizedChannels.length > 0 ? "connecting" : "idle",
  );
  const onEventRef = useRef<typeof onEvent>(onEvent);
  const onReconnectRef = useRef<typeof onReconnect>(onReconnect);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

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
      return;
    }

    const manager = getRealtimeManager();
    const unsubscribe = manager.subscribe(subscriptionIdRef.current, {
      channels: channelsForEffect,
      onEvent: (event) => onEventRef.current?.(event),
      onReconnect: () => onReconnectRef.current?.(),
    });

    return unsubscribe;
  }, [channelKey, enabled]);

  const hasActiveChannels = enabled && normalizedChannels.length > 0;

  return {
    connected: hasActiveChannels ? connected : false,
    status: hasActiveChannels ? status : "idle",
  };
}
