import { useEffect, useMemo, useRef, useState } from "react";
import { getRealtimeManager, RealtimeStatus } from "@/lib/realtime/manager";
import type { RealtimeEvent } from "@/lib/realtime/event-types";

type UseRealtimeOptions = {
  enabled?: boolean;
  channels: string[];
  onEvent?: (event: RealtimeEvent) => void;
  onReconnect?: () => void;
};

export function useRealtime({ enabled = true, channels, onEvent, onReconnect }: UseRealtimeOptions) {
  const subscriptionIDRef = useRef(`rt-${Math.random().toString(36).slice(2)}`);
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);
  onEventRef.current = onEvent;
  onReconnectRef.current = onReconnect;

  const normalizedChannels = useMemo(
    () => Array.from(new Set(channels.map((channel) => channel.trim()).filter(Boolean))).sort(),
    [channels],
  );
  const channelKey = normalizedChannels.join("|");
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<RealtimeStatus>(
    enabled && normalizedChannels.length > 0 ? "connecting" : "idle",
  );

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
    return manager.subscribe(subscriptionIDRef.current, {
      channels: channelsForEffect,
      onEvent: (event) => onEventRef.current?.(event),
      onReconnect: () => onReconnectRef.current?.(),
    });
  }, [channelKey, enabled]);

  const hasActiveChannels = enabled && normalizedChannels.length > 0;
  return {
    connected: hasActiveChannels ? connected : false,
    status: hasActiveChannels ? status : "idle",
  };
}
