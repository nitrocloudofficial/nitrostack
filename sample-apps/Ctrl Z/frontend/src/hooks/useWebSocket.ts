"use client";

import { useEffect, useRef, useState } from "react";

import { WS_URL } from "@/services/api";

interface UseWebSocketOptions<T> {
  onMessage?: (data: T) => void;
  event?: string;
  reconnectDelayMs?: number;
}

interface Envelope {
  event?: string;
  data?: unknown;
}

export function useWebSocket<T = unknown>(
  options: UseWebSocketOptions<T> = {}
) {
  const { onMessage, event, reconnectDelayMs = 3000 } = options;
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  const eventRef = useRef(event);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    eventRef.current = event;
  }, [event]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      socket = new WebSocket(WS_URL);

      socket.onopen = () => setConnected(true);

      socket.onmessage = (raw) => {
        try {
          const message = JSON.parse(raw.data) as Envelope;

          if (eventRef.current && message.event !== eventRef.current) {
            return;
          }

          const payload = (message.data ?? message) as T;
          onMessageRef.current?.(payload);
        } catch (err) {
          console.error("WebSocket parse error:", err);
        }
      };

      socket.onclose = () => {
        setConnected(false);
        if (!closed) {
          reconnectTimer = setTimeout(connect, reconnectDelayMs);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [reconnectDelayMs]);

  return { connected };
}
