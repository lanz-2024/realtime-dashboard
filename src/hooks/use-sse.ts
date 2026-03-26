'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SSEConnectionState = 'connecting' | 'open' | 'closed' | 'error';

export interface SSEEventMap {
  [eventName: string]: unknown;
}

export interface UseSSEOptions<TMap extends SSEEventMap> {
  url: string;
  /** Typed event listeners keyed by SSE event name */
  onEvent?: {
    [K in keyof TMap]?: (data: TMap[K]) => void;
  };
  /** Called on any parse error */
  onError?: (err: Event) => void;
  /** Whether to auto-reconnect. Default: true */
  reconnect?: boolean;
  /** Max reconnect delay in ms. Default: 30_000 */
  maxReconnectDelayMs?: number;
  /** Whether the hook should be active. Set false to pause. Default: true */
  enabled?: boolean;
}

export interface UseSSEReturn {
  state: SSEConnectionState;
  reconnectAttempt: number;
}

/**
 * EventSource (SSE) hook with typed event dispatch, auto-reconnect with
 * exponential backoff, and cleanup on unmount.
 */
export function useSSE<TMap extends SSEEventMap>({
  url,
  onEvent,
  onError,
  reconnect = true,
  maxReconnectDelayMs = 30_000,
  enabled = true,
}: UseSSEOptions<TMap>): UseSSEReturn {
  const [state, setState] = useState<SSEConnectionState>('closed');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  // Keep callback refs stable
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onEventRef.current = onEvent;
  });
  useEffect(() => {
    onErrorRef.current = onError;
  });

  const connect = useCallback(() => {
    if (!isMountedRef.current || !enabled) return;
    if (esRef.current && esRef.current.readyState !== EventSource.CLOSED) return;

    setState('connecting');

    let es: EventSource;
    try {
      es = new EventSource(url);
    } catch {
      setState('error');
      return;
    }

    esRef.current = es;

    es.onopen = () => {
      if (!isMountedRef.current) {
        es.close();
        return;
      }
      setState('open');
      attemptsRef.current = 0;
      setReconnectAttempt(0);
    };

    es.onerror = (event) => {
      if (!isMountedRef.current) return;
      onErrorRef.current?.(event);

      if (es.readyState === EventSource.CLOSED) {
        setState('closed');
        if (reconnect) {
          const attempts = attemptsRef.current;
          const delay = Math.min(1_000 * Math.pow(2, attempts), maxReconnectDelayMs);
          attemptsRef.current = attempts + 1;
          setReconnectAttempt(attempts + 1);
          reconnectTimerRef.current = setTimeout(connect, delay);
        }
      } else {
        setState('error');
      }
    };

    // Register typed event listeners from onEvent map
    const currentOnEvent = onEventRef.current;
    if (currentOnEvent) {
      for (const eventName of Object.keys(currentOnEvent)) {
        es.addEventListener(eventName, (ev: MessageEvent) => {
          const handler = onEventRef.current?.[eventName as keyof TMap];
          if (!handler) return;
          try {
            const parsed = JSON.parse(ev.data) as TMap[typeof eventName];
            (handler as (d: unknown) => void)(parsed);
          } catch {
            // Malformed event — ignore
          }
        });
      }
    }
  }, [url, enabled, reconnect, maxReconnectDelayMs]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      if (reconnectTimerRef.current !== null) clearTimeout(reconnectTimerRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect, enabled]);

  return { state, reconnectAttempt };
}
