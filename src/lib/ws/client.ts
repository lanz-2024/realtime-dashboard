'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type ServerMessage, parseServerMessage } from './protocol';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseWebSocketOptions {
  url: string;
  onMessage?: (msg: ServerMessage) => void;
  reconnect?: boolean;
  maxReconnectDelay?: number;
  pingIntervalMs?: number;
}

export interface UseWebSocketReturn {
  state: ConnectionState;
  send: (msg: object) => void;
  reconnectAttempt: number;
  lastPingMs: number | null;
}

export function useWebSocket({
  url,
  onMessage,
  reconnect = true,
  maxReconnectDelay = 30_000,
  pingIntervalMs = 30_000,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastPingMs, setLastPingMs] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const pingStartRef = useRef<number | null>(null);
  const onMessageRef = useRef(onMessage);
  const isMountedRef = useRef(true);

  // Keep callback ref up to date without triggering reconnect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setState('connecting');

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      setState('error');
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) {
        ws.close();
        return;
      }
      setState('connected');
      reconnectAttemptsRef.current = 0;
      setReconnectAttempt(0);

      // Start ping interval
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          pingStartRef.current = Date.now();
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, pingIntervalMs);
    };

    ws.onmessage = (event: MessageEvent) => {
      const raw = typeof event.data === 'string' ? event.data : String(event.data);
      const msg = parseServerMessage(raw);
      if (!msg) return;

      // Handle pong internally to track latency
      if (msg.type === 'pong' && pingStartRef.current !== null) {
        setLastPingMs(Date.now() - pingStartRef.current);
        pingStartRef.current = null;
      }

      onMessageRef.current?.(msg);
    };

    ws.onclose = (event: CloseEvent) => {
      clearInterval(pingTimerRef.current);
      if (!isMountedRef.current) return;

      setState('disconnected');

      if (reconnect && event.code !== 1000) {
        // Exponential backoff: 1s, 2s, 4s, 8s ... up to maxReconnectDelay
        const attempts = reconnectAttemptsRef.current;
        const delay = Math.min(1_000 * Math.pow(2, attempts), maxReconnectDelay);
        reconnectAttemptsRef.current = attempts + 1;
        setReconnectAttempt(attempts + 1);

        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      if (!isMountedRef.current) return;
      setState('error');
    };
  }, [url, reconnect, maxReconnectDelay, pingIntervalMs]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      clearInterval(pingTimerRef.current);
      wsRef.current?.close(1000, 'Component unmounted');
    };
  }, [connect]);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { state, send, reconnectAttempt, lastPingMs };
}
