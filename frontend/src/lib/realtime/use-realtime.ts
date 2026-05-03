"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { buildRealtimeURL } from "@/lib/realtime/ws-client";
import type { RealtimeEvent } from "@/lib/realtime/event-types";

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
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<RealtimeStatus>(
    enabled && channels.length > 0 ? "connecting" : "idle",
  );
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const didDisconnectRef = useRef(false);
  const handleEvent = useEffectEvent((event: RealtimeEvent) => {
    onEvent?.(event);
  });
  const handleReconnect = useEffectEvent(() => {
    onReconnect?.();
  });

  useEffect(() => {
    if (!enabled || channels.length === 0) {
      didDisconnectRef.current = false;
      return;
    }

    let disposed = false;
    let reconnectAttempt = 0;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const subscribeCurrentChannels = (socket: WebSocket) => {
      const nextChannels = channels.filter(Boolean);
      if (nextChannels.length === 0) return;
      socket.send(
        JSON.stringify({
          action: "subscribe",
          channels: nextChannels,
        }),
      );
    };

    const connect = () => {
      clearReconnectTimer();
      setStatus(didDisconnectRef.current ? "reconnecting" : "connecting");
      const socket = new WebSocket(buildRealtimeURL());
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;
        const wasReconnect = didDisconnectRef.current;
        reconnectAttempt = 0;
        setConnected(true);
        setStatus("connected");
        didDisconnectRef.current = false;
        subscribeCurrentChannels(socket);
        if (wasReconnect) {
          handleReconnect();
        }
      };

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as RealtimeEvent;
          handleEvent(event);
        } catch {
          // Ignore malformed realtime frames from older deployments.
        }
      };

      socket.onclose = () => {
        setConnected(false);
        if (disposed) return;
        didDisconnectRef.current = true;
        setStatus("reconnecting");
        reconnectAttempt += 1;
        const delay = Math.min(1000 * reconnectAttempt, 10000);
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      setConnected(false);
      setStatus("idle");
      didDisconnectRef.current = false;
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [channels, enabled]);

  return { connected, status };
}
