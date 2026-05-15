import { buildRealtimeURL, isRealtimeEnabledForAPI } from "@/lib/realtime/ws-client";
import type { RealtimeEvent } from "@/lib/realtime/event-types";

export type RealtimeStatus = "idle" | "connecting" | "connected" | "reconnecting";

type Subscription = {
  channels: string[];
  onEvent?: (event: RealtimeEvent) => void;
  onReconnect?: () => void;
};

type StatusListener = (snapshot: { connected: boolean; status: RealtimeStatus }) => void;

const IDLE_CLOSE_DELAY_MS = 30_000;

class RealtimeManager {
  private socket: WebSocket | null = null;
  private status: RealtimeStatus = "idle";
  private connected = false;
  private reconnectAttempt = 0;
  private hadConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private idleCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions = new Map<string, Subscription>();
  private statusListeners = new Set<StatusListener>();
  private activeChannels = new Set<string>();
  private isConnecting = false;

  subscribe(id: string, subscription: Subscription) {
    this.subscriptions.set(id, {
      channels: normalizeChannels(subscription.channels),
      onEvent: subscription.onEvent,
      onReconnect: subscription.onReconnect,
    });
    this.cancelIdleClose();
    void this.ensureConnected();
    this.syncChannels();
    this.emitStatus();

    return () => {
      this.subscriptions.delete(id);
      this.syncChannels();
      this.scheduleIdleCloseIfUnused();
      this.emitStatus();
    };
  }

  listenStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private snapshot() {
    return { connected: this.connected, status: this.status };
  }

  private emitStatus() {
    const snapshot = this.snapshot();
    for (const listener of this.statusListeners) {
      listener(snapshot);
    }
  }

  private setStatus(status: RealtimeStatus, connected = this.connected) {
    this.status = status;
    this.connected = connected;
    this.emitStatus();
  }

  private async ensureConnected() {
    if (!isRealtimeEnabledForAPI() || this.subscriptions.size === 0) return;
    if (this.isConnecting) return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    this.clearReconnectTimer();
    this.setStatus(this.hadConnected ? "reconnecting" : "connecting", false);

    try {
      const socket = new WebSocket(await buildRealtimeURL());
      this.socket = socket;

      socket.onopen = () => {
        if (this.socket !== socket) return;
        const wasReconnect = this.hadConnected;
        this.isConnecting = false;
        this.reconnectAttempt = 0;
        this.hadConnected = true;
        this.setStatus("connected", true);
        this.syncChannels(true);
        if (wasReconnect) {
          for (const subscription of this.subscriptions.values()) {
            subscription.onReconnect?.();
          }
        }
      };

      socket.onmessage = (message) => {
        try {
          const raw = typeof message.data === "string" ? message.data : String(message.data || "");
          const event = JSON.parse(raw) as RealtimeEvent;
          for (const subscription of this.subscriptions.values()) {
            if (subscription.channels.includes(event.channel || "")) {
              subscription.onEvent?.(event);
              continue;
            }
            if (!event.channel && !isSystemRealtimeEvent(event.type)) {
              subscription.onEvent?.(event);
            }
          }
        } catch {
          // ignore malformed/system frames
        }
      };

      socket.onclose = () => {
        if (this.socket !== socket) return;
        this.isConnecting = false;
        this.socket = null;
        this.activeChannels.clear();
        this.setStatus(this.subscriptions.size > 0 ? "reconnecting" : "idle", false);
        if (this.subscriptions.size === 0 || !isRealtimeEnabledForAPI()) return;
        this.reconnectAttempt += 1;
        const delay = Math.min(1000 * this.reconnectAttempt, 10_000);
        this.reconnectTimer = setTimeout(() => {
          void this.ensureConnected();
        }, delay);
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch {
      this.isConnecting = false;
      this.setStatus("idle", false);
    }
  }

  private syncChannels(forceResubscribe = false) {
    const desired = new Set<string>();
    for (const subscription of this.subscriptions.values()) {
      for (const channel of subscription.channels) {
        desired.add(channel);
      }
    }

    const socket = this.socket;
    const isOpen = socket?.readyState === WebSocket.OPEN;
    if (!isOpen) {
      this.activeChannels = desired;
      return;
    }

    const subscribeChannels = forceResubscribe ? [...desired] : [...desired].filter((channel) => !this.activeChannels.has(channel));
    const unsubscribeChannels = forceResubscribe ? [] : [...this.activeChannels].filter((channel) => !desired.has(channel));

    if (subscribeChannels.length > 0) {
      socket.send(JSON.stringify({ action: "subscribe", channels: subscribeChannels }));
    }
    if (unsubscribeChannels.length > 0) {
      socket.send(JSON.stringify({ action: "unsubscribe", channels: unsubscribeChannels }));
    }

    this.activeChannels = desired;
  }

  private scheduleIdleCloseIfUnused() {
    if (this.subscriptions.size > 0) return;
    this.clearReconnectTimer();
    this.cancelIdleClose();
    this.idleCloseTimer = setTimeout(() => {
      this.idleCloseTimer = null;
      if (this.subscriptions.size > 0) return;
      const socket = this.socket;
      this.socket = null;
      this.activeChannels.clear();
      if (socket) socket.close();
      this.setStatus("idle", false);
    }, IDLE_CLOSE_DELAY_MS);
  }

  private cancelIdleClose() {
    if (this.idleCloseTimer !== null) {
      clearTimeout(this.idleCloseTimer);
      this.idleCloseTimer = null;
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

function normalizeChannels(channels: string[]) {
  return Array.from(new Set(channels.map((channel) => channel.trim()).filter(Boolean))).sort();
}

function isSystemRealtimeEvent(type: string | undefined) {
  return type === "welcome" || type === "subscribed" || type === "unsubscribed" || type === "subscription_error" || type === "pong" || type === "error";
}

let manager: RealtimeManager | null = null;

export function getRealtimeManager() {
  if (!manager) {
    manager = new RealtimeManager();
  }
  return manager;
}
